// Pure formatting helpers. No Obsidian or Node dependencies, so they are easy
// to reason about and unit-test in isolation.

import { TranscriptRow } from "./types";

/** Pull the markdown summary out of a Meetily `summary_processes.result` blob. */
export function extractSummaryMarkdown(resultText: string | null | undefined): string {
	if (!resultText) return "";
	try {
		const data: unknown = JSON.parse(resultText);
		if (data && typeof data === "object") {
			const ec = (data as Record<string, unknown>).english_cache;
			if (ec && typeof ec === "object" && (ec as Record<string, unknown>).markdown) {
				return String((ec as Record<string, unknown>).markdown).trim();
			}
			if ((data as Record<string, unknown>).markdown) {
				return String((data as Record<string, unknown>).markdown).trim();
			}
		}
		return String(data).trim();
	} catch {
		return resultText.trim();
	}
}

/**
 * Parse a Meetily timestamp into a Date (UTC).
 * Handles both "2026-08-17T22:29:59.767800+00:00" and "2026-08-18 03:33:41.927512"
 * (the space form has no zone, so we treat it as UTC).
 */
export function parseDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	let v = value.trim().replace(" ", "T");
	// JS Date only keeps millisecond precision; trim any extra fractional digits.
	v = v.replace(/(\.\d{3})\d+/, "$1");
	const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(v);
	const d = new Date(hasZone ? v : v + "Z");
	return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as UTC with milliseconds: 2026-08-17T22:29:59.767Z */
export function isoZ(date: Date): string {
	const p = (n: number, w = 2) => String(n).padStart(w, "0");
	return (
		`${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}` +
		`T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}` +
		`.${p(date.getUTCMilliseconds(), 3)}Z`
	);
}

/**
 * The variables available to folder and filename patterns, computed from the
 * meeting's LOCAL date. `{title}` is already filesystem-safe.
 */
export function patternVars(title: string, date: Date): Record<string, string> {
	const p = (n: number) => String(n).padStart(2, "0");
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return {
		title: safeFilename(title),
		date: `${year}-${p(month)}-${p(date.getDate())}`,
		time: `${p(date.getHours())}-${p(date.getMinutes())}`,
		year: String(year),
		month: p(month),
		day: p(date.getDate()),
		quarter: `Q${Math.floor((month - 1) / 3) + 1}`,
	};
}

/**
 * Replace `{var}` tokens in a pattern. Unknown tokens are left untouched so a
 * typo is visible rather than silently dropped.
 */
export function renderPattern(pattern: string, title: string, date: Date): string {
	const vars = patternVars(title, date);
	return pattern.replace(/\{(\w+)\}/g, (whole, key: string) =>
		Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole
	);
}

/** Replace filesystem-unsafe characters with "_" (e.g. "A<>B" -> "A__B"). */
export function safeFilename(title: string): string {
	const name = (title || "").replace(/[\\/:*?"<>|]/g, "_").trim();
	return name || "Untitled";
}

/** meeting-<uuid> -> <uuid> */
export function meetingUuid(meetingId: string): string {
	return (meetingId || "").replace(/^meeting-/, "");
}

/** Build the transcript body as speaker blocks. */
export function buildTranscriptBody(
	title: string,
	rows: TranscriptRow[],
	fallbackSpeaker: string
): string {
	const lines: string[] = [`# Transcript for: ${title}`, ""];
	for (const row of rows) {
		const text = (row.text || "").trim();
		if (!text) continue;
		const speaker = (row.speaker || "").trim() || fallbackSpeaker;
		lines.push(row.timestamp ? `### ${speaker} (${row.timestamp})` : `### ${speaker}`);
		lines.push("", text, "");
	}
	return lines.join("\n").replace(/\s+$/, "") + "\n";
}

/** Render a YAML frontmatter block from ordered key/value pairs. */
export function frontmatter(pairs: Array<[string, string]>): string {
	const body = pairs.map(([k, v]) => `${k}: ${v}`).join("\n");
	return `---\n${body}\n---\n\n`;
}
