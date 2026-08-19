// Local type surface for sql.js.
//
// sql.js ships no types of its own, and the community `@types/sql.js` package is
// a devDependency that a production-only install (such as the community-store
// review scanner) does not see. Without types every DB call resolves to `any`,
// which trips the type-checked lint rules. Declaring the small slice of the API
// we use here keeps the plugin fully typed regardless of how it is installed.

declare module "sql.js" {
	export type SqlValue = number | string | Uint8Array | null;
	export type ParamsObject = Record<string, SqlValue>;
	export type BindParams = SqlValue[] | ParamsObject | null;

	export interface Statement {
		bind(values?: BindParams): boolean;
		step(): boolean;
		getAsObject(params?: BindParams): ParamsObject;
		free(): boolean;
	}

	export interface Database {
		prepare(sql: string, params?: BindParams): Statement;
		close(): void;
	}

	export interface SqlJsConfig {
		wasmBinary?: ArrayBuffer | Uint8Array;
		locateFile?: (file: string) => string;
	}

	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number> | null) => Database;
	}

	export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

// esbuild's `binary` loader turns a `.wasm` import into an embedded Uint8Array,
// so the WebAssembly build of SQLite ships inside main.js (no side-car file).
declare module "*.wasm" {
	const bytes: Uint8Array;
	export default bytes;
}
