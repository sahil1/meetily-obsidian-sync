# Changelog

All notable changes to Meetily Sync are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 0.4.0

- Embed the SQLite WebAssembly binary in `main.js`, so a release now ships the
  three files Obsidian recognizes (`main.js`, `manifest.json`, `styles.css`)
  and installing by hand no longer needs a side-car `sql-wasm.wasm`.
- Ship a local type declaration for `sql.js` so the plugin type-checks cleanly
  under a production-only install, and switch linting to the type-checked rule
  set to keep it that way.
- Commit `package-lock.json`, pin `sql.js` to an exact version, and drop the
  `builtin-modules` dependency in favor of Node's built-in list.
- Record build-provenance attestations for release assets.

## 0.3.0

- Add a status bar indicator (`Meetily: syncing… / N new / up to date`) so
  background syncs are quiet instead of firing a Notice every time.
- Add a Buy Me a Coffee funding link.
- Document filesystem and network behavior in the README for transparency.

## 0.2.1

- Fix: merge committed write-ahead-log (WAL) pages when reading the database,
  so a meeting recorded moments ago syncs immediately even while Meetily is open.

## 0.2.0

- Rework settings into a base folder + subfolder pattern + filename pattern
  model (separately for notes and transcripts), matching a flexible layout.
- Add pattern variables: `{title}`, `{date}`, `{time}`, `{year}`, `{month}`,
  `{day}`, `{quarter}`.
- Move the Meetily database path to an Advanced section; it is auto-detected
  per operating system.
- Migrate settings from the earlier single-folder layout automatically.

## 0.1.0

- Initial release: export Meetily meeting summaries and transcripts into the
  vault as Markdown, reading the local SQLite database via sql.js. Idempotent,
  desktop-only, with manual sync, sync-on-startup, and timer-based auto-sync.
