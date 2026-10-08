"use client";

import { useId, useState } from "react";
import type { MachineHeatmapData } from "../../lib/api";

export function RotorHeatmap({ machineHeatmaps }: { machineHeatmaps: Record<string, MachineHeatmapData> }) {
  const machines = Object.entries(machineHeatmaps);
  const svgId = useId().replace(/:/g, "");
  const [selectedCode, setSelectedCode] = useState("");
  const selected = machineHeatmaps[selectedCode] ?? machines.find(([, data]) => data.bins.length > 0)?.[1] ?? machines[0]?.[1];

  if (!machines.length) return <div className="aa-backend-empty">The backend has not returned machine heatmap data.</div>;

  return <section className="panel aa-rotor-heatmap" aria-label="Backend machine defect heatmap">
    <div className="aa-section-heading"><div><h2>Circular Polar Defect Heatmap</h2><p>Spatial defect clusters aggregated by machine from backend history</p></div><label className="aa-machine-picker"><span>Machine</span><select value={selected?.machine_code ?? ""} onChange={(event) => setSelectedCode(event.target.value)} aria-label="Select heatmap machine">{machines.map(([code, data]) => <option key={code} value={code}>{code} · {data.station}</option>)}</select></label></div>
    {selected && <div className="aa-heatmap-layout">
      <div className="aa-rotor-wrap"><svg className="aa-rotor-svg" viewBox="0 0 320 320" role="img" aria-label={`${selected.machine_code} defect heatmap rotor, ${selected.total_defects} detected defect points`}>
        <defs>
          <radialGradient id={`${svgId}-rotor-metal`} cx="38%" cy="32%"><stop offset="0" stopColor="#fff"/><stop offset=".48" stopColor="#f8fafc"/><stop offset=".82" stopColor="#d9e0e7"/><stop offset="1" stopColor="#b8c2ce"/></radialGradient>
          <radialGradient id={`${svgId}-heat-glow`}><stop offset="0" stopColor="#ff2d2d" stopOpacity=".9"/><stop offset=".38" stopColor="#ff6b35" stopOpacity=".68"/><stop offset=".72" stopColor="#ffb020" stopOpacity=".32"/><stop offset="1" stopColor="#ffcf6e" stopOpacity="0"/></radialGradient>
          <clipPath id={`${svgId}-rotor-clip`}><circle cx="160" cy="160" r="148"/></clipPath>
        </defs>
        <circle cx="160" cy="160" r="150" fill="#f1f5f9" stroke="#334155" strokeWidth="2"/>
        <circle cx="160" cy="160" r="142" fill={`url(#${svgId}-rotor-metal)`} stroke="#94a3b8" strokeWidth="1.5"/>
        <circle cx="160" cy="160" r="118" fill="none" stroke="#aab5c2" strokeWidth="1"/>
        <circle cx="160" cy="160" r="91" fill="none" stroke="#b6c0cb" strokeWidth="1" strokeDasharray="3 4"/>
        <g clipPath={`url(#${svgId}-rotor-clip)`}>{selected.bins.map((bin, index) => {
          const cx = 160 + bin.dx * 280;
          const cy = 160 + bin.dy * 280;
          const radius = Math.max(12, Math.min(42, bin.intensity * 26));
          return <circle key={`${bin.top_process_code}-${bin.clock_hour}-${bin.defect_type}-${index}`} cx={cx} cy={cy} r={radius} fill={`url(#${svgId}-heat-glow)`} opacity={Math.min(.9, Math.max(.2, bin.intensity + .2))} className="aa-heat-bin" tabIndex={0} role="img" aria-label={`${bin.defect_type}: ${bin.defect_count} detections at ${bin.clock_hour.toFixed(1)} o'clock`}><title>{`${bin.defect_type}: ${bin.defect_count} hits at ${bin.clock_hour.toFixed(1)} o'clock (${bin.top_process_code})`}</title></circle>;
        })}</g>
        <circle cx="160" cy="160" r="48" fill="#f8fafc" stroke="#64748b" strokeWidth="2"/>
        <circle cx="160" cy="160" r="33" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
        {[0, 60, 120, 180, 240, 300].map((angle) => { const radian = (angle - 90) * Math.PI / 180; return <circle key={angle} cx={160 + Math.cos(radian) * 68} cy={160 + Math.sin(radian) * 68} r="8" fill="#fff" stroke="#64748b" strokeWidth="2"/>; })}
        <text x="160" y="165" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">HUB</text>
      </svg><div className="aa-heatmap-legend"><i/><span>Higher concentration</span><i/><span>Lower concentration</span></div></div>
      <div className="aa-heatmap-stats"><span className="aa-heatmap-machine">{selected.machine_code}</span><b>{selected.station}</b><div><span>Samples</span><strong>{selected.total_samples}</strong></div><div><span>Defect hits</span><strong>{selected.total_defects}</strong></div><p>{selected.signature_summary || "No spatial signature summary returned."}</p>{!selected.bins.length && <div className="aa-heatmap-empty">No defect locations have been recorded for this machine.</div>}</div>
    </div>}
  </section>;
}
