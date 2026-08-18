"use client";
import { useEffect, useState } from "react";

const AZ = "#D62A5E", AZ2 = "#F46787", GREEN = "#2BA875", AMBER = "#C0851F", BLUE = "#7fbce8";
const MB_DASH = "https://geared-nemo.metabaseapp.com/dashboard/67?lander=";
const OP_DASH = "https://openpanel.secretdesires.ai/sd-ai/sd-ai-app/dashboards/seo-keyword-pages";
const APP_URL = "https://seo-landers-live-anbu-1077s-projects.vercel.app/";

// One-click bookmarklet: run it from a logged-in OpenPanel tab. It pulls the
// Registrations/Subscriptions/Revenue-by-landing-page reports via OpenPanel's
// own API (using your session), copies the snapshot to your clipboard, and
// bounces back to the command center with the fresh numbers applied.
const BOOKMARKLET = "javascript:(async()=>{try{var P='sd-ai-app';var g=function(u){return fetch(u,{credentials:'include'}).then(function(r){return r.json()})};var strip=function(o){if(Array.isArray(o))return o.map(strip);if(o&&typeof o==='object'){var n={};for(var k in o){if(o[k]!=null)n[k]=strip(o[k])}return n}return o};var rl=await g('/api/trpc/report.list?input='+encodeURIComponent(JSON.stringify({json:{dashboardId:'seo-keyword-pages',projectId:P}})));var reps=rl.result.data.json;var find=function(n){return reps.filter(function(r){return r.name===n})[0]};var chart=async function(rep){var cfg=strip(Object.assign({},rep,{projectId:P}));var d=await g('/api/trpc/chart.chart?input='+encodeURIComponent(JSON.stringify({json:cfg})));return d.result.data.json.series};var subsR=find('Subscriptions by Landing Page');var regsR=find('Registrations by Landing Page');var revR=JSON.parse(JSON.stringify(subsR));revR.series[0].segment='property_sum';revR.series[0].property='properties.amount';revR.metric='sum';var res=await Promise.all([chart(regsR),chart(subsR),chart(revR)]);var b=function(s){var o={};s.forEach(function(x){if(x.names.length>1)o[x.names[1]]=x.metrics.sum});return o};var R=b(res[0]),S=b(res[1]),V=b(res[2]);var per={};[R,S,V].forEach(function(o){Object.keys(o).forEach(function(s){per[s]=per[s]||{}})});Object.keys(per).forEach(function(s){per[s]={signups:R[s]||0,subs:S[s]||0,revenue:Math.round((V[s]||0)*100)/100}});var snap={asOf:new Date().toISOString().slice(0,10),window:'30d',perLander:per};var js=JSON.stringify(snap);try{await navigator.clipboard.writeText(js)}catch(e){}location.href='" + APP_URL + "#op='+encodeURIComponent(js)}catch(e){alert('OpenPanel refresh failed: '+e.message+'. Make sure you are on an OpenPanel tab and logged in.')}})();";
const card = { background: "#191919", border: "1px solid rgba(191,191,191,.12)", borderRadius: 14, padding: 16 };
const th = { textAlign: "right", padding: "8px 10px", fontSize: 11, letterSpacing: ".4px", textTransform: "uppercase", color: "#7A7A7A", borderBottom: "1px solid rgba(191,191,191,.12)", position: "sticky", top: 0, background: "#191919" };
const td = { textAlign: "right", padding: "8px 10px", borderBottom: "1px solid rgba(191,191,191,.08)", fontVariantNumeric: "tabular-nums" };
const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("en-US"));
const pos = (n) => (n == null ? "-" : "#" + Number(n).toFixed(1));

// Is this lander off-target (ranks far worse for its own keyword than overall)?
const isOffTarget = (l) => l.primary_pos && l.page_pos && l.primary_pos > l.page_pos + 5;
// Is it dark (no fresh GSC data)?
function isDark(l, today) {
  if (!l.latest) return (l.clicks || 0) === 0;
  const d = new Date(l.latest); if (isNaN(d)) return false;
  return (today - d) / 86400000 > 14;
}
// Build a plain-English action plan from the lander's own metrics.
function actionPlan(l, today) {
  const out = [];
  if (isDark(l, today)) out.push(["Reindex now", AZ, "This page has gone dark — Google has no fresh data for it. Check it returns HTTP 200, is still indexed, and resubmit it in Search Console. Biggest silent losses hide here."]);
  if (isOffTarget(l)) out.push(["Win your own keyword", AMBER, `You rank about ${pos(l.page_pos)} overall but only ${pos(l.primary_pos)} for “${l.name}”. Most traffic is off-target. Tighten the title, H1 and intro around the exact money term.`]);
  if (l.striking) out.push(["Striking distance", BLUE, "This sits just off page one. A small push — internal links from stronger pages, a fresher date, a sharper title — can move it onto page one where clicks jump."]);
  if ((l.impressions || 0) < 150 && !isDark(l, today)) out.push(["Thin demand", "#9A8Fb5", "Very few impressions. Either demand is low or the page is weakly indexed. Consider merging it into a stronger sibling, or replacing it with a higher-volume term."]);
  if ((l.clicks || 0) > 100 && isOffTarget(l)) out.push(["Top prize", GREEN, "High traffic already, but it leaks to stray queries. Capturing its own keyword here is the single highest-value fix in the set."]);
  if (!out.length) out.push(["Healthy", GREEN, "This page captures its keyword and pulls steady traffic. Keep it fresh and protect the ranking; use it as an internal-link source to lift weaker pages."]);
  return out;
}

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [override, setOverride] = useState(null);
  const [showRefresh, setShowRefresh] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      setData(await r.json());
    } catch (e) {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Ingest a fresh snapshot from the bookmarklet (URL hash), else from localStorage.
  useEffect(() => {
    try {
      let snap = null;
      if (typeof window !== "undefined" && window.location.hash.indexOf("#op=") === 0) {
        snap = JSON.parse(decodeURIComponent(window.location.hash.slice(4)));
        window.localStorage.setItem("opSnapshot", JSON.stringify(snap));
        window.history.replaceState(null, "", window.location.pathname);
      } else if (typeof window !== "undefined") {
        const s = window.localStorage.getItem("opSnapshot");
        if (s) snap = JSON.parse(s);
      }
      if (snap && snap.perLander) setOverride(snap);
    } catch (e) {}
  }, []);

  const perOv = override && override.perLander ? override.perLander : null;
  const conv = (l) => (perOv && perOv[l.slug]) ? perOv[l.slug] : { signups: l.signups, subs: l.subs, revenue: l.revenue };
  const snapMeta = data && data.perLanderSnapshot ? data.perLanderSnapshot : null;
  const snapDate = (override && override.asOf) || (snapMeta && snapMeta.asOf) || "";
  function clearOverride() { try { window.localStorage.removeItem("opSnapshot"); } catch (e) {} setOverride(null); }
  function applyPasted(text) {
    try { const snap = JSON.parse(text); if (snap && snap.perLander) { window.localStorage.setItem("opSnapshot", JSON.stringify(snap)); setOverride(snap); setShowRefresh(false); } else alert("That does not look like a snapshot."); }
    catch (e) { alert("Could not read that JSON: " + e.message); }
  }

  const landers = data && data.landers ? data.landers : [];
  const mb = data && data.sources ? data.sources.metabase : null;
  const op = data && data.sources ? data.sources.openpanel : null;
  const opTot = op && op.totals ? op.totals : {};
  const totRev = opTot.revenue || 0;
  const totClicks = landers.reduce((a, l) => a + (l.clicks || 0), 0);
  // SEO-page conversions: summed from the per-lander attribution, not site-wide.
  const seoSignups = landers.reduce((a, l) => a + (conv(l).signups || 0), 0);
  const seoSubs = landers.reduce((a, l) => a + (conv(l).subs || 0), 0);
  const today = data ? new Date(data.generatedAt) : new Date();
  const dark = landers.filter((l) => isDark(l, today)).length;
  const off = landers.filter((l) => isOffTarget(l)).length;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: AZ2, fontWeight: 600 }}>Secret Desires Live</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>SEO Landers, Live Command Center</h1>
          <p style={{ color: "#AFAFAF", fontSize: 14, maxWidth: "66ch" }}>Search rankings from Metabase, joined with per-lander signups, subscriptions and revenue attributed by OpenPanel. Click any lander for its weekly trend, the searches that find it, and exactly what to do next.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowRefresh(true)} style={{ background: "transparent", color: AZ2, border: "1px solid rgba(244,103,135,.4)", borderRadius: 999, padding: "9px 16px", fontWeight: 600, cursor: "pointer" }}>Refresh OpenPanel numbers</button>
          <button onClick={load} style={{ background: AZ, color: "#fff", border: 0, borderRadius: 999, padding: "9px 18px", fontWeight: 600, cursor: "pointer" }}>{loading ? "Refreshing" : "Refresh SEO"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
        <Status label="Metabase (SEO data)" ok={mb ? mb.ok : null} detail={mb && mb.ok ? mb.count + " landers" : (mb ? mb.error : "")} />
        <Status label="OpenPanel (conversions)" ok={op ? op.ok : null} detail={op && op.ok ? "connected" : (op ? op.error : "")} />
        {data && <span style={{ color: "#7A7A7A", fontSize: 12, alignSelf: "center" }}>as of {new Date(data.generatedAt).toLocaleString()}{data.cached ? " (cached)" : ""}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        <Kpi label="Clicks (28d)" value={fmt(totClicks)} sub={landers.length + " SEO landers"} />
        <Kpi label="Signups (SEO, 30d)" value={fmt(seoSignups)} sub="from SEO landers" />
        <Kpi label="Subscriptions (SEO, 30d)" value={fmt(seoSubs)} sub="from SEO landers" />
        <Kpi label="Revenue (30d)" value={totRev ? "$" + fmt(Math.round(totRev)) : "-"} sub="site-wide, OpenPanel" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill color={AMBER} n={off} label="landers rank for the wrong search terms" />
        <Pill color={AZ} n={dark} label="landers have gone dark (no fresh Google data)" />
      </div>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left" }}>Lander</th>
            <th style={th}>Avg rank</th>
            <th style={th}>Own kw rank</th>
            <th style={th}>Match</th>
            <th style={th}>Clicks 28d</th>
            <th style={th}>Impr 28d</th>
            <th style={th}>Click rate</th>
            <th style={{ ...th, color: AZ2 }}>Signups 30d</th>
            <th style={{ ...th, color: AZ2 }}>Subs 30d</th>
            <th style={{ ...th, color: AZ2 }}>Revenue 30d</th>
            <th style={{ ...th, textAlign: "center" }}>Detail</th>
          </tr></thead>
          <tbody>
            {landers.map((l) => {
              const d = isDark(l, today), o = isOffTarget(l);
              const c = conv(l);
              return (
                <tr key={l.slug} onClick={() => setSel({ ...l, ...c })} style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#212121")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...td, textAlign: "left", color: "#EAEAEA", fontWeight: 500 }}>{l.name || l.slug}</td>
                  <td style={td}>{pos(l.page_pos)}</td>
                  <td style={{ ...td, color: o ? AMBER : "#AFAFAF" }}>{pos(l.primary_pos)}</td>
                  <td style={{ ...td, textAlign: "center" }}>
                    {d ? <Tag c={AZ}>Dark</Tag> : o ? <Tag c={AMBER}>Off target</Tag> : <Tag c={GREEN}>On target</Tag>}
                  </td>
                  <td style={td}>{fmt(l.clicks)}</td>
                  <td style={td}>{fmt(l.impressions)}</td>
                  <td style={td}>{l.ctr == null ? "-" : l.ctr + "%"}</td>
                  <td style={{ ...td, color: c.signups ? "#EAEAEA" : "#555" }}>{c.signups ? fmt(c.signups) : "0"}</td>
                  <td style={{ ...td, color: c.subs ? "#EAEAEA" : "#555" }}>{c.subs ? fmt(c.subs) : "0"}</td>
                  <td style={{ ...td, color: c.revenue ? GREEN : "#555" }}>{c.revenue ? "$" + Number(c.revenue).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "-"}</td>
                  <td style={{ ...td, textAlign: "center", color: "#7A7A7A" }}>→</td>
                </tr>
              );
            })}
            {!landers.length && !loading && (<tr><td colSpan={11} style={{ ...td, textAlign: "center", color: "#7A7A7A" }}>No data yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      <p style={{ color: "#7A7A7A", fontSize: 12, marginTop: 16 }}>SEO columns (rank, clicks, impressions) are live from Metabase on every load. The pink Signups / Subs / Revenue columns are per-lander conversions from OpenPanel, attributed by each visitor&rsquo;s first-touch landing page over the last 30 days{snapDate ? `, as of ${snapDate}` : ""}{override ? " (your last refresh)" : ""}. This is a first-touch estimate, not a hard link like the SEO clicks, so read it as directional. Most subscriptions trace back to the homepage rather than a niche lander, which is why per-lander sub counts are small. Use &ldquo;Refresh OpenPanel numbers&rdquo; above to pull the latest.</p>

      {showRefresh && <RefreshModal onClose={() => setShowRefresh(false)} onApply={applyPasted} onClear={clearOverride} hasOverride={!!override} snapDate={snapDate} />}

      {sel && <Detail l={sel} today={today} onClose={() => setSel(null)} />}
    </main>
  );
}

function RefreshModal({ onClose, onApply, onClear, hasOverride, snapDate }) {
  const [paste, setPaste] = useState("");
  const step = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 };
  const num = { flex: "0 0 22px", height: 22, borderRadius: 999, background: AZ, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "#161616", border: "1px solid rgba(191,191,191,.16)", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Refresh OpenPanel numbers</h2>
          <button onClick={onClose} style={{ background: "transparent", color: "#AFAFAF", border: "1px solid rgba(191,191,191,.18)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        <p style={{ color: "#AFAFAF", fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>The per-lander numbers come from OpenPanel, which only your own login can read. This one-click tool pulls the latest and applies it here. One-time setup: drag the button below into your bookmarks bar.</p>

        <div style={step}>
          <div style={num}>1</div>
          <div style={{ fontSize: 13, color: "#EAEAEA" }}>
            Drag this into your bookmarks bar (once):&nbsp;
            <a ref={(el) => { if (el) el.setAttribute("href", BOOKMARKLET); }} onClick={(e) => e.preventDefault()}
               style={{ display: "inline-block", background: AZ, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 12.5, padding: "6px 12px", borderRadius: 8, cursor: "grab" }}>
              ⟳ Refresh SD OpenPanel
            </a>
          </div>
        </div>
        <div style={step}>
          <div style={num}>2</div>
          <div style={{ fontSize: 13, color: "#EAEAEA" }}>Open OpenPanel and make sure you are logged in:&nbsp;
            <a href={OP_DASH} target="_blank" rel="noopener" style={{ color: AZ2 }}>open OpenPanel →</a>
          </div>
        </div>
        <div style={step}>
          <div style={num}>3</div>
          <div style={{ fontSize: 13, color: "#EAEAEA" }}>On that OpenPanel tab, click the bookmark. It pulls the latest numbers and brings you back here with them applied.</div>
        </div>

        <div style={{ borderTop: "1px solid rgba(191,191,191,.12)", margin: "16px 0", paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: "#7A7A7A", marginBottom: 6 }}>Fallback: if the bookmark copied the numbers to your clipboard but did not bring them over, paste them here and Apply.</div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"asOf":"...","perLander":{...}}'
            style={{ width: "100%", minHeight: 70, background: "#0f0f0f", color: "#C6C6C6", border: "1px solid rgba(191,191,191,.16)", borderRadius: 8, padding: 10, fontSize: 12, fontFamily: "monospace", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => onApply(paste)} disabled={!paste.trim()} style={{ background: paste.trim() ? AZ : "#333", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: paste.trim() ? "pointer" : "default" }}>Apply pasted numbers</button>
            {hasOverride && <button onClick={onClear} style={{ background: "transparent", color: "#AFAFAF", border: "1px solid rgba(191,191,191,.18)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Reset to baked snapshot</button>}
            <span style={{ fontSize: 11.5, color: "#7A7A7A" }}>Showing: {snapDate || "baked"}{hasOverride ? " (your refresh)" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ l, today, onClose }) {
  const [niche, setNiche] = useState(null);
  const [nloading, setNloading] = useState(true);
  useEffect(() => {
    let alive = true;
    setNloading(true); setNiche(null);
    fetch("/api/niche?slug=" + encodeURIComponent(l.slug), { cache: "no-store" })
      .then((r) => r.json()).then((j) => { if (alive) { setNiche(j); setNloading(false); } })
      .catch(() => { if (alive) setNloading(false); });
    return () => { alive = false; };
  }, [l.slug]);

  const stats = [
    ["Average Google rank", pos(l.page_pos)],
    ["Rank for its own keyword", pos(l.primary_pos)],
    ["Clicks (28 days)", fmt(l.clicks)],
    ["Impressions (28 days)", fmt(l.impressions)],
    ["Click rate", l.ctr == null ? "-" : l.ctr + "%"],
    ["Traffic potential / yr", l.tp == null ? "-" : fmt(l.tp)],
  ];
  const plan = actionPlan(l, today);
  const weekly = niche && niche.weekly && niche.weekly.rows ? niche.weekly.rows : [];
  const queries = niche && niche.queries && niche.queries.rows ? niche.queries.rows : [];
  const maxW = Math.max(1, ...weekly.map((w) => Number(w.clicks) || 0));
  const maxQ = Math.max(1, ...queries.map((q) => Number(q.impressions) || 0));
  const linkBtn = { display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 600, fontSize: 13, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(191,191,191,.18)" };
  const secTitle = { fontSize: 12, textTransform: "uppercase", letterSpacing: ".4px", color: "#7A7A7A", fontWeight: 700, margin: "22px 0 10px" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 94vw)", height: "100%", background: "#141414", borderLeft: "1px solid rgba(191,191,191,.14)", padding: 22, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{l.name || l.slug}</h2>
            <a href={"https://secretdesires.ai/" + l.slug} target="_blank" rel="noopener" style={{ color: AZ2, fontSize: 13, textDecoration: "none" }}>secretdesires.ai/{l.slug}</a>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "#AFAFAF", border: "1px solid rgba(191,191,191,.18)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>

        {/* What to do */}
        <div style={secTitle}>What to do for this niche</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.map((p, i) => (
            <div key={i} style={{ background: "#191919", border: "1px solid rgba(191,191,191,.1)", borderLeft: `3px solid ${p[1]}`, borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: p[1] }}>{p[0]}</div>
              <div style={{ fontSize: 12.5, color: "#C6C6C6", marginTop: 3, lineHeight: 1.45 }}>{p[2]}</div>
            </div>
          ))}
        </div>

        {/* At a glance */}
        <div style={secTitle}>This niche at a glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(191,191,191,.12)", border: "1px solid rgba(191,191,191,.12)", borderRadius: 10, overflow: "hidden" }}>
          {stats.map((s) => (
            <div key={s[0]} style={{ background: "#191919", padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".3px", color: "#7A7A7A", fontWeight: 600 }}>{s[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 660, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{s[1]}</div>
            </div>
          ))}
        </div>

        {/* Conversions */}
        <div style={secTitle}>Conversions from this page (OpenPanel, 30 days)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(191,191,191,.12)", border: "1px solid rgba(191,191,191,.12)", borderRadius: 10, overflow: "hidden" }}>
          {[["Signups", l.signups ? fmt(l.signups) : "0", "#EAEAEA"], ["Subscriptions", l.subs ? fmt(l.subs) : "0", "#EAEAEA"], ["Revenue", l.revenue ? "$" + Number(l.revenue).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "$0", GREEN]].map((s) => (
            <div key={s[0]} style={{ background: "#191919", padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".3px", color: "#7A7A7A", fontWeight: 600 }}>{s[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 660, marginTop: 3, fontVariantNumeric: "tabular-nums", color: s[2] }}>{s[1]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#7A7A7A", marginTop: 7, lineHeight: 1.45 }}>Attributed by each visitor&rsquo;s first-touch landing page (a first-touch estimate, not a hard link). Snapshot from OpenPanel&rsquo;s own reports.</div>

        {/* Clicks per week */}
        <div style={secTitle}>Clicks per week (last 12 weeks)</div>
        {nloading ? <Skel /> : weekly.length ? (
          <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130, background: "#191919", border: "1px solid rgba(191,191,191,.1)", borderRadius: 10, padding: "22px 12px 8px" }}>
            {weekly.map((w, i) => {
              const c = Number(w.clicks) || 0;
              return (
                <div key={i} title={`Week of ${(w.wk || "").slice(0, 10)}: ${fmt(c)} clicks, ${fmt(w.impressions)} impressions`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                  <div style={{ fontSize: 9.5, color: "#AFAFAF", marginBottom: 3, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{c || ""}</div>
                  <div style={{ width: "100%", background: AZ, opacity: .4 + .6 * (c / maxW), borderRadius: "3px 3px 0 0", height: `${Math.max(2, (c / maxW) * 100)}%` }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#7A7A7A", marginTop: 5 }}>
            <span>week of {(weekly[0].wk || "").slice(0, 10)}</span>
            <span>peak {fmt(maxW)} clicks/wk</span>
            <span>week of {(weekly[weekly.length - 1].wk || "").slice(0, 10)}</span>
          </div>
          </>
        ) : <Empty>No weekly Google data for this page (it may be dark).</Empty>}

        {/* What people search */}
        <div style={secTitle}>What people search to find it</div>
        {nloading ? <Skel /> : queries.length ? (
          <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {queries.map((q, i) => (
              <div key={i} style={{ background: "#191919", border: "1px solid rgba(191,191,191,.08)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, alignItems: "center" }}>
                  <span style={{ color: "#E4E4E4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: q.is_target ? GREEN : AMBER, marginRight: 7 }} />
                    {q.query}
                  </span>
                  <span style={{ color: "#8A8A8A", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(q.impressions)} impr · {pos(q.position)}</span>
                </div>
                <div style={{ height: 3, background: "rgba(191,191,191,.12)", borderRadius: 3, marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${(Number(q.impressions) / maxQ) * 100}%`, background: q.is_target ? GREEN : AZ2, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#7A7A7A", marginTop: 8, display: "flex", gap: 14 }}>
            <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: GREEN, marginRight: 6 }} />its own keyword</span>
            <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: AMBER, marginRight: 6 }} />stray / off-target</span>
          </div>
          </>
        ) : <Empty>No query data for this page yet.</Empty>}

        {/* Deep links */}
        <div style={secTitle}>Open the full detail</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a href={MB_DASH + encodeURIComponent(l.slug)} target="_blank" rel="noopener" style={{ ...linkBtn, background: "rgba(74,147,204,.14)", color: BLUE }}>Open in Metabase — rankings, queries, opportunity</a>
          <a href={OP_DASH} target="_blank" rel="noopener" style={{ ...linkBtn, background: "rgba(43,168,117,.14)", color: "#5fd3a6" }}>Open in OpenPanel — funnel, conversions, geo</a>
        </div>
        <p style={{ color: "#7A7A7A", fontSize: 11.5, marginTop: 14 }}>Metabase opens the command center filtered to this niche. OpenPanel opens the SEO Keyword Pages dashboard where subscriptions and revenue are attributed to the landing page.</p>
      </div>
    </div>
  );
}

function Tag({ c, children }) {
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: c, background: c + "22", border: "1px solid " + c + "55", borderRadius: 999, padding: "2px 9px" }}>{children}</span>;
}
function Pill({ color, n, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#191919", border: "1px solid rgba(191,191,191,.12)", borderRadius: 10, padding: "8px 13px", fontSize: 13 }}>
      <b style={{ color, fontSize: 16 }}>{n}</b><span style={{ color: "#AFAFAF" }}>{label}</span>
    </span>
  );
}
function Skel() { return <div style={{ height: 90, background: "#191919", border: "1px solid rgba(191,191,191,.1)", borderRadius: 10, opacity: .5 }} />; }
function Empty({ children }) { return <div style={{ background: "#191919", border: "1px solid rgba(191,191,191,.1)", borderRadius: 10, padding: "14px", color: "#7A7A7A", fontSize: 12.5 }}>{children}</div>; }

function Status({ label, ok, detail }) {
  const color = ok ? GREEN : "#E0556F";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#191919", border: "1px solid rgba(191,191,191,.12)", borderRadius: 999, padding: "6px 12px", fontSize: 12.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: ok == null ? "#7A7A7A" : color }} />
      <b style={{ fontWeight: 600 }}>{label}</b>
      <span style={{ color: "#AFAFAF" }}>{detail || ""}</span>
    </span>
  );
}
function Kpi({ label, value, sub }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px", color: "#7A7A7A", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 680, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6A6A6A", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
