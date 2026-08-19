# Meetily Sync

Bring your [Meetily](https://meetily.ai) meeting notes into [Obsidian](https://obsidian.md). Meetily Sync reads your local Meetily recordings — the AI summary and the full transcript — and writes each meeting into your vault as clean, linked Markdown. Everything runs on your machine: no cloud service, no API keys, no meeting bots.

## Getting started

Meetily Sync connects two tools you run locally. Set them up in this order.

### 1. Meetily — record and transcribe meetings on-device

[Meetily](https://meetily.ai) is a free, open-source meeting assistant that captures your system audio, transcribes it locally (Whisper / Parakeet), and generates an AI summary. Audio never leaves your computer.

1. Install Meetily for macOS or Windows from [meetily.ai](https://meetily.ai).
2. Grant microphone and system-audio permissions so it can hear everyone on the call, not just you.
3. Record a meeting and let Meetily generate its summary. Meetings are saved to a local database on your machine.
4. Optional: turn on speaker diarization in Meetily's transcription settings so transcripts carry named speakers.

### 2. Obsidian — where your notes live

Install [Obsidian](https://obsidian.md) and open the vault you want your meeting notes to land in.

### 3. Meetily Sync — this plugin

Install it (see [Install](#install)), choose a folder, and click **Sync now**.

## What it solves

Meetily records and summarizes your meetings locally, but that content stays inside the Meetily app. Moving it into your notes means copy-pasting, and nothing ties it back to the rest of your knowledge base.

Meetily Sync closes that gap. It reads Meetily's local database directly and writes every meeting into your vault as Markdown — a summary note and a transcript note per meeting, organized by date and cross-linked. Your meetings become first-class notes you can search, link, tag, and build on, and they never leave your machine.

## What it writes

With the default settings, each meeting produces two notes:

```
notes/meetily/2026/08/18/Weekly Team Sync-summary.md
notes/meetily/2026/08/18/Weekly Team Sync-transcript.md
```

- **Summary note** — the AI summary Meetily generated (decisions, action items, key points).
- **Transcript note** — the full transcript as speaker blocks.
- Both carry YAML frontmatter (`meetily_id`, `title`, `created`/`updated`, `source: meetily`) and link to each other, so they behave like a connected pair in your graph.

Syncing is **idempotent**: meetings you have already exported are skipped, so you can sync as often as you like.

## Install

1. Download `main.js`, `manifest.json`, `styles.css`, and `sql-wasm.wasm` from the [latest release](../../releases/latest).
2. Copy all four into `<your vault>/.obsidian/plugins/meetily-sync/`.
3. In Obsidian, open **Settings → Community plugins → Reload**, then enable **Meetily Sync**.

> `sql-wasm.wasm` must sit next to `main.js` — the plugin loads it at runtime to read the database.

## Usage

- Click the sync ribbon icon (circular arrows), or
- Run the command **Meetily Sync: Sync Meetily meetings now**, or
- Open the plugin settings and press **Sync now**.

New meetings are written to your output folder. Enable **Sync on startup** or **Auto-sync on a timer** in settings to keep it hands-off.

## Settings

Note locations are built from a **base folder** + **subfolder pattern** + **filename pattern**, so you can put notes wherever you like. Summaries and transcripts can share a folder or live in separate ones.

**Notes** and **Transcripts** each have:

| Setting | Notes default | Transcripts default |
| --- | --- | --- |
| Base folder | `notes/meetily` | `notes/meetily` |
| Subfolder pattern | `{year}/{month}/{day}` | `{year}/{month}/{day}` |
| Filename pattern | `{title}-summary` | `{title}-transcript` |

Pattern variables: `{title}`, `{date}`, `{time}`, `{year}`, `{month}`, `{day}`, `{quarter}`. Leave a subfolder pattern blank for a flat folder.

**Content:** export summary / export transcript / include frontmatter / default speaker label / overwrite existing.

**Automation:** sync on startup / auto-sync on a timer + interval / **Sync now** button.

**Advanced → Meetily database location:** the path to Meetily's `meeting_minutes.sqlite`. This is **auto-detected** for your operating system — leave it blank unless you installed Meetily in a custom location:

- **macOS** `~/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite`
- **Windows** `%APPDATA%\com.meetily.ai\meeting_minutes.sqlite`
- **Linux** `~/.config/com.meetily.ai/meeting_minutes.sqlite`

## How it works

The plugin opens Meetily's SQLite database with [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly), so there are no native modules to build or trust. It loads the database as an **in-memory snapshot** — Meetily's file is only ever read, never modified — and maps the `meetings`, `transcripts`, and `summary_processes` tables into Markdown.

Meetily runs its database in WAL (write-ahead log) mode, which means a meeting can be committed to a side file before it is folded into the main database. Meetily Sync merges those committed pages when it reads, so a meeting you recorded moments ago appears right away, even while Meetily is still open.

## Limitations

- **Desktop only.** It reads a local file, so it does not run on Obsidian mobile.
- **Speaker labels.** Meetily only fills in speaker names when diarization is enabled. Without it, transcript lines use the default label; turn on diarization in Meetily and future syncs carry real speakers.

## Packaging (install into your own vault)

To install a build by hand:

1. `npm run build` — produces `main.js` and `sql-wasm.wasm`.
2. Create `<vault>/.obsidian/plugins/meetily-sync/`.
3. Copy in `main.js`, `manifest.json`, `styles.css`, and `sql-wasm.wasm`.
4. In Obsidian: **Settings → Community plugins → Reload**, then enable **Meetily Sync**.

```bash
DEST="/path/to/YourVault/.obsidian/plugins/meetily-sync"
mkdir -p "$DEST"
cp main.js manifest.json styles.css sql-wasm.wasm "$DEST"/
```

## Releasing

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml): pushing a tag builds the plugin and attaches `main.js`, `manifest.json`, `styles.css`, and `sql-wasm.wasm` to a GitHub Release.

```bash
npm version patch        # bumps manifest.json + versions.json
git push && git push --tags
```

The tag must equal the version in `manifest.json` (no `v` prefix), which `npm version` guarantees.

## Publishing to the Obsidian community store

One-time submission, after at least one GitHub Release exists:

1. Confirm `main` has a green build, a tagged release with the four assets, a README, and a LICENSE.
2. Fork [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases).
3. Add an entry to `community-plugins.json`:
   ```json
   {
     "id": "meetily-sync",
     "name": "Meetily Sync",
     "author": "sahil1",
     "description": "Sync summaries and transcripts from your local Meetily meeting recorder into your vault.",
     "repo": "sahil1/meetily-obsidian-sync"
   }
   ```
4. Open a PR. An automated bot runs checks (the same `eslint-plugin-obsidianmd` rules this repo lints against) and a maintainer reviews. Once merged, the plugin appears in the in-app store, and every later GitHub Release is picked up automatically.

## Development

```bash
npm install      # installs deps and fetches sql.js
npm run dev       # watch build -> main.js (+ copies sql-wasm.wasm)
npm run lint      # eslint-plugin-obsidianmd rules
npm test          # jest unit tests
npm run build     # lint + type-check + production bundle
```

For live testing, symlink the repo into a scratch vault and reload Obsidian after each build:

```bash
ln -s "$(pwd)" "/path/to/TestVault/.obsidian/plugins/meetily-sync"
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## License

[MIT](LICENSE)
