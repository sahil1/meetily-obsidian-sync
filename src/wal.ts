// Best-effort merge of a SQLite write-ahead log (-wal) into the main database
// image. Meetily keeps its DB in WAL mode, so a meeting you just recorded may
// live only in the -wal file until SQLite checkpoints it. sql.js loads a single
// database image and does NOT apply an external -wal, so we replay the WAL's
// committed pages onto the main image ourselves before handing it to sql.js.
//
// WAL format reference: https://www.sqlite.org/fileformat2.html#walformat

const WAL_MAGIC_A = 0x377f0682; // checksums little-endian
const WAL_MAGIC_B = 0x377f0683; // checksums big-endian

/**
 * Return a database image that includes committed WAL pages. If there is no
 * usable WAL, the original main image is returned unchanged.
 */
export function mergeWal(main: Uint8Array, wal: Uint8Array | null | undefined): Uint8Array {
	if (!wal || wal.length < 32) return main;

	const wv = new DataView(wal.buffer, wal.byteOffset, wal.byteLength);
	const magic = wv.getUint32(0, false);
	if (magic !== WAL_MAGIC_A && magic !== WAL_MAGIC_B) return main;

	const pageSize = wv.getUint32(8, false);
	// Page size must be a power of two in [512, 65536].
	if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0) return main;

	const saltLo = wv.getUint32(16, false);
	const saltHi = wv.getUint32(20, false);

	const FRAME_HEADER = 24;
	const frameSize = FRAME_HEADER + pageSize;

	// Only pages from committed transactions in the current salt era are applied.
	const committed = new Map<number, Uint8Array>();
	let pending = new Map<number, Uint8Array>();
	let dbPages = 0;

	let pos = 32;
	while (pos + frameSize <= wal.length) {
		const pageNumber = wv.getUint32(pos, false);
		const commitSize = wv.getUint32(pos + 4, false);
		const frameSaltLo = wv.getUint32(pos + 8, false);
		const frameSaltHi = wv.getUint32(pos + 12, false);

		// A salt mismatch marks the end of the frames written in this era
		// (older/reused frames or a torn tail); stop scanning.
		if (frameSaltLo !== saltLo || frameSaltHi !== saltHi) break;

		const page = wal.subarray(pos + FRAME_HEADER, pos + FRAME_HEADER + pageSize);
		pending.set(pageNumber, page);

		if (commitSize !== 0) {
			// Commit frame: fold the pending transaction into the committed set.
			for (const [pn, pg] of pending) committed.set(pn, pg);
			pending = new Map();
			dbPages = commitSize;
		}
		pos += frameSize;
	}

	if (committed.size === 0) return main;

	const outLen = Math.max(main.length, dbPages * pageSize);
	const out = new Uint8Array(outLen);
	out.set(main.subarray(0, Math.min(main.length, outLen)));
	for (const [pageNumber, page] of committed) {
		const offset = (pageNumber - 1) * pageSize;
		if (offset >= 0 && offset + pageSize <= out.length) {
			out.set(page, offset);
		}
	}
	return out;
}
