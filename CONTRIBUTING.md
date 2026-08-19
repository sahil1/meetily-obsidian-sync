# Contributing

Thanks for your interest in Meetily Sync.

## Development setup

```bash
git clone https://github.com/sahil1/meetily-obsidian-sync.git
cd meetily-obsidian-sync
git checkout sandbox      # active development branch
npm install
```

## Common tasks

| Command | What it does |
| --- | --- |
| `npm run dev` | Watch build → `main.js` (and copies `sql-wasm.wasm`) |
| `npm run build` | Lint, type-check, and produce a production bundle |
| `npm run lint` | ESLint (`eslint-plugin-obsidianmd` rules) |
| `npm test` | Jest unit tests |

## Testing in Obsidian

Point the plugin folder of a scratch vault at your build:

```bash
ln -s "$(pwd)" "/path/to/TestVault/.obsidian/plugins/meetily-sync"
```

Run `npm run dev`, then enable **Meetily Sync** in the vault and reload (Cmd/Ctrl-R) after each build.

## Branching

- `sandbox` — active development. Open PRs here.
- `main` — stable. Release tags are cut from `main`.

## Code style

- TypeScript, tabs, sentence-case UI text (product names like "Meetily" excepted).
- Keep `src/format.ts` free of Obsidian/Node imports so it stays unit-testable.
- Run `npm run lint && npm test` before opening a PR.
