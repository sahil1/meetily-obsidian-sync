// Turns Meetily meetings into summary + transcript notes and writes them into
// the vault via the Vault API. Note locations are built from a base folder, a
// subfolder pattern, and a filename pattern, so summary and transcript can live
// in different places. Idempotent: existing notes are skipped unless overwrite
// is enabled.

import { App, TFile, normalizePath } from "obsidian";
import { ExportResult, Meeting, MeetilySyncSettings, TranscriptRow } from "./types";
import {
	buildTranscriptBody,
	frontmatter,
	isoZ,
	meetingUuid,
	parseDate,
	renderPattern,
	safeFilename,
} from "./format";

export class NoteExporter {
	constructor(private app: App, private settings: MeetilySyncSettings) {}

	/** Assemble a vault-relative `.md` path from base + subfolder + filename patterns. */
	private buildPath(
		baseFolder: string,
		subfolderPattern: string,
		filenamePattern: string,
		title: string,
		date: Date,
		fallbackSuffix: string
	): string {
		const base = baseFolder.replace(/^\/+|\/+$/g, "");
		const sub = subfolderPattern
			? renderPattern(subfolderPattern, title, date)
					.split("/")
					.map((seg) => safeFilename(seg))
					.filter(Boolean)
					.join("/")
			: "";
		const renderedName = renderPattern(filenamePattern, title, date).trim();
		const filename = safeFilename(renderedName || `${safeFilename(title)}${fallbackSuffix}`);
		const dir = [base, sub].filter(Boolean).join("/");
		return normalizePath(`${dir}/${filename}.md`);
	}

	private dirOf(path: string): string {
		const i = path.lastIndexOf("/");
		return i > 0 ? path.slice(0, i) : "";
	}

	private async ensureFolder(dir: string): Promise<void> {
		if (!dir) return;
		const parts = dir.split("/").filter(Boolean);
		let cur = "";
		for (const part of parts) {
			cur = cur ? `${cur}/${part}` : part;
			if (!this.app.vault.getAbstractFileByPath(cur)) {
				await this.app.vault.createFolder(cur);
			}
		}
	}

	private fileExists(path: string): boolean {
		return this.app.vault.getAbstractFileByPath(path) instanceof TFile;
	}

	private async writeNote(path: string, content: string): Promise<void> {
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			await this.app.vault.create(path, content);
		}
	}

	async exportMeeting(
		meeting: Meeting,
		transcriptRows: TranscriptRow[],
		summaryMarkdown: string
	): Promise<ExportResult> {
		const created = parseDate(meeting.createdAt);
		if (!created) return { title: meeting.title, status: "skipped" };
		const updated = parseDate(meeting.updatedAt) ?? created;
		const s = this.settings;

		const summaryPath = this.buildPath(
			s.notesBaseFolder,
			s.notesSubfolderPattern,
			s.notesFilenamePattern,
			meeting.title,
			created,
			"-summary"
		);
		const transcriptPath = this.buildPath(
			s.transcriptBaseFolder,
			s.transcriptSubfolderPattern,
			s.transcriptFilenamePattern,
			meeting.title,
			created,
			"-transcript"
		);

		const summaryDone = !s.exportSummary || this.fileExists(summaryPath);
		const transcriptDone = !s.exportTranscript || this.fileExists(transcriptPath);
		if (!s.overwriteExisting && summaryDone && transcriptDone) {
			return { title: meeting.title, status: "skipped" };
		}

		const gid = meetingUuid(meeting.id);
		const summaryLink = `"[[${summaryPath}]]"`;
		const transcriptLink = `"[[${transcriptPath}]]"`;

		if (s.exportSummary) {
			await this.ensureFolder(this.dirOf(summaryPath));
			let doc = "";
			if (s.includeFrontmatter) {
				const pairs: Array<[string, string]> = [
					["meetily_id", gid],
					["title", JSON.stringify(meeting.title)],
					["type", "note"],
					["created", isoZ(created)],
					["updated", isoZ(updated)],
					["attendees", "[]"],
					["source", "meetily"],
				];
				if (s.exportTranscript) pairs.push(["transcript", transcriptLink]);
				doc += frontmatter(pairs);
			}
			doc += (summaryMarkdown || "_No summary was generated for this meeting._") + "\n";
			await this.writeNote(summaryPath, doc);
		}

		if (s.exportTranscript) {
			await this.ensureFolder(this.dirOf(transcriptPath));
			let doc = "";
			if (s.includeFrontmatter) {
				const pairs: Array<[string, string]> = [
					["meetily_id", gid],
					["title", JSON.stringify(`${meeting.title} - Transcript`)],
					["type", "transcript"],
					["created", isoZ(created)],
					["updated", isoZ(updated)],
					["attendees", "[]"],
					["source", "meetily"],
				];
				if (s.exportSummary) pairs.push(["note", summaryLink]);
				doc += frontmatter(pairs);
			}
			doc += buildTranscriptBody(meeting.title, transcriptRows, s.defaultSpeakerLabel);
			await this.writeNote(transcriptPath, doc);
		}

		return {
			title: meeting.title,
			status: "written",
			summaryPath: s.exportSummary ? summaryPath : undefined,
			transcriptPath: s.exportTranscript ? transcriptPath : undefined,
			utterances: transcriptRows.length,
		};
	}
}
