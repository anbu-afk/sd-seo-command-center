export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
const VERSION = "probe-v6";

const MB_BASE = process.env.MB_BASE || "https://geared-nemo.metabaseapp.com";
const MB_API_KEY = process.env.MB_API_KEY || "";
const MB_DB_ID = Number(process.env.MB_DB_ID || 3);
const OP_BASE = process.env.OP_BASE || "https://openpanel.secretdesires.ai";
const OP_CLIENT_ID = process.env.OP_CLIENT_ID || "";
const OP_CLIENT_SECRET = process.env.OP_CLIENT_SECRET || "";
const OP_BREAKDOWN = process.env.OP_BREAKDOWN || "properties.__path";
const OP_DAYS = Number(process.env.OP_DAYS || 30);
const OP_TIMEOUT = Number(process.env.OP_TIMEOUT || 20000);

const SEO_SQL = `
select slug, keyword,
  round(page_avg_position,1)            as page_pos,
  round(primary_keyword_position,1)     as primary_pos,
  coalesce(clicks_28d,0)                as clicks_28d,
  coalesce(impressions_28d,0)           as impressions_28d,
  round(ctr_28d*100,1)                  as ctr_pct,
  tp, striking_distance, latest_date::text as latest
from public.seo_page_scorecard
order by clicks_28d desc nulls last`;

// Guarantees a resolved value within ms even if the fetch never settles.
function safeFetch(url, opts, ms) {
  const ctl = new AbortController();
  const started = Date.now();
  const p = fetch(url, { ...opts, signal: ctl.signal })
    .then(async (r) => ({ status: r.status, text: await r.text(), ms: Date.now() - started }))
    .catch((e) => ({ status: 0, text: "error: " + String(e), ms: Date.now() - started }));
  let timer;
  const timeout = new Promise((res) => { timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} res({ status: 0, text: "timeout", ms: ms }); }, ms || 12000); });
  return Promise.race([p.then((v) => { clearTimeout(timer); return v; }), timeout]);
}

async function fetchMetabase() {
  if (!MB_API_KEY) return { ok: false, error: "MB_API_KEY not set", rows: [] };
  const r = await safeFetch(`${MB_BASE}/api/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MB_API_KEY },
    body: JSON.stringify({ database: MB_DB_ID, type: "native", native: { query: SEO_SQL } }),
    cache: "no-store",
  }, 15000);
  let j = null; try { j = JSON.parse(r.text); } catch (e) {}
  if (!j || j.error || !j.data) return { ok: false, error: (j && j.error) || `HTTP ${r.status}`, rows: [] };
  const cols = j.data.cols.map((c) => c.name);
  const rows = j.data.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));
  return { ok: true, rows };
}

function qsBuild(obj, prefix, out) {
  out = out || [];
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") qsBuild(item, `${key}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
      });
    } else if (typeof v === "object") { qsBuild(v, key, out); }
    else { out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`); }
  }
  return out.join("&");
}

const OP_HEADERS = { "openpanel-client-id": OP_CLIENT_ID, "openpanel-client-secret": OP_CLIENT_SECRET };

function isoStart(days) { return new Date(Date.now() - days * 86400000).toISOString(); }
function isoEnd() { return new Date().toISOString(); }

// Reliable event COUNT via /export/events meta.totalCount (proven to return real data).
async function opCount(event, days) {
  const p = qsBuild({ event, start: isoStart(days), end: isoEnd(), limit: 1 });
  const r = await safeFetch(`${OP_BASE}/api/export/events?${p}`, { headers: OP_HEADERS, cache: "no-store" }, OP_TIMEOUT);
  let j = null; try { j = JSON.parse(r.text); } catch (e) {}
  return { status: r.status, ms: r.ms, count: (j && j.meta && j.meta.totalCount) || 0, raw: r.text.slice(0, 220) };
}

// Revenue = sum of the `amount` property over subscription_purchased events.
// The /export/charts property_sum path returns empty for this instance, so we
// aggregate over /export/events (proven reliable). The events endpoint caps page
// size (limit=1000 returns nothing), so we page at PAGE_LIMIT and fan out.
const PAGE_LIMIT = Number(process.env.OP_PAGE_LIMIT || 50);
const MAX_PAGES = Number(process.env.OP_MAX_PAGES || 40);

async function opEventsPage(event, days, page, limit) {
  const p = qsBuild({ event, start: isoStart(days), end: isoEnd(), limit, page });
  const r = await safeFetch(`${OP_BASE}/api/export/events?${p}`, { headers: OP_HEADERS, cache: "no-store" }, OP_TIMEOUT);
  let j = null; try { j = JSON.parse(r.text); } catch (e) {}
  return { status: r.status, ms: r.ms, data: (j && j.data) || [], meta: (j && j.meta) || {} };
}

function sumAmounts(rows) {
  let total = 0, count = 0;
  for (const e of rows) {
    const a = parseFloat(e && e.properties && e.properties.amount);
    if (!isNaN(a)) { total += a; count += 1; }
  }
  return { total, count };
}

// One fast call: subscription count (totalCount) + revenue estimate from the
// page-1 sample average. Avoids hammering ClickHouse with dozens of COUNT queries.
async function opSubsAndRevenue(days) {
  const r = await opEventsPage("subscription_purchased", days, 1, PAGE_LIMIT);
  const totalCount = r.meta.totalCount || r.data.length;
  const s = sumAmounts(r.data);
  const avg = s.count ? s.total / s.count : 0;
  return {
    subs: totalCount,
    revenue: Math.round(avg * totalCount * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    sampleN: s.count,
    status: r.status, ms: r.ms,
  };
}

// Diagnostic: find the real events page-size cap and the working charts contract.
async function opProbe(days) {
  const limits = [1, 50, 100, 250, 500, 1000];
  const evTests = await Promise.all(limits.map((l) =>
    opEventsPage("subscription_purchased", days, 1, l).then((r) => ({ limit: l, rows: r.data.length, totalCount: r.meta.totalCount, status: r.status }))
  ));
  const ev = [{ id: "A", name: "subscription_purchased", segment: "event" }];
  const variants = [
    ["startDate+event", { startDate: isoStart(days), endDate: isoEnd(), interval: "day", events: ev }],
    ["start/end names", { start: isoStart(days), end: isoEnd(), interval: "day", events: ev }],
    ["range=1m", { range: "1m", interval: "day", events: ev }],
    ["range=30d", { range: "30d", interval: "day", events: ev }],
    ["propsum amount", { startDate: isoStart(days), endDate: isoEnd(), interval: "day", events: [{ id: "A", name: "subscription_purchased", segment: "property_sum", property: "amount" }] }],
    ["metric key", { startDate: isoStart(days), endDate: isoEnd(), interval: "day", metric: "sum", events: ev }],
  ];
  const chartVariants = [];
  for (const [label, params] of variants) {
    const r = await safeFetch(`${OP_BASE}/api/export/charts?${qsBuild(params)}`, { headers: OP_HEADERS, cache: "no-store" }, OP_TIMEOUT);
    chartVariants.push({ label, status: r.status, ms: r.ms, raw: r.text.slice(0, 260) });
  }
  return { evTests, chartVariants };
}

// OpenPanel /export/charts (kept for diagnostics/breakdown probing only).
async function opChart({ events, breakdowns, days }) {
  const params = {
    startDate: isoStart(days), endDate: isoEnd(), interval: "day", chartType: "linear",
    events, breakdowns: breakdowns || [],
  };
  const url = `${OP_BASE}/api/export/charts?${qsBuild(params)}`;
  const r = await safeFetch(url, { headers: OP_HEADERS, cache: "no-store" }, OP_TIMEOUT);
  let json = null; try { json = JSON.parse(r.text); } catch (e) {}
  return { status: r.status, ms: r.ms, json, raw: r.text.slice(0, 1600) };
}

async function opSampleEvent(event, days) {
  const p = qsBuild({ event, start: isoStart(days), end: isoEnd(), limit: 1, includes: "profile,properties,geo,referrer,meta" });
  const r = await safeFetch(`${OP_BASE}/api/export/events?${p}`, { headers: OP_HEADERS, cache: "no-store" }, OP_TIMEOUT);
  return { status: r.status, ms: r.ms, raw: r.text.slice(0, 3500) };
}

async function fetchOpenPanel(cfg) {
  const days = cfg.days || OP_DAYS;
  if (!OP_CLIENT_ID || !OP_CLIENT_SECRET) {
    return { ok: false, error: "OP_CLIENT_ID / OP_CLIENT_SECRET not set", perLander: {}, totals: {}, debug: {} };
  }
  const out = { ok: true, perLander: {}, totals: {}, debug: {},
    window: { days, start: isoStart(days), end: isoEnd() } };

  if (cfg.probe) { out.probe = await opProbe(days); return out; }

  // signups count (reliable), subs count + revenue estimate (one call).
  const [signupsC, sr] = await Promise.all([
    opCount("signup_completed", days),
    opSubsAndRevenue(days),
  ]);
  out.totals.signups = signupsC.count;
  out.totals.subs = sr.subs;
  out.totals.revenue = sr.revenue;
  out.totals.revenueEstimated = true;
  out.totals.avgOrder = sr.avg;
  out.debug.signups = { status: signupsC.status, ms: signupsC.ms };
  out.debug.subs = { status: sr.status, ms: sr.ms, avg: sr.avg, sampleN: sr.sampleN };

  if (cfg.debug || cfg.breakdown) {
    const bd = cfg.breakdown || OP_BREAKDOWN;
    const [subsBd, sample] = await Promise.all([
      opChart({ events: [{ id: "A", name: "subscription_purchased", segment: "event" }], breakdowns: [{ id: "0", name: bd }], days }),
      opSampleEvent("subscription_purchased", days),
    ]);
    out.debug.subs_bd = { status: subsBd.status, ms: subsBd.ms, raw: subsBd.raw };
    out.debug.sampleEvent = sample;
    out.breakdownUsed = bd;
  }
  return out;
}

let CACHE = { at: 0, payload: null };
const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 600000); // 10 min

export async function GET(request) {
  const u = new URL(request.url);
  const cfg = {
    breakdown: u.searchParams.get("bd") || null,
    days: Number(u.searchParams.get("days")) || OP_DAYS,
    debug: u.searchParams.get("debug") === "1",
    probe: u.searchParams.get("probe") === "1",
  };
  const bypass = cfg.debug || cfg.breakdown || cfg.probe || u.searchParams.get("fresh") === "1";
  if (!bypass && CACHE.payload && Date.now() - CACHE.at < CACHE_TTL) {
    return Response.json({ ...CACHE.payload, cached: true, cacheAgeMs: Date.now() - CACHE.at },
      { headers: { "Cache-Control": "no-store" } });
  }
  const t0 = Date.now();
  const [seo, op] = await Promise.all([
    fetchMetabase().catch((e) => ({ ok: false, error: String(e), rows: [] })),
    fetchOpenPanel(cfg).catch((e) => ({ ok: false, error: String(e), perLander: {}, totals: {}, debug: {} })),
  ]);
  const landers = (seo.rows || []).map((r) => {
    const conv = op.perLander[r.slug] || {};
    return {
      slug: r.slug, name: r.keyword, page_pos: r.page_pos, primary_pos: r.primary_pos,
      clicks: r.clicks_28d, impressions: r.impressions_28d, ctr: r.ctr_pct,
      tp: r.tp, striking: r.striking_distance, latest: r.latest,
      signups: conv.signups ?? null, subs: conv.subs ?? null, revenue: conv.revenue ?? null,
    };
  });
  const payload = {
    version: VERSION, tookMs: Date.now() - t0, generatedAt: new Date().toISOString(),
    sources: {
      metabase: { ok: seo.ok, error: seo.error || null, count: (seo.rows || []).length },
      openpanel: { ok: op.ok, error: op.error || null, totals: op.totals || {}, window: op.window || null, debug: op.debug || null, probe: op.probe || null },
    },
    landers,
  };
  if (!bypass && seo.ok) CACHE = { at: Date.now(), payload };
  return Response.json({ ...payload, cached: false }, { headers: { "Cache-Control": "no-store" } });
}
