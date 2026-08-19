// Live OpenPanel pull for the Refresh button.
//
// OpenPanel's report API (tRPC) only answers to a logged-in session, so the
// server needs a session cookie to read it. That cookie is stored in the
// OP_COOKIE env var (set once by an admin; re-paste when it expires). With it,
// any Refresh click pulls today's numbers live through the server. Without it,
// callers fall back to the baked snapshot in opSnapshot.js.

const OP_BASE = process.env.OP_BASE || "https://openpanel.secretdesires.ai";
const OP_COOKIE = process.env.OP_COOKIE || "";
const PROJECT = process.env.OP_PROJECT || "sd-ai-app";
const OP_DASHBOARD = process.env.OP_DASHBOARD || "seo-keyword-pages";

export function opCookiePresent() {
  return !!OP_COOKIE;
}

// Guaranteed-return fetch (never hangs the request).
function safeFetch(url, ms) {
  const ctl = new AbortController();
  const p = fetch(url, {
    headers: {
      cookie: OP_COOKIE,
      accept: "application/json",
      "user-agent": "sd-seo-command-center/1.0",
    },
    cache: "no-store",
    signal: ctl.signal,
  })
    .then(async (r) => ({ status: r.status, text: await r.text() }))
    .catch((e) => ({ status: 0, text: "error: " + String(e) }));
  let timer;
  const timeout = new Promise((res) => {
    timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} res({ status: 0, text: "timeout" }); }, ms || 15000);
  });
  return Promise.race([p.then((v) => { clearTimeout(timer); return v; }), timeout]);
}

function strip(o) {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === "object") {
    const n = {};
    for (const k in o) if (o[k] !== null && o[k] !== undefined) n[k] = strip(o[k]);
    return n;
  }
  return o;
}

async function trpc(path, inputObj) {
  const url = `${OP_BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: inputObj }))}`;
  const r = await safeFetch(url, 15000);
  let j = null; try { j = JSON.parse(r.text); } catch (e) {}
  if (!j || j.error || !j.result) {
    const msg = (j && j.error && j.error.json && j.error.json.message) || `HTTP ${r.status}`;
    throw new Error(String(msg).slice(0, 200));
  }
  return j.result.data.json;
}

async function reportList() {
  return await trpc("report.list", { dashboardId: OP_DASHBOARD, projectId: PROJECT });
}

// Raw diagnostic: hit report.list once and return status/timing/snippet.
export async function opProbe() {
  const started = Date.now();
  const url = `${OP_BASE}/api/trpc/report.list?input=${encodeURIComponent(JSON.stringify({ json: { dashboardId: OP_DASHBOARD, projectId: PROJECT } }))}`;
  const r = await safeFetch(url, 10000);
  return {
    cookieLen: OP_COOKIE.length,
    cookieHead: OP_COOKIE.slice(0, 24),
    status: r.status,
    ms: Date.now() - started,
    snippet: (r.text || "").slice(0, 300),
  };
}

async function chart(reportObj, range) {
  const cfg = strip(Object.assign({}, reportObj, { projectId: PROJECT }));
  if (range) cfg.range = range;
  const d = await trpc("chart.chart", cfg);
  return d.series || [];
}

function bucket(series) {
  const o = {};
  series.forEach((x) => { if (x.names && x.names.length > 1) o[x.names[1]] = x.metrics.sum; });
  return o;
}

// Pull per-lander (30d) + daily (6m) conversions, restricted to the SEO slugs.
export async function opPull(seoSlugs) {
  if (!OP_COOKIE) return null;
  const seoSet = new Set(seoSlugs || []);
  const reps = await reportList();
  const find = (n) => reps.find((r) => r.name === n);
  const regsR = find("Registrations by Landing Page");
  const subsR = find("Subscriptions by Landing Page");
  if (!regsR || !subsR) throw new Error("reports not found");
  const revR = JSON.parse(JSON.stringify(subsR));
  revR.series[0].segment = "property_sum";
  revR.series[0].property = "properties.amount";
  revR.metric = "sum";

  const [regs, subs, rev, regsD, subsD] = await Promise.all([
    chart(regsR), chart(subsR), chart(revR),
    chart(regsR, "6m"), chart(subsR, "6m"),
  ]);

  const R = bucket(regs), S = bucket(subs), V = bucket(rev);
  const perLander = {};
  [R, S, V].forEach((o) => Object.keys(o).forEach((k) => { perLander[k] = perLander[k] || {}; }));
  Object.keys(perLander).forEach((k) => {
    perLander[k] = { signups: R[k] || 0, subs: S[k] || 0, revenue: Math.round((V[k] || 0) * 100) / 100 };
  });

  const acc = {};
  const add = (series, key) => series.forEach((x) => {
    if (!x.names || x.names.length < 2 || !seoSet.has(x.names[1])) return;
    (x.data || []).forEach((p) => {
      const d = (p.date || "").slice(0, 10);
      if (!d || d < "2026-05-18") return;
      acc[d] = acc[d] || { regs: 0, subs: 0 };
      acc[d][key] += p.count || 0;
    });
  });
  add(regsD, "regs");
  add(subsD, "subs");
  const daily = Object.keys(acc).sort().map((d) => ({ date: d, regs: acc[d].regs, subs: acc[d].subs }));

  return { asOf: new Date().toISOString().slice(0, 10), perLander, daily };
}
