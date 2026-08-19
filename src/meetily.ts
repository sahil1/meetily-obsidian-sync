// Reads a Meetily SQLite database using sql.js (SQLite compiled to WebAssembly).
// sql.js needs no native modules, which keeps the plugin portable and easy to
// review for the community store. The DB is loaded as an in-memory snapshot, so
// the on-disk file that Meetily owns is never modified.

import initSqlJs, { Database, SqlValue } from "sql.js";
import wasmBinary from "sql.js/dist/sql-wasm.wasm";
import { Meeting, TranscriptRow } from "./types";
import { extractSummaryMarkdown } from "./format";

export class MeetilyDatabase {
	private db: Database;

	private constructor(db: Database) {
		this.db = db;
	}

	/**
	 * @param dbBytes a snapshot of meeting_minutes.sqlite
	 *
	 * The WebAssembly build of SQLite is embedded in the bundle (see the `.wasm`
	 * import above), so there is no side-car file to locate at runtime.
	 */
	static async open(dbBytes: Uint8Array): Promise<MeetilyDatabase> {
		const SQL = await initSqlJs({ wasmBinary });
		return new MeetilyDatabase(new SQL.Database(dbBytes));
	}

	private all(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
		const stmt = this.db.prepare(sql);
		try {
			stmt.bind(params);
			const rows: Record<string, SqlValue>[] = [];
			while (stmt.step()) rows.push(stmt.getAsObject());
			return rows;
		} finally {
			stmt.free();
		}
	}

	getMeetings(meetingId?: string): Meeting[] {
		const sql = meetingId
			? "SELECT id, title, created_at, updated_at FROM meetings WHERE id = ?"
			: "SELECT id, title, created_at, updated_at FROM meetings ORDER BY created_at";
		return this.all(sql, meetingId ? [meetingId] : []).map((r) => ({
			id: String(r.id),
			title: String(r.title ?? "Untitled"),
			createdAt: String(r.created_at ?? ""),
			updatedAt: String(r.updated_at ?? ""),
		}));
	}

	getTranscriptRows(meetingId: string): TranscriptRow[] {
		const rows = this.all(
			"SELECT speaker, timestamp, transcript FROM transcripts " +
				"WHERE meeting_id = ? ORDER BY COALESCE(audio_start_time, 0), timestamp",
			[meetingId]
		);
		return rows.map((r) => ({
			speaker: r.speaker ? String(r.speaker) : "",
			timestamp: r.timestamp ? String(r.timestamp) : "",
			text: r.transcript ? String(r.transcript) : "",
		}));
	}

	getSummaryMarkdown(meetingId: string): string {
		const rows = this.all(
			"SELECT result FROM summary_processes WHERE meeting_id = ? AND status = 'completed'",
			[meetingId]
		);
		if (!rows.length) return "";
		const result = rows[0].result;
		return extractSummaryMarkdown(typeof result === "string" ? result : null);
	}

	close(): void {
		this.db.close();
	}
}
