import { neon } from "@neondatabase/serverless";

const ie = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (l) => (l.match(/.{1,70}/g) || [""]).join("\r\n ");
const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;

export default async function handler(req, res) {
  if (!process.env.CALENDAR_TOKEN || req.query.token !== process.env.CALENDAR_TOKEN) {
    return res.status(401).send("no autorizado");
  }
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT data FROM store WHERE id = 'main'`;
  const tasks = rows[0] ? rows[0].data.tasks || [] : [];
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gestor//ES", "X-WR-CALNAME:Mis tareas", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  for (const t of tasks) {
    if (!t.due || t.done) continue;
    // La fecha se guarda como hora local sin zona; se escribe tal cual (hora flotante).
    const m = t.due.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) continue;
    const start = `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00`;
    const end = stamp(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 1, +m[5])));
    const desc = [t.desc].concat((t.fields || []).map((f) => `${f.k}: ${f.v}`)).concat(t.links || []).filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${t.id}@gestor`, `DTSTAMP:${now}`, `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${ie(t.title)}`, `DESCRIPTION:${ie(desc)}`,
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Recordatorio", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.send(lines.map(fold).join("\r\n"));
}
