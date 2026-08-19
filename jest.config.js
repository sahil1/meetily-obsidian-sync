/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	moduleNameMapper: {
		// format.ts is pure and imports only ./types, so no Obsidian mock is needed.
	},
};
