import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (!process.env.APP_PASSWORD || req.headers["x-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "no autorizado" });
  }
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS store (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  )`;
  if (req.method === "GET") {
    const rows = await sql`SELECT data FROM store WHERE id = 'main'`;
    return res.json({ data: rows[0] ? rows[0].data : null });
  }
  if (req.method === "PUT") {
    const json = JSON.stringify(req.body);
    await sql`INSERT INTO store (id, data) VALUES ('main', ${json}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return res.json({ ok: true });
  }
  res.status(405).end();
}
