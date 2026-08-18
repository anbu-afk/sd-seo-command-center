"use client";
import { useEffect, useState } from "react";

const AZ = "#D62A5E", AZ2 = "#F46787", GREEN = "#2BA875", AMBER = "#C0851F", BLUE = "#7fbce8";
const MB_DASH = "https://geared-nemo.metabaseapp.com/dashboard/67?lander=";
const OP_DASH = "https://openpanel.secretdesires.ai/sd-ai/sd-ai-app/dashboards/seo-keyword-pages";
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
  const [trend, setTrend] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      setData(await r.json());
    } catch (e) {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch("/api/trend", { cache: "no-store" }).then((r) => r.json()).then(setTrend).catch(() => {});
  }, []);

  const conv = (l) => ({ signups: l.signups, subs: l.subs, revenue: l.revenue });
  const snapMeta = data && data.perLanderSnapshot ? data.perLanderSnapshot : null;
  const snapDate = (snapMeta && snapMeta.asOf) || "";

  const landers = data && data.landers ? data.landers : [];
  const mb = data && data.sources ? data.sources.metabase : null;
  const op = data && data.sources ? data.sources.openpanel : null;
  const opTot = op && op.totals ? op.totals : {};
  const totRev = opTot.revenue || 0;
  const totClicks = landers.reduce((a, l) => a + (l.clicks || 0), 0);
  // SEO-page conversions: summed from the per-lander attribution, not site-wide.
  const seoSignups = landers.reduce((a, l) => a + (conv(l).signups || 0), 0);
  const seoSubs = landers.reduce((a, l) => a + (conv(l).subs || 0), 0);
  const seoRev = landers.reduce((a, l) => a + (conv(l).revenue || 0), 0);
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
        <button onClick={load} style={{ background: AZ, color: "#fff", border: 0, borderRadius: 999, padding: "9px 18px", fontWeight: 600, cursor: "pointer" }}>{loading ? "Refreshing" : "Refresh"}</button>
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
        <Kpi label="Revenue (SEO, 30d)" value={"$" + Number(Math.round(seoRev * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} sub="from SEO landers" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill color={AMBER} n={off} label="landers rank for the wrong search terms" />
        <Pill color={AZ} n={dark} label="landers have gone dark (no fresh Google data)" />
      </div>

      <Trends trend={trend} />

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

      <p style={{ color: "#7A7A7A", fontSize: 12, marginTop: 16 }}>SEO columns (rank, clicks, impressions) are live from Metabase on every load. The pink Signups / Subs / Revenue columns are per-lander conversions from OpenPanel, attributed by each visitor&rsquo;s first-touch landing page over the last 30 days{snapDate ? `, as of ${snapDate}` : ""}. This is a first-touch estimate, not a hard link like the SEO clicks, so read it as directional. Most subscriptions trace back to the homepage rather than a niche lander, which is why per-lander sub counts are small.</p>

      {sel && <Detail l={sel} today={today} onClose={() => setSel(null)} />}
    </main>
  );
}

function LineChart({ rows, yKey, color, invert, label, sub, fmtVal }) {
  const pts = (rows || []).filter((r) => r[yKey] != null).map((r) => ({ x: r.date, y: Number(r[yKey]) }));
  const W = 600, H = 118, padT = 10, padB = 4, plotH = H - padT - padB;
  const box = { background: "#191919", border: "1px solid rgba(191,191,191,.1)", borderRadius: 12, padding: 14 };
  if (pts.length < 2) return <div style={box}><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px", color: "#7A7A7A", fontWeight: 700 }}>{label}</div><div style={{ color: "#666", fontSize: 12, marginTop: 10 }}>Not enough data yet.</div></div>;
  const ys = pts.map((p) => p.y); let mn = Math.min(...ys), mx = Math.max(...ys); if (mn === mx) { mn -= 1; mx += 1; }
  const n = pts.length;
  const xOf = (i) => (i / (n - 1)) * W;
  const yOf = (v) => { let nm = (v - mn) / (mx - mn); if (invert) nm = 1 - nm; return padT + (1 - nm) * plotH; };
  const line = pts.map((p, i) => (i ? "L" : "M") + xOf(i).toFixed(1) + " " + yOf(p.y).toFixed(1)).join(" ");
  const area = "M0 " + H + " " + pts.map((p, i) => "L" + xOf(i).toFixed(1) + " " + yOf(p.y).toFixed(1)).join(" ") + " L" + W + " " + H + " Z";
  const gid = "g_" + yKey;
  const last = pts[pts.length - 1].y, first = pts[0].y;
  const up = invert ? last < first : last > first; // improvement direction
  const fmt2 = fmtVal || ((v) => Number(v).toLocaleString("en-US"));
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px", color: "#7A7A7A", fontWeight: 700 }}>{label}</div>
          {sub && <div style={{ fontSize: 10.5, color: "#666", marginTop: 2 }}>{sub}</div>}</div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 18, fontWeight: 680, color, fontVariantNumeric: "tabular-nums" }}>{fmt2(last)}</span>
          <span style={{ fontSize: 11, marginLeft: 6, color: up ? GREEN : "#8A8A8A" }}>{up ? "▲" : "▼"}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, marginTop: 8, display: "block" }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient></defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6A6A6A", marginTop: 2 }}>
        <span>{pts[0].x.slice(5)}</span><span>{pts[pts.length - 1].x.slice(5)}</span>
      </div>
    </div>
  );
}

function Trends({ trend }) {
  const rows = trend && trend.rows ? trend.rows : [];
  const secTitle = { fontSize: 12, textTransform: "uppercase", letterSpacing: ".4px", color: "#7A7A7A", fontWeight: 700, margin: "0 0 4px" };
  const posFmt = (v) => "#" + Number(v).toFixed(1);
  const span = rows.length ? `${rows[0].d || rows[0].date} to ${rows[rows.length - 1].d || rows[rows.length - 1].date}` : "";
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={secTitle}>Trends across all SEO pages{span ? ` (${rows.length} days)` : ""}</div>
      <p style={{ color: "#7A7A7A", fontSize: 11.5, margin: "0 0 12px" }}>Every niche lander combined, one point per day. Google rank &amp; clicks are live from Metabase; registrations &amp; subscriptions are the OpenPanel first-touch snapshot{trend && trend.convAsOf ? ` (as of ${trend.convAsOf})` : ""}. On the rank chart, up means the average position is getting closer to #1.</p>
      {!trend ? <div style={{ color: "#666", fontSize: 13 }}>Loading trends…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <LineChart rows={rows} yKey="position" invert color={BLUE} label="Average Google rank" sub="lower position = better; up = improving" fmtVal={posFmt} />
          <LineChart rows={rows} yKey="clicks" color={AZ2} label="Clicks per day" sub="organic clicks, all SEO pages" />
          <LineChart rows={rows} yKey="regs" color={GREEN} label="Registrations per day" sub="signups from SEO pages" />
          <LineChart rows={rows} yKey="subs" color={AMBER} label="Subscriptions per day" sub="paid subs from SEO pages" />
        </div>
      )}
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
