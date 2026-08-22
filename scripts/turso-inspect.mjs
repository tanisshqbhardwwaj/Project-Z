import { createClient } from "@libsql/client/web";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const m = await c.execute('SELECT name FROM "_turso_migrations" ORDER BY name');
console.log("applied migrations:", m.rows.map((r) => r.name));

const cols = await c.execute('PRAGMA table_info("Organization")');
console.log(
  "Organization columns:",
  cols.rows.map((r) => r.name)
);
