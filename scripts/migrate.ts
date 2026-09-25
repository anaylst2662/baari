import "./env";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { getDb } from "../src/db";
import { describeTarget } from "./target";

async function main() {
  console.log(`Applying migrations to ${describeTarget()}…`);
  const db = getDb();
  if (process.env.DATABASE_URL) {
    await migratePostgres(db, { migrationsFolder: "./drizzle" });
  } else {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder: "./drizzle" });
  }
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
