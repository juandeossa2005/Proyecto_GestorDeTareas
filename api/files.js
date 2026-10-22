import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (!process.env.APP_PASSWORD || req.headers["x-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "no autorizado" });
  }
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS files (
    id text PRIMARY KEY, name text, type text, data text NOT NULL, created_at timestamptz DEFAULT now()
  )`;
  if (req.method === "POST") {
    const { name, type, data } = req.body || {};
    if (!data || data.length > 4200000) return res.status(413).json({ error: "Archivo muy grande" });
    const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await sql`INSERT INTO files (id, name, type, data) VALUES (${id}, ${name || "archivo"}, ${type || "application/octet-stream"}, ${data})`;
    return res.json({ id });
  }
  const id = req.query.id;
  if (!id) return res.status(400).end();
  if (req.method === "GET") {
    const r = await sql`SELECT type, data FROM files WHERE id = ${id}`;
    if (!r[0]) return res.status(404).end();
    res.setHeader("Content-Type", r[0].type || "application/octet-stream");
    return res.send(Buffer.from(r[0].data, "base64"));
  }
  if (req.method === "DELETE") {
    await sql`DELETE FROM files WHERE id = ${id}`;
    return res.json({ ok: true });
  }
  res.status(405).end();
}
