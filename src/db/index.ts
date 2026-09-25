import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

export const PGLITE_DIR = process.env.PGLITE_DIR ?? ".data/pglite";

const globalForDb = globalThis as unknown as { __baariDb?: DB };

/**
 * Uses Postgres when DATABASE_URL is set (e.g. Supabase), otherwise an embedded
 * PGlite database on disk so the app runs locally with zero setup.
 * Created lazily so that importing this module never opens a connection.
 */
export function getDb(): DB {
  if (!globalForDb.__baariDb) {
    const url = process.env.DATABASE_URL;
    if (url) {
      const client = postgres(url, {
        // Supabase's Transaction pooler (Supavisor, port 6543) does not support
        // prepared statements, so they must be disabled.
        prepare: false,
        // Serverless functions each hold their own pool; keep it small.
        max: Number(process.env.DATABASE_POOL_MAX ?? 5),
        idle_timeout: 20,
        connect_timeout: 15,
        onnotice: () => {},
      });
      globalForDb.__baariDb = drizzlePostgres({ client, schema });
    } else {
      if (process.env.VERCEL) {
        // The embedded database writes to local disk, which doesn't persist on Vercel.
        throw new Error("DATABASE_URL is not set. Add your Supabase connection string to the environment variables.");
      }
      mkdirSync(PGLITE_DIR, { recursive: true });
      globalForDb.__baariDb = drizzlePglite({ client: new PGlite(PGLITE_DIR), schema }) as unknown as DB;
    }
  }
  return globalForDb.__baariDb;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** `db.execute` returns an array on postgres.js but `{ rows }` on PGlite. */
export function rowsOf<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

export { schema };
