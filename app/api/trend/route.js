import { OP_SNAPSHOT } from "../../opSnapshot";
import { opPull, opCookiePresent } from "../../opLive";

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

const SLUG_SQL = `select slug from public.seo_page_scorecard order by slug`;

// Live OpenPanel daily pull (populated on ?refresh=1, reused for a while).
let OP_LIVE = { at: 0, data: null };
const OP_LIVE_TTL = Number(process.env.OP_LIVE_TTL_MS || 1800000); // 30 min

async function mb(sql) {
  const r = await fetch(`${MB_BASE}/api/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MB_API_KEY },
    body: JSON.stringify({ database: MB_DB_ID, type: "native", native: { query: sql } }),
    cache: "no-store",
  }).catch((e) => ({ _err: String(e) }));
  if (r._err) return { ok: false, error: r._err, rows: [] };
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  if (!j || j.error || !j.data) return { ok: false, error: (j && (j.error || j.message)) || `HTTP ${r.status}`, rows: [] };
  const cols = j.data.cols.map((c) => c.name);
  return { ok: true, rows: j.data.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v]))) };
}

export async function GET(request) {
  if (!MB_API_KEY) return Response.json({ ok: false, error: "MB_API_KEY not set", rows: [] });
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  const [trend, slugsRes] = await Promise.all([mb(TREND_SQL), refresh ? mb(SLUG_SQL) : Promise.resolve({ rows: [] })]);
  if (!trend.ok) return Response.json({ ok: false, error: trend.error, rows: [] });
  const rows = trend.rows;

  // Daily conversions: live from OpenPanel if a token is set (on refresh or warm), else baked.
  let opLiveError = null;
  if (opCookiePresent()) {
    const warm = OP_LIVE.data && Date.now() - OP_LIVE.at < OP_LIVE_TTL;
    if (refresh || !warm) {
      try {
        const slugs = (slugsRes.rows || []).map((r) => r.slug);
        const pulled = await opPull(slugs.length ? slugs : undefined);
        if (pulled) OP_LIVE = { at: Date.now(), data: pulled };
      } catch (e) { opLiveError = String(e.message || e).slice(0, 200); }
    }
  }
  const live = !!OP_LIVE.data;
  const daily = live ? OP_LIVE.data.daily : OP_SNAPSHOT.daily;
  const convAsOf = live ? OP_LIVE.data.asOf : OP_SNAPSHOT.asOf;

  const conv = {};
  (daily || []).forEach((r) => { conv[r.date] = { regs: r.regs, subs: r.subs }; });
  const merged = rows.map((r) => ({
    date: r.d,
    clicks: r.clicks, impressions: r.impressions, position: r.position,
    regs: conv[r.d] ? conv[r.d].regs : null,
    subs: conv[r.d] ? conv[r.d].subs : null,
  }));

  return Response.json(
    { ok: true, rows: merged, convAsOf, live, tokenSet: opCookiePresent(), error: opLiveError },
    { headers: { "Cache-Control": "no-store" } }
  );
}
