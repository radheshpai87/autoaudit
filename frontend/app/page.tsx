"use client";

import { useEffect, useMemo, useState } from "react";

type IconName = "grid" | "disc" | "box" | "chart" | "camera" | "settings" | "search" | "bell" | "chevron" | "arrow" | "download" | "clock" | "check" | "alert" | "activity" | "more";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    disc: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m9 3h-6m-3 9v-6m-9-3h6"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5m-18 0v9l9 5 9-5V8m-9 5v9"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
    camera: <><path d="M14 5h-4l-2 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2-2Z"/><circle cx="12" cy="13" r="3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-1.2 2.1-1.5-.6a7 7 0 0 1-1.5.9l-.3 1.6h-2.4l-.3-1.6a7 7 0 0 1-1.5-.9l-1.5.6-1.2-2.1 1.2-1a7 7 0 0 1 0-1.8l-1.2-1 1.2-2.1 1.5.6a7 7 0 0 1 1.5-.9l.3-1.6h2.4l.3 1.6a7 7 0 0 1 1.5.9l1.5-.6 1.2 2.1-1.2 1a7 7 0 0 1 0 1.8Z"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5m-5 5V3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const initialRows = [
  { id: "BD-340V-88295", model: "Ventilated 340mm Sport Rotor", line: "Line 01 · High speed", time: "10:45:12", dtv: "5.1 µm", runout: "21 µm", roughness: "1.22 µm", status: "Passed" },
  { id: "BD-380C-77401", model: "Carbon-Silicon Carbide 380mm", line: "Line 03 · Precision", time: "10:44:30", dtv: "2.1 µm", runout: "9.2 µm", roughness: "0.72 µm", status: "Passed" },
  { id: "BD-340V-88292", model: "Ventilated 340mm Sport Rotor", line: "Line 01 · High speed", time: "10:43:02", dtv: "7.8 µm", runout: "28.2 µm", roughness: "1.52 µm", status: "Review" },
  { id: "BD-300S-99104", model: "Solid 300mm Urban Rotor", line: "Line 02 · Standard", time: "10:42:18", dtv: "12.4 µm", runout: "42.1 µm", roughness: "2.18 µm", status: "Failed" },
];

const navItems: { label: string; icon: IconName }[] = [
  { label: "Overview", icon: "grid" }, { label: "Inspections", icon: "disc" }, { label: "Production lines", icon: "box" }, { label: "Quality reports", icon: "chart" }, { label: "Plant cameras", icon: "camera" },
];

function TrendChart({ period }: { period: string }) {
  const points = period === "24 hours" ? "0,112 28,101 56,106 84,75 112,83 140,66 168,72 196,48 224,58 252,42 280,50 308,26 336,36 364,22 392,32 420,12" : "0,102 28,96 56,84 84,91 112,75 140,81 168,62 196,72 224,54 252,62 280,42 308,48 336,29 364,37 392,18 420,25";
  return <div className="chart-wrap"><div className="chart-y"><span>100%</span><span>99%</span><span>98%</span><span>97%</span></div><div className="chart-main"><div className="chart-grid"><i/><i/><i/><i/></div><svg viewBox="0 0 420 130" preserveAspectRatio="none" role="img" aria-label="Quality yield trend"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2e73e8" stopOpacity=".16"/><stop offset="1" stopColor="#2e73e8" stopOpacity="0"/></linearGradient></defs><polygon points={`0,130 ${points} 420,130`} fill="url(#fill)"/><polyline points={points} fill="none" stroke="#3478e5" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/><circle cx="364" cy="22" r="4" fill="white" stroke="#3478e5" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x"><span>06:00</span><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span></div></div></div>;
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [period, setPeriod] = useState("24 hours");
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState("");
  const filteredRows = useMemo(() => initialRows.filter((row) => `${row.id} ${row.model} ${row.line}`.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date()));
    updateClock();
    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function exportCsv() {
    const csv = ["Serial,Model,Line,Time,DTV,Runout,Roughness,Status", ...filteredRows.map((r) => `${r.id},${r.model},${r.line},${r.time},${r.dtv},${r.runout},${r.roughness},${r.status}`)].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "autoaudit-inspections.csv"; link.click(); URL.revokeObjectURL(link.href); setNotice("Inspection report downloaded"); window.setTimeout(() => setNotice(""), 2600);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => setActive("Overview")}><span className="brand-mark"><Icon name="disc" size={21}/></span><span className="brand-copy"><strong>autoaudit</strong><small>QUALITY OPERATIONS</small></span></a>
      <div className="plant-select"><span className="plant-dot"/><span><b>Plant North · 01</b><small>Manufacturing campus</small></span><Icon name="chevron" size={16}/></div>
      <div className="nav-heading">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.label} className={`nav-link ${active === item.label ? "selected" : ""}`} onClick={() => setActive(item.label)}><Icon name={item.icon}/><span>{item.label}</span>{item.label === "Inspections" && <span className="nav-count">12</span>}</button>)}</nav>
      <div className="nav-heading tools-heading">MANAGE</div><button className={`nav-link ${active === "Settings" ? "selected" : ""}`} onClick={() => setActive("Settings")}><Icon name="settings"/><span>Settings</span></button>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><Icon name="activity" size={17}/></div><div><strong>All systems normal</strong><span>Last sync 8 seconds ago</span></div><span className="online-dot"/></div><div className="user-card"><div className="avatar">AR</div><div className="user-meta"><b>Alex Rivera</b><span>Quality manager</span></div><Icon name="more" size={18}/></div></div>
    </aside>

    <section className="content-area" id="overview">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><label className="search-box"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inspections..."/><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up") }><Icon name="bell" size={18}/><i/></button><div className="top-divider"/><div className="top-date"><span className="date-label">{clock ? clock.split(", ").slice(0, 2).join(", ").toUpperCase() : "LOCAL PLANT TIME"}</span><b>{clock ? clock.split(", ").at(-1) : "--:--"} <span>IST</span></b></div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> PLANT OVERVIEW</div><h1>Good morning, Alex <span className="wave">✳</span></h1><p>Here’s what’s happening across your production floor today.</p></div><div className="heading-actions"><button className={`live-pill ${live ? "is-live" : ""}`} onClick={() => setLive(!live)}><span className="live-dot"/>{live ? "Live telemetry" : "Telemetry paused"}</button><button className="button button-secondary" onClick={exportCsv}><Icon name="download" size={16}/> Export report</button><button className="button button-primary" onClick={() => setActive("Inspections")}><span className="plus">+</span> New inspection</button></div></div>

        <div className="stat-grid">
          <article className="stat-card"><div className="stat-top"><span>PARTS INSPECTED</span><span className="stat-icon blue"><Icon name="disc" size={17}/></span></div><div className="stat-value">2,481 <span className="stat-change positive"><Icon name="arrow" size={12}/> 12.8%</span></div><div className="stat-foot">vs. previous 24 hours</div><div className="sparkline blue-spark"><svg viewBox="0 0 120 30" preserveAspectRatio="none"><polyline points="0,25 14,20 26,22 39,11 53,17 66,7 78,14 93,3 105,9 120,2"/></svg></div></article>
          <article className="stat-card"><div className="stat-top"><span>FIRST-PASS YIELD</span><span className="stat-icon green"><Icon name="check" size={17}/></span></div><div className="stat-value">98.6<span className="unit">%</span> <span className="stat-change positive"><Icon name="arrow" size={12}/> 0.4%</span></div><div className="stat-foot">Target: 98.0% <span className="foot-separator">·</span> On target</div><div className="sparkline green-spark"><svg viewBox="0 0 120 30" preserveAspectRatio="none"><polyline points="0,20 14,21 27,13 40,18 53,12 67,14 80,6 94,10 107,5 120,7"/></svg></div></article>
          <article className="stat-card"><div className="stat-top"><span>NEEDS REVIEW</span><span className="stat-icon amber"><Icon name="alert" size={17}/></span></div><div className="stat-value">18 <span className="stat-change negative">+3 today</span></div><div className="stat-foot">Across 3 production lines</div><div className="mini-bar"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>LINE AVAILABILITY</span><span className="stat-icon violet"><Icon name="activity" size={17}/></span></div><div className="stat-value">94.2<span className="unit">%</span> <span className="stat-change positive"><Icon name="arrow" size={12}/> 2.1%</span></div><div className="stat-foot">6 of 6 stations operational</div><div className="availability"><span/><span/><span/><span/><span/><span/></div></article>
        </div>

        <div className="middle-grid">
          <section className="panel yield-panel"><div className="panel-heading"><div><h2>Quality yield</h2><p>First-pass inspection rate over time</p></div><div className="chart-controls"><div className="legend"><i/> Yield</div><select aria-label="Select chart period" value={period} onChange={(e) => setPeriod(e.target.value)}><option>24 hours</option><option>7 days</option></select><button className="icon-button tiny" aria-label="More chart options"><Icon name="more" size={18}/></button></div></div><div className="yield-summary"><strong>98.6%</strong><span className="stat-change positive"><Icon name="arrow" size={12}/> 0.4%</span><small>compared to prior period</small></div><TrendChart period={period}/></section>
          <section className="panel lines-panel"><div className="panel-heading"><div><h2>Production lines</h2><p>Live station performance</p></div><button className="text-link" onClick={() => setActive("Production lines")}>View all <Icon name="arrow" size={13}/></button></div><div className="line-list">
            {[{n:"01",name:"High-speed cell",type:"Ventilated · HT250",rate:"98.9",color:"blue",bars:[60,70,55,82,65,91,74,85,63,96,70,87]},{n:"02",name:"Standard cell",type:"Solid · HT200",rate:"97.4",color:"green",bars:[55,73,63,80,59,88,72,76,65,85,68,79]},{n:"03",name:"Precision lab cell",type:"Carbon ceramic",rate:"99.8",color:"violet",bars:[76,84,68,93,78,87,72,97,81,91,76,100]}].map((line) => <div className="line-row" key={line.n}><span className={`line-number ${line.color}`}>{line.n}</span><div className="line-detail"><b>{line.name}</b><small>{line.type}</small></div><div className="line-bars">{line.bars.map((bar, i) => <i key={i} style={{ height: `${bar}%` }}/>)}</div><strong className="line-rate">{line.rate}%</strong><span className="line-status"/></div>)}
          </div><div className="lines-footer"><span><i/> All lines operational</span><span>Updated just now</span></div></section>
        </div>

        <section className="panel inspections-panel"><div className="panel-heading inspection-heading"><div><h2>Recent inspections</h2><p>The latest parts through your quality gate</p></div><div className="inspection-actions"><label className="table-search"><Icon name="search" size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by serial or model"/></label><button className="button button-secondary small-button" onClick={exportCsv}><Icon name="download" size={15}/> Export</button><button className="text-link" onClick={() => setActive("Inspections")}>View all <Icon name="arrow" size={13}/></button></div></div><div className="table-scroll"><table><thead><tr><th>PART / SERIAL</th><th>PRODUCTION LINE</th><th>TIME</th><th>DTV</th><th>LATERAL RUNOUT</th><th>SURFACE ROUGHNESS</th><th>RESULT</th><th/></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id}><td><div className="part-id"><span className="part-glyph"><Icon name="disc" size={15}/></span><span><b>{row.id}</b><small>{row.model}</small></span></div></td><td>{row.line}</td><td className="mono">{row.time}</td><td className="mono">{row.dtv}</td><td className="mono">{row.runout}</td><td className="mono">{row.roughness}</td><td><span className={`result-badge ${row.status.toLowerCase()}`}><i/>{row.status}</span></td><td><button className="icon-button row-more" aria-label={`More options for ${row.id}`}><Icon name="more" size={17}/></button></td></tr>)}</tbody></table>{filteredRows.length === 0 && <div className="empty-state">No inspections match “{query}”.</div>}</div><div className="table-footer"><span>Showing <b>{filteredRows.length}</b> of <b>2,481</b> inspections</span><button className="text-link" onClick={() => setActive("Inspections")}>Open inspection log <Icon name="arrow" size={13}/></button></div></section>
        <footer className="page-footer"><span>AutoAudit <span>·</span> Manufacturing quality, in focus</span><span><Icon name="clock" size={13}/> Data refreshed 8 seconds ago</span></footer>
      </div>
    </section>
    {notice && <div className="toast"><span className="toast-check"><Icon name="check" size={15}/></span>{notice}</div>}
  </main>;
}
