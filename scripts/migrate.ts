import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  if (process.env.DATABASE_URL) {
    await migratePg(db, { migrationsFolder: "./drizzle" });
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
