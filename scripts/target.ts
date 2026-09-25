/** Human-readable description of which database the scripts will touch (password hidden). */
export function describeTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return `the local PGlite database (${process.env.PGLITE_DIR ?? ".data/pglite"})`;
  try {
    const u = new URL(url);
    return `Postgres at ${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "the Postgres database in DATABASE_URL";
  }
}
