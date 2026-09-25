// Next.js loads .env files automatically, but these scripts run outside Next.
// Load them the same way (.env.local wins over .env; real env vars win over both).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file doesn't exist — fine
  }
}
