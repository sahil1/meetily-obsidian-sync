import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
	{
		ignores: ["main.js", "node_modules/", "tests/", "*.mjs", "*.cjs", "*.js"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			// "Meetily" is a product name, so its capitalization in UI strings is intentional.
			"obsidianmd/ui/sentence-case": "off",
			// The declarative settings API targets Obsidian 1.13.0+; we support 1.5.0+,
			// so the classic PluginSettingTab.display() approach is intentional.
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
			"@typescript-eslint/no-deprecated": "off",
		},
	}
);
