import {
	buildTranscriptBody,
	extractSummaryMarkdown,
	isoZ,
	meetingUuid,
	parseDate,
	patternVars,
	renderPattern,
	safeFilename,
} from "../src/format";

describe("parseDate", () => {
	it("parses ISO with explicit +00:00 offset", () => {
		const d = parseDate("2026-08-17T22:29:59.767800+00:00");
		expect(d?.toISOString()).toBe("2026-08-17T22:29:59.767Z");
	});

	it("treats the space form as UTC", () => {
		const d = parseDate("2026-08-18 03:33:41.927512");
		expect(d?.toISOString()).toBe("2026-08-18T03:33:41.927Z");
	});

	it("returns null on junk", () => {
		expect(parseDate("not a date")).toBeNull();
		expect(parseDate("")).toBeNull();
		expect(parseDate(null)).toBeNull();
	});
});

describe("isoZ", () => {
	it("formats as UTC with milliseconds", () => {
		expect(isoZ(new Date("2026-08-17T22:29:59.767Z"))).toBe("2026-08-17T22:29:59.767Z");
	});
});

describe("patternVars", () => {
	it("computes zero-padded local date parts and quarter", () => {
		const d = new Date(2026, 7, 5, 14, 3); // Aug 5 2026, 14:03 local
		const v = patternVars("My Meeting", d);
		expect(v).toMatchObject({
			title: "My Meeting",
			date: "2026-08-05",
			time: "14-03",
			year: "2026",
			month: "08",
			day: "05",
			quarter: "Q3",
		});
	});
});

describe("renderPattern", () => {
	const d = new Date(2026, 7, 5, 9, 0);

	it("fills known tokens", () => {
		expect(renderPattern("{year}/{month}/{day}", "T", d)).toBe("2026/08/05");
		expect(renderPattern("{title}-summary", "Weekly Sync", d)).toBe("Weekly Sync-summary");
	});

	it("sanitizes the title token", () => {
		expect(renderPattern("{title}-transcript", "A/B:C", d)).toBe("A_B_C-transcript");
	});

	it("leaves unknown tokens untouched so typos are visible", () => {
		expect(renderPattern("{nope}", "T", d)).toBe("{nope}");
	});
});

describe("safeFilename", () => {
	it("replaces filesystem-unsafe characters with underscores", () => {
		expect(safeFilename("Bedrock <> Meeting")).toBe("Bedrock __ Meeting");
		expect(safeFilename("A/B:C")).toBe("A_B_C");
	});

	it("falls back to Untitled when empty", () => {
		expect(safeFilename("   ")).toBe("Untitled");
	});
});

describe("meetingUuid", () => {
	it("strips the meeting- prefix", () => {
		expect(meetingUuid("meeting-d7c8879e-13ad")).toBe("d7c8879e-13ad");
		expect(meetingUuid("d7c8879e")).toBe("d7c8879e");
	});
});

describe("extractSummaryMarkdown", () => {
	it("prefers english_cache.markdown", () => {
		const blob = JSON.stringify({ english_cache: { markdown: "# Hello" }, markdown: "fallback" });
		expect(extractSummaryMarkdown(blob)).toBe("# Hello");
	});

	it("falls back to top-level markdown", () => {
		expect(extractSummaryMarkdown(JSON.stringify({ markdown: "# Top" }))).toBe("# Top");
	});

	it("returns raw text when not JSON", () => {
		expect(extractSummaryMarkdown("plain text")).toBe("plain text");
	});

	it("returns empty string for empty input", () => {
		expect(extractSummaryMarkdown("")).toBe("");
		expect(extractSummaryMarkdown(null)).toBe("");
	});
});

describe("buildTranscriptBody", () => {
	it("renders speaker blocks and skips blank lines", () => {
		const body = buildTranscriptBody(
			"Standup",
			[
				{ speaker: "", timestamp: "09:00:01", text: "Morning." },
				{ speaker: "Alex", timestamp: "09:00:05", text: "Hi." },
				{ speaker: "", timestamp: "09:00:09", text: "   " },
			],
			"Speaker"
		);
		expect(body).toContain("# Transcript for: Standup");
		expect(body).toContain("### Speaker (09:00:01)");
		expect(body).toContain("### Alex (09:00:05)");
		expect(body).not.toContain("09:00:09"); // blank utterance dropped
	});
});
