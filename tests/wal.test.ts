import { mergeWal } from "../src/wal";

describe("mergeWal (safety fallbacks)", () => {
	const main = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

	it("returns the main image when there is no WAL", () => {
		expect(mergeWal(main, null)).toBe(main);
		expect(mergeWal(main, undefined)).toBe(main);
	});

	it("returns the main image for a too-short WAL", () => {
		expect(mergeWal(main, new Uint8Array(8))).toBe(main);
	});

	it("returns the main image when the WAL magic is invalid", () => {
		const bogus = new Uint8Array(64); // all zeros -> bad magic
		expect(mergeWal(main, bogus)).toBe(main);
	});
});
