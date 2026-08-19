// Meetily Sync — export local Meetily meetings into your Obsidian vault.

import { Notice, Plugin, normalizePath } from "obsidian";
import * as fs from "fs";
import { DEFAULT_SETTINGS, MeetilySyncSettings } from "./types";
import { MeetilySettingTab, defaultDbPath } from "./settings";
import { MeetilyDatabase } from "./meetily";
import { NoteExporter } from "./exporter";
import { mergeWal } from "./wal";

export default class MeetilySyncPlugin extends Plugin {
	settings: MeetilySyncSettings;
	private intervalId: number | null = null;
	private syncing = false;
	private statusBar: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.statusBar = this.addStatusBarItem();
		this.setStatus("idle");

		this.addSettingTab(new MeetilySettingTab(this.app, this));

		this.addRibbonIcon("refresh-cw", "Sync Meetily meetings", () => {
			void this.syncNow();
		});

		this.addCommand({
			id: "sync-now",
			name: "Sync Meetily meetings now",
			callback: () => {
				void this.syncNow();
			},
		});

		if (this.settings.syncOnStartup) {
			this.app.workspace.onLayoutReady(() => {
				void this.syncNow(true);
			});
		}
		this.setupAutoSync();
	}

	onunload(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Record<string, unknown> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (saved ?? {}) as Partial<MeetilySyncSettings>);

		// Migrate the pre-0.2 shape (single outputFolder + dateSubfolders toggle)
		// into the base-folder + pattern model, then drop the legacy keys.
		if (saved && typeof saved.outputFolder === "string" && saved.notesBaseFolder === undefined) {
			const folder = normalizePath(saved.outputFolder);
			const pattern = saved.dateSubfolders === false ? "" : "{year}/{month}/{day}";
			this.settings.notesBaseFolder = folder;
			this.settings.transcriptBaseFolder = folder;
			this.settings.notesSubfolderPattern = pattern;
			this.settings.transcriptSubfolderPattern = pattern;
			const bag = this.settings as unknown as Record<string, unknown>;
			delete bag.outputFolder;
			delete bag.dateSubfolders;
			await this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Update the status bar indicator (quieter than a Notice for background syncs). */
	private setStatus(text: string): void {
		this.statusBar?.setText(`Meetily: ${text}`);
	}

	/** (Re)configure the auto-sync timer from current settings. */
	setupAutoSync(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
		if (this.settings.autoSyncEnabled && this.settings.autoSyncIntervalMinutes > 0) {
			this.intervalId = window.setInterval(
				() => {
					void this.syncNow(true);
				},
				this.settings.autoSyncIntervalMinutes * 60 * 1000
			);
			this.registerInterval(this.intervalId);
		}
	}

	/**
	 * Read the Meetily DB and export any new meetings.
	 * @param silent when true, only show a notice if something was written or an error occurred.
	 */
	async syncNow(silent = false): Promise<void> {
		if (this.syncing) {
			if (!silent) new Notice("Meetily Sync: a sync is already running.");
			return;
		}
		this.syncing = true;
		this.setStatus("syncing…");
		try {
			const dbPath = this.settings.dbPath || defaultDbPath();
			if (!fs.existsSync(dbPath)) {
				this.setStatus("database not found");
				new Notice(`Meetily Sync: database not found at\n${dbPath}`);
				return;
			}

			// Snapshot the DB bytes; the on-disk file Meetily owns is never touched.
			// Meetily runs in WAL mode, so merge any committed -wal pages first,
			// otherwise a meeting recorded seconds ago (still in the WAL) is invisible.
			let dbBytes = new Uint8Array(await fs.promises.readFile(dbPath));
			const walPath = `${dbPath}-wal`;
			if (fs.existsSync(walPath)) {
				const walBytes = new Uint8Array(await fs.promises.readFile(walPath));
				dbBytes = mergeWal(dbBytes, walBytes);
			}

			const db = await MeetilyDatabase.open(dbBytes);
			try {
				const meetings = db.getMeetings();
				const exporter = new NoteExporter(this.app, this.settings);
				let written = 0;
				for (const meeting of meetings) {
					const rows = db.getTranscriptRows(meeting.id);
					const summary = db.getSummaryMarkdown(meeting.id);
					const result = await exporter.exportMeeting(meeting, rows, summary);
					if (result.status === "written") written++;
				}

				this.settings.lastSyncedAt = new Date().toISOString();
				await this.saveSettings();

				this.setStatus(written > 0 ? `${written} new` : "up to date");
				if (!silent || written > 0) {
					new Notice(`Meetily Sync: exported ${written} of ${meetings.length} meeting(s).`);
				}
			} finally {
				db.close();
			}
		} catch (err) {
			console.error("Meetily Sync failed", err);
			this.setStatus("sync failed");
			new Notice(`Meetily Sync failed: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			this.syncing = false;
		}
	}
}
