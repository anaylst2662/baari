import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

export const PGLITE_DIR = process.env.PGLITE_DIR ?? ".data/pglite";

const globalForDb = globalThis as unknown as { __baariDb?: DB };

/**
 * Uses Postgres when DATABASE_URL is set (Supabase, Neon, RDS...), otherwise an
 * embedded PGlite database on disk so the app runs locally with zero setup.
 * Created lazily so that importing this module never opens a connection.
 */
export function getDb(): DB {
  if (!globalForDb.__baariDb) {
    const url = process.env.DATABASE_URL;
    if (url) {
      globalForDb.__baariDb = drizzlePg({ client: new Pool({ connectionString: url, max: 5 }), schema });
    } else {
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

export { schema };
