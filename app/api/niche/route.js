export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const MB_BASE = process.env.MB_BASE || "https://geared-nemo.metabaseapp.com";
const MB_API_KEY = process.env.MB_API_KEY || "";
const MB_DB_ID = Number(process.env.MB_DB_ID || 3);

async function mbQuery(sql) {
  const started = Date.now();
  const r = await fetch(`${MB_BASE}/api/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MB_API_KEY },
    body: JSON.stringify({ database: MB_DB_ID, type: "native", native: { query: sql } }),
    cache: "no-store",
  }).catch((e) => ({ ok: false, _err: String(e) }));
  if (r._err) return { ok: false, error: r._err, rows: [], ms: Date.now() - started };
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  if (!j || j.error || !j.data) return { ok: false, error: (j && (j.error || j.message)) || `HTTP ${r.status}`, rows: [], ms: Date.now() - started };
  const cols = j.data.cols.map((c) => c.name);
  const rows = j.data.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));
  return { ok: true, cols, rows, ms: Date.now() - started };
}

export async function GET(request) {
  const u = new URL(request.url);
  const slugRaw = u.searchParams.get("slug") || "";
  const slug = slugRaw.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) return Response.json({ ok: false, error: "no slug" });
  if (!MB_API_KEY) return Response.json({ ok: false, error: "MB_API_KEY not set" });

  const weeklySql = `
    select date_trunc('week', date)::date as wk,
           sum(coalesce(clicks,0))       as clicks,
           sum(coalesce(impressions,0))  as impressions
    from public.seo_page_perf_daily
    where slug = '${slug}' and date >= (current_date - interval '84 days')
    group by 1 order by 1`;
  const queriesSql = `
    select query,
           sum(coalesce(impressions,0)) as impressions,
           sum(coalesce(clicks,0))      as clicks,
           round(avg(position),1)       as position
    from public.seo_page_queries
    where slug = '${slug}'
    group by 1 order by impressions desc limit 12`;

  const [weekly, queries] = await Promise.all([mbQuery(weeklySql), mbQuery(queriesSql)]);
  return Response.json({
    ok: true, slug,
    weekly: { ok: weekly.ok, error: weekly.error || null, rows: weekly.rows || [] },
    queries: { ok: queries.ok, error: queries.error || null, rows: queries.rows || [] },
  }, { headers: { "Cache-Control": "no-store" } });
}
