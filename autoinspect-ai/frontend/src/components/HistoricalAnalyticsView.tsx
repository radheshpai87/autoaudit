import React, { useState } from 'react'
import type { HistoricalAnalyticsResponse } from '../types/inspection'
import {
  AlertTriangle,
  History,
  Layers,
  Flame,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react'

interface HistoricalAnalyticsViewProps {
  analytics: HistoricalAnalyticsResponse | null
  isLoading: boolean
  onRefresh: () => void
}

export const HistoricalAnalyticsView: React.FC<HistoricalAnalyticsViewProps> = ({
  analytics,
  isLoading,
  onRefresh,
}) => {
  const [selectedMachine, setSelectedMachine] = useState<string>('PU01')
  const [activeTab, setActiveTab] = useState<'heatmap' | 'trends' | 'log'>('heatmap')

  if (!analytics) {
    return (
      <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800">
        <span className="text-sm text-slate-400">Loading historical quality telemetry...</span>
      </div>
    )
  }

  const currentHeatmap = analytics.machine_heatmaps[selectedMachine] || null
  const machineList = Object.keys(analytics.machine_heatmaps)

  // Map polar bin (r, theta) to Cartesian SVG coordinates
  // Disc center is (180, 180), outer radius is 140 px
  const polarToSvg = (rNorm: number, thetaDeg: number) => {
    const cx = 180
    const cy = 180
    const maxR = 140
    // Scale rNorm (typically 0.1 to 0.45) to SVG radius
    const r = (rNorm / 0.45) * maxR
    const rad = (thetaDeg * Math.PI) / 180
    const x = cx + r * Math.cos(rad)
    const y = cy + r * Math.sin(rad)
    return { x, y }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Quality KPIs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            HISTORICAL TELEMETRY & PREDICTIVE FLEET HEALTH
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous time-series logging, spatial rotor defect clustering, and early machine fault detection (Appl. Sci. 2020)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'heatmap' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Rotor Heatmaps
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'trends' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Tolerance Drift
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'log' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Inspection Log
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono transition-colors border border-slate-700"
          >
            {isLoading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Production KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Total Inspected</span>
          <div className="text-2xl font-bold font-mono text-white">{analytics.total_inspections}</div>
          <span className="text-[10px] text-slate-500 font-mono">Serialized Discs Logged</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Conforming (Pass)</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{analytics.pass_rate}%</div>
          <span className="text-[10px] text-emerald-500/80 font-mono">DTV ≤ 5 µm & Zero Defects</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Under Review</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{analytics.review_rate}%</div>
          <span className="text-[10px] text-amber-500/80 font-mono">Early Wear / Borderline DTV</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Active Machine Alerts</span>
          <div className="text-2xl font-bold font-mono text-rose-400">{analytics.active_early_warnings.length}</div>
          <span className="text-[10px] text-rose-500/80 font-mono">Early Predictive Warnings</span>
        </div>
      </div>

      {/* 2. Active Early Machine Failure Warning Banner */}
      {analytics.active_early_warnings.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Early Machine Failure Warnings Detected from Historical Signatures:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.active_early_warnings.map((warn, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  warn.severity_level === 'critical'
                    ? 'bg-red-950/40 border-red-800/80 text-red-200'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-amber-800/40">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-black/40 border border-current">
                        STATION: {warn.machine_code}
                      </span>
                      <span className="text-xs font-semibold">{warn.station}</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/50">
                      Match: {(warn.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-2.5 text-xs font-sans leading-relaxed">
                    <strong className="block text-white mb-0.5">{warn.failure_mode}</strong>
                    <p className="m-0 text-slate-300 opacity-95">{warn.alert_message}</p>
                  </div>

                  <div className="mt-2 p-2 rounded bg-black/30 font-mono text-[11px] text-slate-300">
                    <span className="text-cyan-400 block font-semibold mb-0.5">Spatial Signature Match:</span>
                    {warn.spatial_signature}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-800/40 text-[11px] font-sans flex items-start gap-1.5 text-amber-300">
                  <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="font-semibold text-white">Preventive Action: </strong>
                    {warn.recommended_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tab Content: Polar Spatial Heatmap View */}
      {activeTab === 'heatmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          {/* Machine Selector Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase text-slate-400">
              Filter By Machine / Station Code
            </span>

            <div className="flex flex-col gap-2">
              {machineList.map((mCode) => {
                const hData = analytics.machine_heatmaps[mCode]
                const isSelected = selectedMachine === mCode
                const hasWarning = analytics.active_early_warnings.some((w) => w.machine_code === mCode)

                return (
                  <button
                    key={mCode}
                    onClick={() => setSelectedMachine(mCode)}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-600 text-white shadow-md shadow-cyan-900/20'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-cyan-400">{mCode}</span>
                        <span className="text-xs text-slate-300 font-medium">{hData.station}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5 truncate max-w-[200px]">
                        {hData.signature_summary}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {hData.total_defects} flaws
                      </span>
                      {hasWarning && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold animate-pulse">
                          EARLY DRIFT
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-sans text-slate-400 leading-snug">
              <strong className="text-slate-200 block mb-1 font-mono">Early Detection Mechanism:</strong>
              When an anomaly or micro-dent occurs, its normalized polar coordinates <code className="text-cyan-300 font-mono">(r, θ)</code> are mapped against cumulative fleet patterns. Machine <code className="text-cyan-300 font-mono">PU01</code> produces bipolar impacts (<code className="text-cyan-300 font-mono">θ≈90° & 270°</code>), whereas <code className="text-cyan-300 font-mono">DT16</code> generates continuous annular rings (<code className="text-cyan-300 font-mono">r≈0.34</code>).
            </div>
          </div>

          {/* Polar Defect Spatial Heatmap Canvas (Interactive SVG) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 relative">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold font-mono text-white">
                  Spatial Rotor Defect Heatmap: {selectedMachine}
                </span>
                <span className="text-xs text-slate-400">({currentHeatmap?.station})</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Axi-Symmetric Polar Projection (0°–360°, r: 0.0–0.5)
              </span>
            </div>

            <div className="my-6 relative flex items-center justify-center">
              {/* SVG Polar Rotor Map */}
              <svg width="360" height="360" className="overflow-visible select-none">
                <defs>
                  {/* Radial gradient for metallic disc backdrop */}
                  <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="44%" stopColor="#1e293b" />
                    <stop offset="85%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </radialGradient>
                  {/* Glow filter for defect hotspots */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer disc edge (r = 0.45, radius = 140px) */}
                <circle cx="180" cy="180" r="140" fill="url(#discGrad)" stroke="#475569" strokeWidth="2" />

                {/* Friction ring swept band outer boundary (r = 0.42, radius = 130px) */}
                <circle cx="180" cy="180" r="130" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />

                {/* Friction ring swept band inner boundary (r = 0.22, radius = 70px) */}
                <circle cx="180" cy="180" r="70" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />

                {/* Central hub hat / mounting face (r = 0.20, radius = 62px) */}
                <circle cx="180" cy="180" r="62" fill="#090d16" stroke="#334155" strokeWidth="1.5" />

                {/* Center bore hole */}
                <circle cx="180" cy="180" r="25" fill="#020617" stroke="#1e293b" strokeWidth="1" />

                {/* Lug nut bolt holes */}
                {[0, 72, 144, 216, 288].map((angle, idx) => {
                  const rad = (angle * Math.PI) / 180
                  const bx = 180 + 44 * Math.cos(rad)
                  const by = 180 + 44 * Math.sin(rad)
                  return <circle key={idx} cx={bx} cy={by} r="6" fill="#020617" stroke="#475569" strokeWidth="1" />
                })}

                {/* Angular Guide Lines (0°, 90°, 180°, 270°) */}
                <line x1="40" y1="180" x2="320" y2="180" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />
                <line x1="180" y1="40" x2="180" y2="320" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />

                {/* Labels for Angles */}
                <text x="328" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">0°</text>
                <text x="172" y="32" fill="#94a3b8" fontSize="10" fontFamily="monospace">90°</text>
                <text x="16" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">180°</text>
                <text x="168" y="340" fill="#94a3b8" fontSize="10" fontFamily="monospace">270°</text>

                {/* Render Spatial Defect Hotspot Bins for Selected Machine */}
                {currentHeatmap?.bins.map((bin, idx) => {
                  const { x, y } = polarToSvg(bin.r_bin, bin.theta_bin)
                  // Radius proportional to defect count
                  const dotRadius = Math.min(18, 6 + bin.defect_count * 2)
                  const opacity = Math.min(0.9, 0.45 + bin.intensity * 0.45)

                  return (
                    <g key={idx} filter="url(#glow)">
                      <circle
                        cx={x}
                        cy={y}
                        r={dotRadius}
                        fill={bin.defect_count > 3 ? '#ef4444' : bin.defect_count > 1 ? '#f97316' : '#eab308'}
                        opacity={opacity}
                      />
                      <circle cx={x} cy={y} r="2.5" fill="#ffffff" />
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Heatmap Legend */}
            <div className="w-full flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-800/80 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Defect Density:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span> 1 Defect
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span> 2–3 Defects
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span> 4+ Clustered (Faulty Machine)
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-300 font-bold">{currentHeatmap?.total_defects || 0}</span> spatial defects logged for {selectedMachine}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Content: Time-Series Tolerance Drift Charts */}
      {activeTab === 'trends' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Time-Series Tolerance Drift vs. Machine Spec Limits
              </h3>
              <span className="text-xs text-slate-400">
                Tracking DTV (≤ 5 µm), Runout (≤ 25 µm), and Parallelism (≤ 40 µm) progression across production parts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="pb-2.5">Part ID</th>
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">DTV (≤ 5 µm)</th>
                  <th className="pb-2.5">Runout (≤ 25 µm)</th>
                  <th className="pb-2.5">Parallelism (≤ 40 µm)</th>
                  <th className="pb-2.5">Wear Index</th>
                  <th className="pb-2.5">Origin Machine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics.time_series.slice(-15).reverse().map((ts, idx) => {
                  const isDtvHigh = ts.dtv_um > 4.0
                  return (
                    <tr key={idx} className="hover:bg-slate-950/40">
                      <td className="py-2.5 text-white font-bold">{ts.part_id}</td>
                      <td className="py-2.5 text-slate-400">{ts.timestamp.slice(11, 19)}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ts.status === 'PASS'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : ts.status === 'REJECT'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {ts.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={isDtvHigh ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                          {ts.dtv_um.toFixed(2)} µm
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{ts.runout_um.toFixed(1)} µm</td>
                      <td className="py-2.5 text-slate-300">{ts.parallelism_um.toFixed(1)} µm</td>
                      <td className="py-2.5 text-cyan-400">{ts.wear_index.toFixed(1)}</td>
                      <td className="py-2.5 text-indigo-300">{ts.process_code}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab Content: Historical Inspection Log Table */}
      {activeTab === 'log' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Serialized Rotor Quality History (Last 25 Records)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Total Recorded: {analytics.total_inspections}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="pb-2.5">Serial No</th>
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">QA Status</th>
                  <th className="pb-2.5">Condition</th>
                  <th className="pb-2.5">Defects</th>
                  <th className="pb-2.5">FMEA Station</th>
                  <th className="pb-2.5">RPN</th>
                  <th className="pb-2.5">Polar Centroid (r, θ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics.records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40">
                    <td className="py-2.5 text-white font-bold">{r.part_id}</td>
                    <td className="py-2.5 text-slate-400">{r.timestamp.slice(11, 19)}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.overall_status === 'PASS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : r.overall_status === 'REJECT'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {r.overall_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{r.condition}</td>
                    <td className="py-2.5 text-slate-300">{r.defect_count}</td>
                    <td className="py-2.5 text-indigo-300">{r.primary_process_code || '—'}</td>
                    <td className="py-2.5 text-amber-400">{r.highest_rpn}</td>
                    <td className="py-2.5 text-slate-400">
                      {r.defects.length > 0
                        ? `r=${r.defects[0].r_normalized.toFixed(2)}, θ=${r.defects[0].theta_degrees.toFixed(0)}°`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
