// Shared types and default settings for the Meetily Sync plugin.

export interface MeetilySyncSettings {
	// --- Notes (summary) ---
	/** Vault-relative base folder for summary notes. */
	notesBaseFolder: string;
	/** Subfolder pattern, e.g. "{year}/{month}/{day}". Blank = no subfolders. */
	notesSubfolderPattern: string;
	/** Filename pattern (without extension), e.g. "{title}-summary". */
	notesFilenamePattern: string;

	// --- Transcripts ---
	/** Vault-relative base folder for transcript notes. */
	transcriptBaseFolder: string;
	/** Subfolder pattern for transcripts. Blank = no subfolders. */
	transcriptSubfolderPattern: string;
	/** Filename pattern for transcripts, e.g. "{title}-transcript". */
	transcriptFilenamePattern: string;

	// --- Content ---
	exportSummary: boolean;
	exportTranscript: boolean;
	includeFrontmatter: boolean;
	/** Label used when a transcript line has no speaker (no diarization). */
	defaultSpeakerLabel: string;
	overwriteExisting: boolean;

	// --- Automation ---
	syncOnStartup: boolean;
	autoSyncEnabled: boolean;
	autoSyncIntervalMinutes: number;

	// --- Advanced ---
	/** Absolute path to Meetily's SQLite DB. Blank = auto-detect for this OS. */
	dbPath: string;

	/** ISO timestamp of the last successful sync (informational). */
	lastSyncedAt: string | null;
}

export const DEFAULT_SETTINGS: MeetilySyncSettings = {
	notesBaseFolder: "notes/meetily",
	notesSubfolderPattern: "{year}/{month}/{day}",
	notesFilenamePattern: "{title}-summary",

	transcriptBaseFolder: "notes/meetily",
	transcriptSubfolderPattern: "{year}/{month}/{day}",
	transcriptFilenamePattern: "{title}-transcript",

	exportSummary: true,
	exportTranscript: true,
	includeFrontmatter: true,
	defaultSpeakerLabel: "Speaker",
	overwriteExisting: false,

	syncOnStartup: false,
	autoSyncEnabled: false,
	autoSyncIntervalMinutes: 60,

	dbPath: "",

	lastSyncedAt: null,
};

/** A row from Meetily's `meetings` table. */
export interface Meeting {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
}

/** A single transcript utterance from Meetily's `transcripts` table. */
export interface TranscriptRow {
	speaker: string;
	timestamp: string;
	text: string;
}

/** Outcome of exporting one meeting. */
export interface ExportResult {
	title: string;
	status: "written" | "skipped";
	summaryPath?: string;
	transcriptPath?: string;
	utterances?: number;
}
