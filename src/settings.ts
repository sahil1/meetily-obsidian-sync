// Settings tab and the platform-specific default database path.

import { App, PluginSettingTab, Setting, normalizePath } from "obsidian";
import * as os from "os";
import * as path from "path";
import type MeetilySyncPlugin from "./main";

/** Where Meetily stores its SQLite DB on each platform. */
export function defaultDbPath(): string {
	const home = os.homedir();
	switch (process.platform) {
		case "darwin":
			return path.join(home, "Library", "Application Support", "com.meetily.ai", "meeting_minutes.sqlite");
		case "win32":
			return path.join(
				process.env.APPDATA || path.join(home, "AppData", "Roaming"),
				"com.meetily.ai",
				"meeting_minutes.sqlite"
			);
		default:
			return path.join(home, ".config", "com.meetily.ai", "meeting_minutes.sqlite");
	}
}

const SUBFOLDER_DESC = "Organize into subfolders. Variables: {year} {month} {day} {quarter}. Leave blank for none.";
const FILENAME_DESC = "Variables: {title} {date} {time} {year} {month} {day}.";

export class MeetilySettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: MeetilySyncPlugin) {
		super(app, plugin);
	}

	// The declarative getSettingDefinitions() API only exists on Obsidian 1.13.0+.
	// We target 1.5.0+, so the classic display() approach is intentional.
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ---- Notes (summary) ----
		new Setting(containerEl).setName("Notes").setHeading();

		new Setting(containerEl)
			.setName("Base folder")
			.setDesc("The vault folder where meeting summary notes are saved.")
			.addText((t) =>
				t
					.setPlaceholder("notes/meetily")
					.setValue(this.plugin.settings.notesBaseFolder)
					.onChange(async (v) => {
						this.plugin.settings.notesBaseFolder = normalizePath(v.trim() || "notes/meetily");
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Subfolder pattern")
			.setDesc(SUBFOLDER_DESC)
			.addText((t) =>
				t
					.setPlaceholder("{year}/{month}/{day}")
					.setValue(this.plugin.settings.notesSubfolderPattern)
					.onChange(async (v) => {
						this.plugin.settings.notesSubfolderPattern = v.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Filename pattern")
			.setDesc(FILENAME_DESC)
			.addText((t) =>
				t
					.setPlaceholder("{title}-summary")
					.setValue(this.plugin.settings.notesFilenamePattern)
					.onChange(async (v) => {
						this.plugin.settings.notesFilenamePattern = v.trim() || "{title}-summary";
						await this.plugin.saveSettings();
					})
			);

		// ---- Transcripts ----
		new Setting(containerEl).setName("Transcripts").setHeading();

		new Setting(containerEl)
			.setName("Base folder")
			.setDesc("The vault folder where transcripts are saved (can match the notes folder).")
			.addText((t) =>
				t
					.setPlaceholder("notes/meetily")
					.setValue(this.plugin.settings.transcriptBaseFolder)
					.onChange(async (v) => {
						this.plugin.settings.transcriptBaseFolder = normalizePath(v.trim() || "notes/meetily");
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Subfolder pattern")
			.setDesc(SUBFOLDER_DESC)
			.addText((t) =>
				t
					.setPlaceholder("{year}/{month}/{day}")
					.setValue(this.plugin.settings.transcriptSubfolderPattern)
					.onChange(async (v) => {
						this.plugin.settings.transcriptSubfolderPattern = v.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Filename pattern")
			.setDesc(FILENAME_DESC)
			.addText((t) =>
				t
					.setPlaceholder("{title}-transcript")
					.setValue(this.plugin.settings.transcriptFilenamePattern)
					.onChange(async (v) => {
						this.plugin.settings.transcriptFilenamePattern = v.trim() || "{title}-transcript";
						await this.plugin.saveSettings();
					})
			);

		// ---- Content ----
		new Setting(containerEl).setName("Content").setHeading();

		new Setting(containerEl)
			.setName("Export summary")
			.setDesc("Write the AI-generated summary note.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.exportSummary).onChange(async (v) => {
					this.plugin.settings.exportSummary = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Export transcript")
			.setDesc("Write the raw transcript note.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.exportTranscript).onChange(async (v) => {
					this.plugin.settings.exportTranscript = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Include frontmatter")
			.setDesc("Prepend YAML frontmatter (ids, timestamps, cross-links) to each note.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.includeFrontmatter).onChange(async (v) => {
					this.plugin.settings.includeFrontmatter = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Default speaker label")
			.setDesc("Used for transcript lines with no speaker. Enable diarization in Meetily for real names.")
			.addText((t) =>
				t
					.setPlaceholder("Speaker")
					.setValue(this.plugin.settings.defaultSpeakerLabel)
					.onChange(async (v) => {
						this.plugin.settings.defaultSpeakerLabel = v.trim() || "Speaker";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Overwrite existing notes")
			.setDesc("Re-write notes even if they already exist. Off = only new meetings are added.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.overwriteExisting).onChange(async (v) => {
					this.plugin.settings.overwriteExisting = v;
					await this.plugin.saveSettings();
				})
			);

		// ---- Automation ----
		new Setting(containerEl).setName("Automation").setHeading();

		new Setting(containerEl)
			.setName("Sync on startup")
			.setDesc("Run a sync shortly after Obsidian loads.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.syncOnStartup).onChange(async (v) => {
					this.plugin.settings.syncOnStartup = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Auto-sync on a timer")
			.setDesc("Periodically sync while Obsidian is open.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoSyncEnabled).onChange(async (v) => {
					this.plugin.settings.autoSyncEnabled = v;
					await this.plugin.saveSettings();
					this.plugin.setupAutoSync();
				})
			);

		new Setting(containerEl)
			.setName("Auto-sync interval (minutes)")
			.setDesc("How often the timer runs.")
			.addText((t) =>
				t.setValue(String(this.plugin.settings.autoSyncIntervalMinutes)).onChange(async (v) => {
					const n = Number(v);
					if (Number.isFinite(n) && n > 0) {
						this.plugin.settings.autoSyncIntervalMinutes = Math.round(n);
						await this.plugin.saveSettings();
						this.plugin.setupAutoSync();
					}
				})
			);

		new Setting(containerEl)
			.setName("Sync now")
			.setDesc(
				this.plugin.settings.lastSyncedAt
					? `Last synced: ${new Date(this.plugin.settings.lastSyncedAt).toLocaleString()}`
					: "Not synced yet."
			)
			.addButton((b) =>
				b
					.setButtonText("Sync now")
					.setCta()
					.onClick(async () => {
						await this.plugin.syncNow();
						this.display();
					})
			);

		// ---- Advanced ----
		new Setting(containerEl).setName("Advanced").setHeading();

		new Setting(containerEl)
			.setName("Meetily database location")
			.setDesc(
				"Auto-detected from your operating system. Only change this if you installed " +
					"Meetily in a custom location. Leave blank to use the default."
			)
			.addText((t) =>
				t
					.setPlaceholder(defaultDbPath())
					.setValue(this.plugin.settings.dbPath)
					.onChange(async (v) => {
						this.plugin.settings.dbPath = v.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}
