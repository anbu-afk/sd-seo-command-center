import { OP_SNAPSHOT } from "../../opSnapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const MB_BASE = process.env.MB_BASE || "https://geared-nemo.metabaseapp.com";
const MB_API_KEY = process.env.MB_API_KEY || "";
const MB_DB_ID = Number(process.env.MB_DB_ID || 3);

// Daily totals across ALL SEO landers: clicks, impressions, and an
// impressions-weighted average Google position (lower = better rank).
const TREND_SQL = `
  select date::text as d,
         sum(coalesce(clicks,0))       as clicks,
         sum(coalesce(impressions,0))  as impressions,
         round(sum(avg_position * coalesce(impressions,0))
               / nullif(sum(coalesce(impressions,0)), 0), 2) as position
  from public.seo_page_perf_daily
  group by date order by date`;

export async function GET() {
  if (!MB_API_KEY) return Response.json({ ok: false, error: "MB_API_KEY not set", rows: [] });
  const r = await fetch(`${MB_BASE}/api/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MB_API_KEY },
    body: JSON.stringify({ database: MB_DB_ID, type: "native", native: { query: TREND_SQL } }),
    cache: "no-store",
  }).catch((e) => ({ _err: String(e) }));
  if (r._err) return Response.json({ ok: false, error: r._err, rows: [] });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  if (!j || j.error || !j.data) return Response.json({ ok: false, error: (j && (j.error || j.message)) || `HTTP ${r.status}`, rows: [] });
  const cols = j.data.cols.map((c) => c.name);
  const rows = j.data.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));

  // Merge in the OpenPanel daily registrations + subscriptions snapshot by date.
  const conv = {};
  (OP_SNAPSHOT.daily || []).forEach((r) => { conv[r.date] = { regs: r.regs, subs: r.subs }; });
  const merged = rows.map((r) => ({
    date: r.d,
    clicks: r.clicks, impressions: r.impressions, position: r.position,
    regs: conv[r.d] ? conv[r.d].regs : null,
    subs: conv[r.d] ? conv[r.d].subs : null,
  }));

  return Response.json(
    { ok: true, rows: merged, convAsOf: OP_SNAPSHOT.asOf },
    { headers: { "Cache-Control": "no-store" } }
  );
}
