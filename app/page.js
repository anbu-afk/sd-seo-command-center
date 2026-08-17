"use client";
import { useEffect, useState } from "react";

const AZ = "#D62A5E", AZ2 = "#F46787", GREEN = "#2BA875", AMBER = "#C0851F";
const MB_DASH = "https://geared-nemo.metabaseapp.com/dashboard/67?lander=";
const OP_DASH = "https://openpanel.secretdesires.ai/sd-ai/sd-ai-app/dashboards/seo-keyword-pages";
const card = { background: "#191919", border: "1px solid rgba(191,191,191,.12)", borderRadius: 14, padding: 16 };
const th = { textAlign: "right", padding: "8px 10px", fontSize: 11, letterSpacing: ".4px", textTransform: "uppercase", color: "#7A7A7A", borderBottom: "1px solid rgba(191,191,191,.12)", position: "sticky", top: 0, background: "#191919" };
const td = { textAlign: "right", padding: "8px 10px", borderBottom: "1px solid rgba(191,191,191,.08)", fontVariantNumeric: "tabular-nums" };
const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("en-US"));
const pos = (n) => (n == null ? "-" : "#" + Number(n).toFixed(1));

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      setData(await r.json());
    } catch (e) {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const landers = data && data.landers ? data.landers : [];
  const mb = data && data.sources ? data.sources.metabase : null;
  const op = data && data.sources ? data.sources.openpanel : null;
  const opTot = op && op.totals ? op.totals : {};
  const totSignups = opTot.signups || 0;
  const totSubs = opTot.subs || 0;
  const totRev = opTot.revenue || 0;
  const totClicks = landers.reduce((a, l) => a + (l.clicks || 0), 0);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: AZ2, fontWeight: 600 }}>Secret Desires Live</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>SEO Landers, Live Command Center</h1>
          <p style={{ color: "#AFAFAF", fontSize: 14, maxWidth: "64ch" }}>Search rankings joined with signups, subscriptions and revenue, per lander, live on each load. Click any lander for its details and to open it in Metabase or OpenPanel.</p>
        </div>
        <button onClick={load} style={{ background: AZ, color: "#fff", border: 0, borderRadius: 999, padding: "9px 18px", fontWeight: 600, cursor: "pointer" }}>{loading ? "Refreshing" : "Refresh"}</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
        <Status label="Metabase (SEO data)" ok={mb ? mb.ok : null} detail={mb && mb.ok ? mb.count + " landers" : (mb ? mb.error : "")} />
        <Status label="OpenPanel (conversions)" ok={op ? op.ok : null} detail={op && op.ok ? "connected" : (op ? op.error : "")} />
        {data && <span style={{ color: "#7A7A7A", fontSize: 12, alignSelf: "center" }}>as of {new Date(data.generatedAt).toLocaleString()}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <Kpi label="Clicks (28d)" value={fmt(totClicks)} />
        <Kpi label="Signups (30d)" value={totSignups ? fmt(totSignups) : "-"} />
        <Kpi label="Subscriptions (30d)" value={totSubs ? fmt(totSubs) : "-"} />
        <Kpi label="Revenue (30d)" value={totRev ? "$" + fmt(Math.round(totRev)) : "-"} />
      </div>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left" }}>Lander</th>
            <th style={th}>Avg rank</th>
            <th style={th}>Own kw rank</th>
            <th style={th}>Clicks 28d</th>
            <th style={th}>Impr 28d</th>
            <th style={th}>Signups 30d</th>
            <th style={th}>Subs 30d</th>
            <th style={th}>Revenue 30d</th>
          </tr></thead>
          <tbody>
            {landers.map((l) => (
              <tr key={l.slug} onClick={() => setSel(l)} style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#212121")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ ...td, textAlign: "left", color: "#EAEAEA", fontWeight: 500 }}>{l.name || l.slug}</td>
                <td style={td}>{pos(l.page_pos)}</td>
                <td style={{ ...td, color: l.primary_pos && l.page_pos && l.primary_pos > l.page_pos + 5 ? AMBER : "#AFAFAF" }}>{pos(l.primary_pos)}</td>
                <td style={td}>{fmt(l.clicks)}</td>
                <td style={td}>{fmt(l.impressions)}</td>
                <td style={{ ...td, color: l.signups ? "#EAEAEA" : "#555" }}>{l.signups == null ? "-" : fmt(l.signups)}</td>
                <td style={{ ...td, color: l.subs ? GREEN : "#555" }}>{l.subs == null ? "-" : fmt(l.subs)}</td>
                <td style={{ ...td, color: l.revenue ? GREEN : "#555" }}>{l.revenue == null ? "-" : "$" + fmt(Math.round(l.revenue))}</td>
              </tr>
            ))}
            {!landers.length && !loading && (<tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#7A7A7A" }}>No data yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      <p style={{ color: "#7A7A7A", fontSize: 12, marginTop: 16 }}>SEO columns come from Metabase (Google Search Console + Ahrefs). Signups, subscriptions and revenue come from OpenPanel, attributed to the landing page.</p>

      {sel && <Detail l={sel} onClose={() => setSel(null)} />}
    </main>
  );
}

function Detail({ l, onClose }) {
  const stats = [
    ["Average Google rank", pos(l.page_pos)],
    ["Rank for its own keyword", pos(l.primary_pos)],
    ["Clicks (28 days)", fmt(l.clicks)],
    ["Impressions (28 days)", fmt(l.impressions)],
    ["Click rate", l.ctr == null ? "-" : l.ctr + "%"],
    ["Traffic potential / yr", l.tp == null ? "-" : fmt(l.tp)],
    ["Signups (30 days)", l.signups == null ? "-" : fmt(l.signups)],
    ["Subscriptions (30 days)", l.subs == null ? "-" : fmt(l.subs)],
    ["Revenue (30 days)", l.revenue == null ? "-" : "$" + fmt(Math.round(l.revenue))],
  ];
  const linkBtn = { display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 600, fontSize: 13, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(191,191,191,.18)" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 92vw)", height: "100%", background: "#141414", borderLeft: "1px solid rgba(191,191,191,.14)", padding: 22, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{l.name || l.slug}</h2>
            <a href={"https://secretdesires.ai/" + l.slug} target="_blank" rel="noopener" style={{ color: AZ2, fontSize: 13, textDecoration: "none" }}>secretdesires.ai/{l.slug}</a>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "#AFAFAF", border: "1px solid rgba(191,191,191,.18)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(191,191,191,.12)", border: "1px solid rgba(191,191,191,.12)", borderRadius: 10, overflow: "hidden", margin: "18px 0" }}>
          {stats.map((s) => (
            <div key={s[0]} style={{ background: "#191919", padding: "11px 13px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".3px", color: "#7A7A7A", fontWeight: 600 }}>{s[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 660, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{s[1]}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".4px", color: "#7A7A7A", fontWeight: 700, margin: "6px 0 10px" }}>Open the full detail</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a href={MB_DASH + encodeURIComponent(l.slug)} target="_blank" rel="noopener" style={{ ...linkBtn, background: "rgba(74,147,204,.14)", color: "#7fbce8" }}>Open in Metabase (rankings, queries, opportunity)</a>
          <a href={OP_DASH} target="_blank" rel="noopener" style={{ ...linkBtn, background: "rgba(43,168,117,.14)", color: "#5fd3a6" }}>Open in OpenPanel (funnel, conversions, geo)</a>
        </div>
        <p style={{ color: "#7A7A7A", fontSize: 11.5, marginTop: 16 }}>Metabase opens the command center filtered to this niche. OpenPanel opens the SEO Keyword Pages dashboard.</p>
      </div>
    </div>
  );
}

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
function Kpi({ label, value }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".4px", color: "#7A7A7A", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 680, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
