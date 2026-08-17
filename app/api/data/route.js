export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const MB_BASE = process.env.MB_BASE || "https://geared-nemo.metabaseapp.com";
const MB_API_KEY = process.env.MB_API_KEY || "";
const MB_DB_ID = Number(process.env.MB_DB_ID || 3);
const OP_BASE = process.env.OP_BASE || "https://openpanel.secretdesires.ai";
const OP_CLIENT_ID = process.env.OP_CLIENT_ID || "";
const OP_CLIENT_SECRET = process.env.OP_CLIENT_SECRET || "";
const OP_BREAKDOWN = process.env.OP_BREAKDOWN || "properties.__path";
const OP_DAYS = Number(process.env.OP_DAYS || 30);

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

async function fetchMetabase() {
  if (!MB_API_KEY) return { ok: false, error: "MB_API_KEY not set", rows: [] };
  const r = await fetch(`${MB_BASE}/api/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MB_API_KEY },
    body: JSON.stringify({ database: MB_DB_ID, type: "native", native: { query: SEO_SQL } }),
    cache: "no-store",
  });
  const j = await r.json();
  if (j.error || !j.data) return { ok: false, error: j.error || `HTTP ${r.status}`, rows: [] };
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

async function opChart({ name, segment, property, breakdown, days }) {
  const params = {
    startDate: new Date(Date.now() - days * 86400000).toISOString(),
    endDate: new Date().toISOString(),
    interval: "day",
    series: [{ name, segment: segment || "event", property }],
  };
  if (breakdown) params.breakdowns = [{ id: "0", name: breakdown }];
  const url = `${OP_BASE}/api/export/charts?${qsBuild(params)}`;
  const r = await fetch(url, { headers: OP_HEADERS, cache: "no-store" });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch (e) {}
  return { status: r.status, json, raw: text.slice(0, 1800) };
}

async function opSampleEvent(days) {
  const p = qsBuild({ event: "subscription_purchased",
    start: new Date(Date.now() - days * 86400000).toISOString(), end: new Date().toISOString(),
    limit: 1, includes: "profile,properties,geo,referrer,meta" });
  const r = await fetch(`${OP_BASE}/api/export/events?${p}`, { headers: OP_HEADERS, cache: "no-store" });
  const t = await r.text();
  return { status: r.status, raw: t.slice(0, 3500) };
}

function seriesTotal(json) {
  if (!json) return 0;
  if (json.metrics && typeof json.metrics.sum === "number") return json.metrics.sum;
  const list = json.series || json.data || [];
  if (Array.isArray(list)) return list.reduce((a, s) => a + (s.metrics?.sum ?? s.total ?? s.value ?? 0), 0);
  return 0;
}

async function fetchOpenPanel(cfg) {
  const breakdown = cfg.breakdown || OP_BREAKDOWN;
  const days = cfg.days || OP_DAYS;
  if (!OP_CLIENT_ID || !OP_CLIENT_SECRET) {
    return { ok: false, error: "OP_CLIENT_ID / OP_CLIENT_SECRET not set", perLander: {}, totals: {}, debug: {} };
  }
  const out = { ok: true, perLander: {}, totals: {}, debug: {}, breakdownUsed: breakdown,
    window: { days, start: new Date(Date.now() - days * 86400000).toISOString(), end: new Date().toISOString() } };
  const specs = [
    ["signups", { name: "signup_completed", segment: "event" }],
    ["subs", { name: "subscription_purchased", segment: "event" }],
    ["revenue", { name: "subscription_purchased", segment: "property_sum", property: "amount" }],
  ];
  try {
    // Run every OpenPanel call concurrently (serverless has a short timeout).
    const [totalsRes, bdRes, sample] = await Promise.all([
      Promise.all(specs.map(([key, spec]) => opChart({ ...spec, days }).then((res) => [key, res]))),
      Promise.all(specs.map(([key, spec]) => opChart({ ...spec, breakdown, days }).then((res) => [key, res]))),
      opSampleEvent(days),
    ]);
    for (const [key, res] of totalsRes) {
      out.totals[key] = seriesTotal(res.json);
      out.debug[key] = { status: res.status, raw: res.raw };
    }
    for (const [key, res] of bdRes) {
      const list = (res.json && (res.json.series || res.json.data)) || [];
      out.debug[key + "_bd"] = { status: res.status, raw: res.raw };
      if (Array.isArray(list)) {
        for (const s of list) {
          const label = (s.name ?? s.label ?? (Array.isArray(s.breakdowns) ? s.breakdowns.join("/") : "") ?? "").toString();
          const val = s.metrics?.sum ?? s.total ?? s.value ?? (Array.isArray(s.data) ? s.data.reduce((a, b) => a + (b.count ?? b.value ?? 0), 0) : 0);
          const slug = label.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "").split(/[/?]/)[0] || label;
          if (slug) { (out.perLander[slug] = out.perLander[slug] || {})[key] = (out.perLander[slug][key] || 0) + val; }
        }
      }
    }
    out.debug.sampleEvent = sample;
  } catch (e) { out.ok = false; out.error = String(e); }
  return out;
}

export async function GET(request) {
  const u = new URL(request.url);
  const cfg = {
    breakdown: u.searchParams.get("bd") || null,
    days: Number(u.searchParams.get("days")) || OP_DAYS,
  };
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
  return Response.json({
    generatedAt: new Date().toISOString(),
    sources: {
      metabase: { ok: seo.ok, error: seo.error || null, count: (seo.rows || []).length },
      openpanel: { ok: op.ok, error: op.error || null, totals: op.totals || {}, breakdownUsed: op.breakdownUsed, window: op.window || null, debug: op.debug || null },
    },
    landers,
  }, { headers: { "Cache-Control": "no-store" } });
}
