import React, { useState, useEffect } from 'react'
import type { HistoricalAnalyticsResponse } from '../types/inspection'
import {
  AlertTriangle,
  History,
  Layers,
  Flame,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  PlusCircle,
  Clock,
  Target,
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
  const [selectedMachine, setSelectedMachine] = useState<string>('CR01')
  const [activeTab, setActiveTab] = useState<'heatmap' | 'trends' | 'log'>('heatmap')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Automatically select the machine of the latest uploaded defect
  useEffect(() => {
    if (analytics?.latest_machine_code && analytics.machine_heatmaps[analytics.latest_machine_code]) {
      setSelectedMachine(analytics.latest_machine_code)
    }
  }, [analytics?.latest_machine_code])

  if (!analytics) {
    return (
      <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800">
        <span className="text-sm text-slate-400">Loading historical quality telemetry...</span>
      </div>
    )
  }

  const currentHeatmap = analytics.machine_heatmaps[selectedMachine] || null
  const machineList = Object.keys(analytics.machine_heatmaps)

  // Map exact Cartesian coordinates (dx, dy) to SVG canvas coordinates
  // Disc center is (180, 180), outer rotor radius is 140 px
  // dx in [-0.5, 0.5] (horizontal), dy in [-0.5, 0.5] (vertical, negative is top)
  const cartesianToSvg = (dxNorm: number, dyNorm: number) => {
    const cx = 180
    const cy = 180
    const maxR = 140
    // Scale normalized delta (0.43 is the outer friction perimeter) to SVG pixel radius
    const x = cx + (dxNorm / 0.44) * maxR
    const y = cy + (dyNorm / 0.44) * maxR
    return { x, y }
  }

  const handleSimulate = async () => {
    setIsSimulating(true)
    try {
      await fetch(`/api/analytics/simulate?machine_code=${selectedMachine}&count=3`, {
        method: 'POST',
      })
      onRefresh()
    } catch (err) {
      console.error('Failed to simulate batch:', err)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Wipe historical database and reset inspection counts to 0?')) return
    setIsResetting(true)
    try {
      await fetch('/api/analytics/reset', { method: 'POST' })
      onRefresh()
    } catch (err) {
      console.error('Failed to reset history:', err)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Quality KPIs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            HISTORICAL TELEMETRY & SPATIAL ROTOR HEATMAPS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time coordinate logging, fleet defect accumulation, and early predictive machine fault detection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'heatmap' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Spatial Heatmaps
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

          <button
            onClick={handleReset}
            disabled={isResetting || analytics.total_inspections === 0}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 text-xs text-slate-400 hover:text-red-300 font-mono transition-colors border border-slate-800 flex items-center gap-1"
            title="Reset history database to 0"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Production KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Total Inspected</span>
          <div className="text-2xl font-bold font-mono text-white">{analytics.total_inspections}</div>
          <span className="text-[10px] text-slate-500 font-mono">Discs Ingested into Database</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Conforming (Pass)</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{analytics.pass_rate}%</div>
          <span className="text-[10px] text-emerald-500/80 font-mono">DTV ≤ 5 µm & Zero Defects</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Under Review / Rework</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{analytics.review_rate + analytics.reject_rate}%</div>
          <span className="text-[10px] text-amber-500/80 font-mono">Defect Present / Out-of-Spec</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Early Machine Warnings</span>
          <div className="text-2xl font-bold font-mono text-rose-400">{analytics.active_early_warnings.length}</div>
          <span className="text-[10px] text-rose-500/80 font-mono">Recurrent Failure Clusters</span>
        </div>
      </div>

      {/* Status & Ingestion Progress Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <Target className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            {analytics.collection_status_message}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="px-3 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold border border-indigo-700/80 transition-colors flex items-center gap-1.5"
            title={`Simulate +3 consecutive production parts on ${selectedMachine} to observe heatmap and early warning evolution`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {isSimulating ? 'Simulating...' : `Simulate +3 Parts on ${selectedMachine}`}
          </button>
        </div>
      </div>

      {/* 2. Active Early Machine Failure Warning Banner (Appears ONLY when >= 3 defects cluster) */}
      {analytics.active_early_warnings.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Recurrent Spatial Failure Signatures Detected ({analytics.active_early_warnings.length} Active):</span>
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
                      Confidence: {(warn.confidence * 100).toFixed(0)}%
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
              Select Production Machine / Station
            </span>

            <div className="flex flex-col gap-2">
              {machineList.map((mCode) => {
                const hData = analytics.machine_heatmaps[mCode]
                const isSelected = selectedMachine === mCode
                const hasWarning = analytics.active_early_warnings.some((w) => w.machine_code === mCode)
                const isLatest = analytics.latest_machine_code === mCode

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
                        {isLatest && (
                          <span className="text-[9px] px-1 rounded bg-blue-900 text-blue-200 border border-blue-700 font-mono">
                            LAST INSPECTED
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5 truncate max-w-[200px]">
                        {hData.signature_summary}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {hData.total_defects} flaw{hData.total_defects === 1 ? '' : 's'}
                      </span>
                      {hasWarning && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold animate-pulse">
                          EARLY WARNING
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-sans text-slate-400 leading-snug">
              <strong className="text-slate-200 block mb-1 font-mono">How Real Heatmaps Build Up:</strong>
              When you upload an image (e.g., crack at 1 o'clock), that exact defect is plotted on this canvas. As more parts come off the line from this machine, recurrent mechanical impacts cluster at the same physical position (e.g., gripper pads on <code className="text-cyan-300 font-mono">PU01</code> or wheel wear on <code className="text-cyan-300 font-mono">DT16</code>).
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
                Clock-Face Rotor Projection (12h, 3h, 6h, 9h)
              </span>
            </div>

            {/* Latest Inspected Defect Callout */}
            {analytics.latest_inspected_defect && (
              <div className="w-full mt-3 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/70 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="text-cyan-300 font-semibold">Latest Uploaded Defect:</span>
                  <span className="text-white font-bold">{analytics.latest_inspected_defect.defect_type}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clock Position: <strong className="text-amber-300">{analytics.latest_inspected_defect.clock_hour} o'clock</strong></span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">{analytics.latest_inspected_defect.zone_name}</span>
                </div>
              </div>
            )}

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
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer disc edge (r = 0.44, radius = 140px) */}
                <circle cx="180" cy="180" r="140" fill="url(#discGrad)" stroke="#475569" strokeWidth="2" />

                {/* Friction ring swept band outer boundary (r = 0.42, radius = 132px) */}
                <circle cx="180" cy="180" r="132" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />

                {/* Friction ring swept band inner boundary (r = 0.22, radius = 70px) */}
                <circle cx="180" cy="180" r="70" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />

                {/* Central hub hat / mounting face (r = 0.20, radius = 62px) */}
                <circle cx="180" cy="180" r="62" fill="#090d16" stroke="#334155" strokeWidth="1.5" />

                {/* Center bore hole */}
                <circle cx="180" cy="180" r="25" fill="#020617" stroke="#1e293b" strokeWidth="1" />

                {/* Lug nut bolt holes */}
                {[0, 72, 144, 216, 288].map((angle, idx) => {
                  const rad = ((angle - 90) * Math.PI) / 180
                  const bx = 180 + 44 * Math.cos(rad)
                  const by = 180 + 44 * Math.sin(rad)
                  return <circle key={idx} cx={bx} cy={by} r="6" fill="#020617" stroke="#475569" strokeWidth="1" />
                })}

                {/* Angular Guide Crosshairs */}
                <line x1="40" y1="180" x2="320" y2="180" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />
                <line x1="180" y1="40" x2="180" y2="320" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />

                {/* Clock-Face Hour Labels matching real disc orientation */}
                <text x="172" y="30" fill="#94a3b8" fontSize="10" fontFamily="monospace">12h</text>
                <text x="242" y="50" fill="#64748b" fontSize="9" fontFamily="monospace">1h</text>
                <text x="290" y="100" fill="#64748b" fontSize="9" fontFamily="monospace">2h</text>
                <text x="328" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">3h</text>
                <text x="168" y="340" fill="#94a3b8" fontSize="10" fontFamily="monospace">6h</text>
                <text x="16" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">9h</text>

                {/* Render Actual Defect Points Plotted on Rotor Geometry */}
                {currentHeatmap?.bins.map((bin, idx) => {
                  const { x, y } = cartesianToSvg(bin.dx, bin.dy)
                  return (
                    <g key={idx} filter="url(#glow)">
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="#ef4444"
                        opacity="0.8"
                      />
                      <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
                      <text
                        x={x + 10}
                        y={y - 8}
                        fill="#f8fafc"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {bin.clock_hour}h
                      </text>
                    </g>
                  )
                })}

                {/* Zero defects placeholder graphic */}
                {(!currentHeatmap || currentHeatmap.bins.length === 0) && (
                  <text x="125" y="184" fill="#64748b" fontSize="11" fontFamily="monospace">
                    No flaws for {selectedMachine}
                  </text>
                )}
              </svg>
            </div>

            {/* Heatmap Legend */}
            <div className="w-full flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-800/80 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Defect Indicator:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
                  <span>Exact Defect Centroid on Friction Swept Face</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-200 font-bold">{currentHeatmap?.total_defects || 0}</span> spatial defect{currentHeatmap?.total_defects === 1 ? '' : 's'} logged for {selectedMachine}
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

          {analytics.time_series.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No historical records yet. Run an inspection in HUD mode or click "Simulate +3 Parts" above.
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* 5. Tab Content: Historical Inspection Log Table */}
      {activeTab === 'log' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Serialized Rotor Quality History ({analytics.records.length} Records)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Total Logged: {analytics.total_inspections}
            </span>
          </div>

          {analytics.records.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No historical records yet. Run an inspection in HUD mode or click "Simulate +3 Parts" above.
            </div>
          ) : (
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
                    <th className="pb-2.5">Clock Position</th>
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
                      <td className="py-2.5 text-slate-300">
                        {r.defects.length > 0
                          ? `${r.defects[0].clock_hour || (r.defects[0].theta_degrees / 30).toFixed(1)}h (${r.defects[0].zone_name || 'Swept Band'})`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
