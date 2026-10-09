import React, { useState, useEffect } from 'react'
import type { HistoricalAnalyticsResponse, ComponentType } from '../types/inspection'
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
  CheckCircle2,
  Disc,
  Car,
} from 'lucide-react'

interface HistoricalAnalyticsViewProps {
  analytics: HistoricalAnalyticsResponse | null
  isLoading: boolean
  onRefresh: () => void
  selectedComponent?: ComponentType
  onComponentChange?: (comp: ComponentType) => void
}

export const HistoricalAnalyticsView: React.FC<HistoricalAnalyticsViewProps> = ({
  analytics,
  isLoading,
  onRefresh,
  selectedComponent = 'brake_rotor',
  onComponentChange,
}) => {
  const isBonnet = selectedComponent === 'car_bonnet'

  const [selectedMachine, setSelectedMachine] = useState<string>(
    isBonnet ? 'DC02' : 'CR01'
  )
  const [activeTab, setActiveTab] = useState<'heatmap' | 'trends' | 'log'>('heatmap')
  const [heatmapMode, setHeatmapMode] = useState<'cumulative' | 'current_part'>('cumulative')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Sync selected machine when component profile switches
  useEffect(() => {
    if (isBonnet) {
      if (!['PR01', 'DC02', 'TR03', 'HM04', 'PT05'].includes(selectedMachine)) {
        setSelectedMachine('DC02')
      }
    } else {
      if (!['CR01', 'PU01', 'DT16', 'DT17', 'BA02', 'IN01'].includes(selectedMachine)) {
        setSelectedMachine('CR01')
      }
    }
  }, [selectedComponent])

  // Automatically select the machine of the latest uploaded defect if present
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

  // --- 1. Coordinate Mapper for Circular Brake Rotor ---
  // Disc center is (180, 180), outer rotor radius is 140 px
  const rotorCartesianToSvg = (dxNorm: number, dyNorm: number) => {
    const cx = 180
    const cy = 180
    const maxR = 140
    const x = cx + (dxNorm / 0.44) * maxR
    const y = cy + (dyNorm / 0.44) * maxR
    return { x, y }
  }

  // --- 2. Coordinate Mapper for Planar Car Bonnet Stamping Die ---
  // Canvas width 400, height 360. Margin X: 40, Margin Y: 35. Usable W: 320, Usable H: 290
  const bonnetDieToSvg = (pxNorm?: number | null, pyNorm?: number | null, dxNorm?: number, dyNorm?: number) => {
    let px = pxNorm ?? 0.5
    let py = pyNorm ?? 0.5
    // Fallback if panel_x was not populated: derive from delta center (-0.5 to 0.5)
    if (pxNorm === null || pxNorm === undefined) {
      px = Math.min(1.0, Math.max(0.0, (dxNorm ?? 0.0) + 0.5))
    }
    if (pyNorm === null || pyNorm === undefined) {
      py = Math.min(1.0, Math.max(0.0, (dyNorm ?? 0.0) + 0.5))
    }
    const x = 40 + px * 320
    const y = 35 + py * 290
    return { x, y, px, py }
  }

  // Defect element renderer on Rotor (Polar HUD)
  const renderRotorDefect = (item: any, idx: number) => {
    const dx = item.dx_normalized ?? item.dx ?? 0
    const dy = item.dy_normalized ?? item.dy ?? 0
    const { x, y } = rotorCartesianToSvg(dx, dy)

    if (item.mask_polygon && item.mask_polygon.length >= 3) {
      const polyPts = item.mask_polygon
        .map(([px, py]: [number, number]) => {
          const { x: sx, y: sy } = rotorCartesianToSvg(px, py)
          return `${sx.toFixed(1)},${sy.toFixed(1)}`
        })
        .join(' ')

      return (
        <g key={idx}>
          <polygon points={polyPts} fill="#ef4444" opacity="0.65" filter="url(#glow)" />
          <polygon points={polyPts} fill="rgba(249, 115, 22, 0.75)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="3" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.2" />
          <text x={x + 10} y={y - 8} fill="#f8fafc" fontSize="9" fontFamily="monospace" fontWeight="bold">
            {item.clock_hour}h
          </text>
        </g>
      )
    }

    if (item.bbox && item.bbox.length === 4) {
      const p1 = rotorCartesianToSvg(item.bbox[0], item.bbox[1])
      const p2 = rotorCartesianToSvg(item.bbox[2], item.bbox[3])
      const bx = Math.min(p1.x, p2.x)
      const by = Math.min(p1.y, p2.y)
      const bw = Math.max(Math.abs(p2.x - p1.x), 16)
      const bh = Math.max(Math.abs(p2.y - p1.y), 16)

      return (
        <g key={idx}>
          <rect x={bx - 4} y={by - 4} width={bw + 8} height={bh + 8} rx="6" fill="#ef4444" opacity="0.65" filter="url(#glow)" />
          <rect x={bx} y={by} width={bw} height={bh} rx="3" fill="rgba(249, 115, 22, 0.45)" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx={x} cy={y} r="3" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.2" />
          <text x={x + 10} y={y - 8} fill="#f8fafc" fontSize="9" fontFamily="monospace" fontWeight="bold">
            {item.clock_hour}h
          </text>
        </g>
      )
    }

    return (
      <g key={idx} filter="url(#glow)">
        <circle cx={x} cy={y} r="12" fill="#ef4444" opacity="0.8" />
        <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
        <text x={x + 10} y={y - 8} fill="#f8fafc" fontSize="9" fontFamily="monospace" fontWeight="bold">
          {item.clock_hour}h
        </text>
      </g>
    )
  }

  // Defect element renderer on Car Bonnet (Stamping Press Die Grid)
  const renderBonnetDefect = (item: any, idx: number) => {
    const { x, y, px, py } = bonnetDieToSvg(
      item.panel_x_normalized ?? item.panel_x,
      item.panel_y_normalized ?? item.panel_y,
      item.dx_normalized ?? item.dx,
      item.dy_normalized ?? item.dy
    )

    if (item.mask_polygon && item.mask_polygon.length >= 3) {
      const polyPts = item.mask_polygon
        .map(([ptx, pty]: [number, number]) => {
          // Normalize if delta (-0.5..0.5) or direct (0..1)
          const nx = ptx < 0 || ptx <= 0.5 && ptx >= -0.5 ? ptx + 0.5 : ptx
          const ny = pty < 0 || pty <= 0.5 && pty >= -0.5 ? pty + 0.5 : pty
          const sx = 40 + nx * 320
          const sy = 35 + ny * 290
          return `${sx.toFixed(1)},${sy.toFixed(1)}`
        })
        .join(' ')

      return (
        <g key={idx}>
          <polygon points={polyPts} fill="#ef4444" opacity="0.75" filter="url(#glow)" />
          <polygon points={polyPts} fill="rgba(249, 115, 22, 0.85)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
          <rect x={x + 8} y={y - 16} width="84" height="15" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#f97316" strokeWidth="0.8" />
          <text x={x + 12} y={y - 5} fill="#f8fafc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            X:{(px * 100).toFixed(0)}% Y:{(py * 100).toFixed(0)}%
          </text>
        </g>
      )
    }

    if (item.bbox && item.bbox.length === 4) {
      const b1 = bonnetDieToSvg(null, null, item.bbox[0], item.bbox[1])
      const b2 = bonnetDieToSvg(null, null, item.bbox[2], item.bbox[3])
      const bx = Math.min(b1.x, b2.x)
      const by = Math.min(b1.y, b2.y)
      const bw = Math.max(Math.abs(b2.x - b1.x), 18)
      const bh = Math.max(Math.abs(b2.y - b1.y), 18)

      return (
        <g key={idx}>
          <rect x={bx - 4} y={by - 4} width={bw + 8} height={bh + 8} rx="6" fill="#ef4444" opacity="0.65" filter="url(#glow)" />
          <rect x={bx} y={by} width={bw} height={bh} rx="3" fill="rgba(249, 115, 22, 0.5)" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
          <rect x={x + 8} y={y - 16} width="84" height="15" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#f97316" strokeWidth="0.8" />
          <text x={x + 12} y={y - 5} fill="#f8fafc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            X:{(px * 100).toFixed(0)}% Y:{(py * 100).toFixed(0)}%
          </text>
        </g>
      )
    }

    return (
      <g key={idx} filter="url(#glow)">
        <circle cx={x} cy={y} r="14" fill="#ef4444" opacity="0.8" />
        <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
        <rect x={x + 8} y={y - 16} width="84" height="15" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#f97316" strokeWidth="0.8" />
        <text x={x + 12} y={y - 5} fill="#f8fafc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
          X:{(px * 100).toFixed(0)}% Y:{(py * 100).toFixed(0)}%
        </text>
      </g>
    )
  }

  const handleSimulate = async () => {
    setIsSimulating(true)
    try {
      await fetch(
        `/api/analytics/simulate?component_type=${selectedComponent}&machine_code=${selectedMachine}&count=3`,
        { method: 'POST' }
      )
      onRefresh()
    } catch (err) {
      console.error('Failed to simulate batch:', err)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm(`Wipe historical database for ${isBonnet ? 'Car Bonnet' : 'Brake Rotor'} and reset counts to 0?`)) return
    setIsResetting(true)
    try {
      await fetch(`/api/analytics/reset?component_type=${selectedComponent}`, { method: 'POST' })
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              {isBonnet
                ? 'HISTORICAL TELEMETRY & STAMPING DIE HEATMAPS (CAR BONNET / BIW PANEL)'
                : 'HISTORICAL TELEMETRY & SPATIAL ROTOR HEATMAPS (BRAKE DISC)'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isBonnet
              ? 'Planar press die coordinate logging, punch contamination clusters, and predictive early press failure detection'
              : 'Real-time coordinate logging, fleet defect accumulation, and early predictive machine fault detection'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Component Quick Switcher */}
          {onComponentChange && (
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs font-mono">
              <button
                onClick={() => onComponentChange('brake_rotor')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  !isBonnet ? 'bg-blue-950 text-blue-300 font-bold border border-blue-700/60' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Disc className="w-3 h-3 text-blue-400" />
                Rotor
              </button>
              <button
                onClick={() => onComponentChange('car_bonnet')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  isBonnet ? 'bg-indigo-950 text-indigo-300 font-bold border border-indigo-700/60' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3 h-3 text-indigo-400" />
                Bonnet
              </button>
            </div>
          )}

          {/* Subtabs */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'heatmap' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {isBonnet ? 'Press Die Heatmap' : 'Spatial Heatmaps'}
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
            onClick={handleReset}
            disabled={isResetting || isLoading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 transition-colors"
            title="Reset Database and wipe records"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting || isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
            {isBonnet ? 'Total Bonnets Inspected' : 'Total Rotors Inspected'}
          </span>
          <div className="text-2xl font-bold font-mono text-white">{analytics.total_inspections}</div>
          <span className="text-[10px] text-slate-500 font-mono">Live Serialized Counter</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Direct Fleet Pass Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{analytics.pass_rate}%</div>
          <span className="text-[10px] text-emerald-500/80 font-mono">Zero Surface Flaws</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Scrap & Review Ratio</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{(analytics.review_rate + analytics.reject_rate).toFixed(1)}%</div>
          <span className="text-[10px] text-amber-500/80 font-mono">Defect Present / Out-of-Spec</span>
        </div>
        <div className={`p-4 rounded-xl border ${
          analytics.active_early_warnings.some((w) => w.severity_level === 'critical')
            ? 'bg-rose-950/40 border-rose-800'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
            {analytics.active_early_warnings.some((w) => w.severity_level === 'critical')
              ? 'Critical Machine Alerts'
              : isBonnet ? 'Early Press Line Alerts' : 'Early Machine Alerts'}
          </span>
          <div className={`text-2xl font-bold font-mono ${
            analytics.active_early_warnings.some((w) => w.severity_level === 'critical')
              ? 'text-rose-400 animate-pulse'
              : 'text-amber-400'
          }`}>
            {analytics.active_early_warnings.length}
          </div>
          <span className={`text-[10px] font-mono ${
            analytics.active_early_warnings.some((w) => w.severity_level === 'critical')
              ? 'text-rose-400 font-bold'
              : 'text-amber-500/80'
          }`}>
            {analytics.active_early_warnings.some((w) => w.severity_level === 'critical')
              ? 'Immediate Line Action Needed'
              : 'Recurrent Failure Clusters'}
          </span>
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

      {/* Live Conveyor Belt Stream */}
      {analytics.records && analytics.records.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              {isBonnet ? 'Press Shop Conveyor Parts Stream' : 'Conveyor Line Real-Time Parts Stream'}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {analytics.latest_conveyor_status || 'Parts moving sequentially through inspection camera'}
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {analytics.records.slice(0, 10).map((rec, idx) => (
              <div
                key={idx}
                className={`shrink-0 p-2.5 rounded-lg border font-mono text-xs flex flex-col gap-1 min-w-[175px] transition-all ${
                  idx === 0
                    ? rec.overall_status === 'PASS'
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-red-950/30 border-red-500 shadow-md shadow-red-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{rec.part_id}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      rec.overall_status === 'PASS'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : rec.overall_status === 'REJECT'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {rec.overall_status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{rec.defect_count} flaw{rec.defect_count === 1 ? '' : 's'}</span>
                  <span>Wear: {rec.wear_index_score.toFixed(1)}</span>
                </div>
                {idx === 0 ? (
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded text-center font-bold ${
                      rec.overall_status === 'PASS'
                        ? 'bg-emerald-900/80 text-emerald-200'
                        : 'bg-red-900/80 text-red-200'
                    }`}
                  >
                    ON CONVEYOR NOW (LATEST)
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-600 text-center font-mono">
                    Part #{analytics.total_inspections - idx}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Active Early Machine Failure Warning Banner */}
      {analytics.active_early_warnings.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
            {analytics.active_early_warnings.some((w) => w.severity_level === 'critical') ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-rose-400">
                  CRITICAL MACHINE FAILURES DETECTED ({analytics.active_early_warnings.filter((w) => w.severity_level === 'critical').length} CRITICAL / {analytics.active_early_warnings.length} TOTAL ACTIVE):
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-amber-400">
                  RECURRENT FAILURE SIGNATURES DETECTED ({analytics.active_early_warnings.length} ACTIVE):
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.active_early_warnings.map((warn, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-lg ${
                  warn.severity_level === 'critical'
                    ? 'bg-rose-950/50 border-rose-700 text-rose-100 shadow-rose-950/50'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div>
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    warn.severity_level === 'critical' ? 'border-rose-800/70' : 'border-amber-800/40'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs bg-black/40 border ${
                        warn.severity_level === 'critical' ? 'border-rose-500 text-rose-300' : 'border-amber-500 text-amber-300'
                      }`}>
                        STATION: {warn.machine_code}
                      </span>
                      <span className="text-xs font-semibold">{warn.station}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                        warn.severity_level === 'critical'
                          ? 'bg-rose-900/90 text-rose-100 border border-rose-500 animate-pulse'
                          : 'bg-amber-900/90 text-amber-200 border border-amber-600'
                      }`}>
                        {warn.severity_level === 'critical' ? 'CRITICAL SHUTDOWN' : 'EARLY WARNING'}
                      </span>
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

                <div className={`pt-2 border-t text-[11px] font-sans flex items-start gap-1.5 ${
                  warn.severity_level === 'critical' ? 'border-rose-800/70 text-rose-300' : 'border-amber-800/40 text-amber-300'
                }`}>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 mt-0.5 ${
                    warn.severity_level === 'critical' ? 'text-rose-400' : 'text-amber-400'
                  }`} />
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

      {/* 3. Tab Content: Spatial Heatmap View (Adaptive Rotor Polar vs Bonnet Die Grid) */}
      {activeTab === 'heatmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          {/* Machine Selector Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase text-slate-400">
              {isBonnet ? 'Select Stamping Press Station' : 'Select Production Machine / Station'}
            </span>

            <div className="flex flex-col gap-2">
              {machineList.map((mCode) => {
                const hData = analytics.machine_heatmaps[mCode]
                const isSelected = selectedMachine === mCode
                const machineWarn = analytics.active_early_warnings.find((w) => w.machine_code === mCode)
                const isCritical = machineWarn?.severity_level === 'critical'
                const hasWarning = !!machineWarn
                const isLatest = analytics.latest_machine_code === mCode

                return (
                  <button
                    key={mCode}
                    onClick={() => setSelectedMachine(mCode)}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? isCritical
                          ? 'bg-rose-950/70 border-rose-500 text-white shadow-md shadow-rose-900/30'
                          : 'bg-cyan-950/70 border-cyan-600 text-white shadow-md shadow-cyan-900/20'
                        : isCritical
                        ? 'bg-rose-950/20 border-rose-900/80 text-rose-200 hover:bg-rose-950/30'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${isCritical ? 'text-rose-400' : 'text-cyan-400'}`}>
                          {mCode}
                        </span>
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
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse ${
                            isCritical
                              ? 'bg-rose-950 text-rose-200 border border-rose-600 shadow-sm shadow-rose-950'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {isCritical ? 'CRITICAL ALERT' : 'EARLY WARNING'}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-sans text-slate-400 leading-snug">
              <strong className="text-slate-200 block mb-1 font-mono">
                {isBonnet ? 'How Press Die Heatmaps Build Up:' : 'How Real Heatmaps Build Up:'}
              </strong>
              {isBonnet
                ? 'When a bonnet is stamped, defects (e.g. punch pimple at X=46%, Y=35%) are plotted at their exact die coordinates. If foreign swarf is stuck on the upper punch (DC02), consecutive stampings cluster at the exact same location, triggering a predictive cleaning alert.'
                : 'When you upload a brake disc image (e.g., crack at 1 o\'clock), that exact defect is plotted on the polar canvas. Consecutive mechanical impacts (PU01 gripper dents) cluster at identical clock positions.'}
            </div>
          </div>

          {/* Spatial Heatmap Canvas (Interactive SVG) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 relative">
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/80 gap-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold font-mono text-white">
                  {isBonnet
                    ? `Press Die Stamping Defect Heatmap: ${selectedMachine}`
                    : `Spatial Rotor Defect Heatmap: ${selectedMachine}`}
                </span>
                <span className="text-xs text-slate-400">({currentHeatmap?.station})</span>
              </div>

              {/* View Toggle */}
              <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
                <button
                  onClick={() => setHeatmapMode('cumulative')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    heatmapMode === 'cumulative'
                      ? 'bg-orange-950 text-orange-300 font-bold border border-orange-700/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Shift Fleet Heatmap ({currentHeatmap?.total_defects || 0} Flaws)
                </button>
                <button
                  onClick={() => setHeatmapMode('current_part')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    heatmapMode === 'current_part'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Current Conveyor Part ({analytics.latest_inspection_record?.defect_count ?? 0} Flaws)
                </button>
              </div>
            </div>

            {/* Conveyor Belt Part Callout */}
            {analytics.latest_inspection_record ? (
              analytics.latest_inspection_record.defect_count === 0 ? (
                <div className="w-full mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/70 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-bold">Current Part {analytics.latest_inspection_record.part_id}:</span>
                    <span className="text-white font-semibold">QA PASS — 0 Defects Detected</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>Wear Index: <strong className="text-emerald-400">{analytics.latest_inspection_record.wear_index_score.toFixed(1)} / 100</strong></span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">Conforming Surface (Zero Heatmap Footprint)</span>
                  </div>
                </div>
              ) : (
                <div className="w-full mt-3 p-3 rounded-lg bg-red-950/40 border border-red-700/70 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                    <span className="text-red-300 font-bold">Current Part {analytics.latest_inspection_record.part_id}:</span>
                    <span className="text-white font-bold">{analytics.latest_inspected_defect?.defect_type || 'Defect'} Detected</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isBonnet ? (
                        <>Die Coordinates: <strong className="text-amber-300">{analytics.latest_inspected_defect?.zone_name || 'Class-A Surface'}</strong></>
                      ) : (
                        <>Clock Position: <strong className="text-amber-300">{analytics.latest_inspected_defect?.clock_hour || 'N/A'} o'clock</strong></>
                      )}
                    </span>
                  </div>
                </div>
              )
            ) : null}

            {/* CANVAS RENDERING: Bonnet Press Die Canvas vs Rotor Polar Canvas */}
            <div className="my-6 relative flex items-center justify-center">
              {isBonnet ? (
                /* --- SVG CAR BONNET STAMPING DIE CANVAS --- */
                <svg width="400" height="360" className="overflow-visible select-none">
                  <defs>
                    <linearGradient id="bonnetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="35%" stopColor="#334155" />
                      <stop offset="70%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Stamping Die Outer Bed / Bolster */}
                  <rect x="25" y="20" width="350" height="320" rx="8" fill="#090d16" stroke="#334155" strokeWidth="1.5" />

                  {/* Cartesian Die Matrix Guide Grid lines */}
                  {[0.25, 0.5, 0.75].map((pct, i) => (
                    <g key={i}>
                      {/* Vertical grid lines */}
                      <line x1={40 + pct * 320} y1="20" x2={40 + pct * 320} y2="340" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 3" />
                      <text x={40 + pct * 320} y="15" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                        {(pct * 100).toFixed(0)}%
                      </text>
                      {/* Horizontal grid lines */}
                      <line x1="25" y1={35 + pct * 290} x2="375" y2={35 + pct * 290} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 3" />
                      <text x="18" y={38 + pct * 290} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">
                        {(pct * 100).toFixed(0)}%
                      </text>
                    </g>
                  ))}

                  {/* Car Bonnet Stamped Panel Outer Boundary (Aerodynamic Sculpted Silhouette) */}
                  <polygon
                    points="140,40 260,40 330,75 365,150 375,275 360,330 310,345 90,345 40,330 25,275 35,150 70,75"
                    fill="url(#bonnetGrad)"
                    stroke="#475569"
                    strokeWidth="2"
                  />

                  {/* Left Character Feature Line */}
                  <path d="M 155 45 Q 145 160 120 335" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.8" />
                  <path d="M 155 45 Q 145 160 120 335" stroke="#475569" strokeWidth="0.8" fill="none" opacity="0.9" />

                  {/* Right Character Feature Line */}
                  <path d="M 245 45 Q 255 160 280 335" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.8" />
                  <path d="M 245 45 Q 255 160 280 335" stroke="#475569" strokeWidth="0.8" fill="none" opacity="0.9" />

                  {/* Center Aerodynamic Spine */}
                  <line x1="200" y1="42" x2="200" y2="340" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

                  {/* Left Headlamp Deep Draw Pocket (Zone D) */}
                  <ellipse cx="90" cy="85" rx="30" ry="18" transform="rotate(-25 90 85)" fill="#0f172a" stroke="#475569" strokeWidth="1.2" opacity="0.8" />
                  <text x="65" y="70" fill="#94a3b8" fontSize="8" fontFamily="monospace">ZONE D</text>

                  {/* Right Headlamp Deep Draw Pocket (Zone E) */}
                  <ellipse cx="310" cy="85" rx="30" ry="18" transform="rotate(25 310 85)" fill="#0f172a" stroke="#475569" strokeWidth="1.2" opacity="0.8" />
                  <text x="295" y="70" fill="#94a3b8" fontSize="8" fontFamily="monospace">ZONE E</text>

                  {/* Front Latch Embossment (Zone F) */}
                  <rect x="185" y="48" width="30" height="16" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  <circle cx="200" cy="56" r="3.5" fill="#334155" />
                  <text x="180" y="32" fill="#94a3b8" fontSize="8" fontFamily="monospace">ZONE F (HEM)</text>

                  {/* Rear Cowl Hinge Mounting Flanges (Zones A & B) */}
                  <circle cx="85" cy="315" r="6" fill="#020617" stroke="#475569" strokeWidth="1" />
                  <text x="60" y="335" fill="#94a3b8" fontSize="8" fontFamily="monospace">ZONE A</text>
                  <circle cx="315" cy="315" r="6" fill="#020617" stroke="#475569" strokeWidth="1" />
                  <text x="295" y="335" fill="#94a3b8" fontSize="8" fontFamily="monospace">ZONE B</text>

                  {/* Center Spine Label (Zone C) */}
                  <text x="175" y="195" fill="#64748b" fontSize="8" fontFamily="monospace" opacity="0.8">
                    ZONE C (SPINE)
                  </text>

                  {/* Render Points on Bonnet */}
                  {heatmapMode === 'current_part' ? (
                    analytics.latest_inspection_record?.defect_count === 0 ? (
                      <g>
                        <text x="200" y="175" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                          CONFORMING BONNET: 0 DEFECTS
                        </text>
                        <text x="200" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                          Class-A Surface • Zero Die Anomaly Hotspots
                        </text>
                      </g>
                    ) : (
                      analytics.latest_inspection_record?.defects.map((d, idx) =>
                        renderBonnetDefect(d, idx)
                      )
                    )
                  ) : (
                    currentHeatmap?.bins.map((bin, idx) =>
                      renderBonnetDefect(bin, idx)
                    )
                  )}

                  {heatmapMode === 'cumulative' && (!currentHeatmap || currentHeatmap.bins.length === 0) && (
                    <text x="200" y="185" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
                      No cumulative flaws for {selectedMachine}
                    </text>
                  )}
                </svg>
              ) : (
                /* --- SVG BRAKE ROTOR POLAR CANVAS --- */
                <svg width="360" height="360" className="overflow-visible select-none">
                  <defs>
                    <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="44%" stopColor="#1e293b" />
                      <stop offset="85%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </radialGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Outer disc edge */}
                  <circle cx="180" cy="180" r="140" fill="url(#discGrad)" stroke="#475569" strokeWidth="2" />
                  <circle cx="180" cy="180" r="132" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />
                  <circle cx="180" cy="180" r="70" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 3" />
                  <circle cx="180" cy="180" r="62" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="180" cy="180" r="25" fill="#020617" stroke="#1e293b" strokeWidth="1" />

                  {/* Lug nut holes */}
                  {[0, 72, 144, 216, 288].map((angle, idx) => {
                    const rad = ((angle - 90) * Math.PI) / 180
                    const bx = 180 + 44 * Math.cos(rad)
                    const by = 180 + 44 * Math.sin(rad)
                    return <circle key={idx} cx={bx} cy={by} r="6" fill="#020617" stroke="#475569" strokeWidth="1" />
                  })}

                  {/* Angular Guide Crosshairs */}
                  <line x1="40" y1="180" x2="320" y2="180" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />
                  <line x1="180" y1="40" x2="180" y2="320" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />

                  {/* Clock-Face Hour Labels */}
                  <text x="172" y="30" fill="#94a3b8" fontSize="10" fontFamily="monospace">12h</text>
                  <text x="242" y="50" fill="#64748b" fontSize="9" fontFamily="monospace">1h</text>
                  <text x="290" y="100" fill="#64748b" fontSize="9" fontFamily="monospace">2h</text>
                  <text x="328" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">3h</text>
                  <text x="168" y="340" fill="#94a3b8" fontSize="10" fontFamily="monospace">6h</text>
                  <text x="16" y="184" fill="#94a3b8" fontSize="10" fontFamily="monospace">9h</text>

                  {/* Render Points on Rotor */}
                  {heatmapMode === 'current_part' ? (
                    analytics.latest_inspection_record?.defect_count === 0 ? (
                      <g>
                        <circle cx="180" cy="180" r="132" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.7" strokeDasharray="4 3" />
                        <text x="180" y="174" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                          CURRENT PART: 0 DEFECTS
                        </text>
                        <text x="180" y="194" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                          Conforming Surface • No Anomaly Points
                        </text>
                      </g>
                    ) : (
                      analytics.latest_inspection_record?.defects.map((d, idx) =>
                        renderRotorDefect(d, idx)
                      )
                    )
                  ) : (
                    currentHeatmap?.bins.map((bin, idx) =>
                      renderRotorDefect(bin, idx)
                    )
                  )}

                  {heatmapMode === 'cumulative' && (!currentHeatmap || currentHeatmap.bins.length === 0) && (
                    <text x="180" y="184" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
                      No cumulative flaws for {selectedMachine}
                    </text>
                  )}
                </svg>
              )}
            </div>

            {/* Heatmap Legend */}
            <div className="w-full flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-800/80 gap-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-red-500/80 border border-orange-400"></span>
                  <span>{isBonnet ? 'Predicted Dent/Crack Contour & Bloom' : 'Predicted Crack Contour & Thermal Radiation Bloom'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-red-700"></span>
                  <span>{isBonnet ? 'Die Coordinate Pinpoint' : 'Centroid at Clock-Hour Position'}</span>
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
                {isBonnet
                  ? 'Stamping Press Die Clearance & Formability Drift'
                  : 'Time-Series Tolerance Drift vs. Machine Spec Limits'}
              </h3>
              <span className="text-xs text-slate-400">
                {isBonnet
                  ? 'Tracking Die Gap Clearance (≤ 0.8 mm), Surface Flatness (≤ 0.5 mm), and Hemming Gap (≤ 0.3 mm) progression'
                  : 'Tracking DTV (≤ 5 µm), Runout (≤ 25 µm), and Parallelism (≤ 40 µm) progression across production parts'}
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
                    <th className="pb-2.5">{isBonnet ? 'Die Clearance' : 'DTV (≤ 5 µm)'}</th>
                    <th className="pb-2.5">{isBonnet ? 'Flatness' : 'Runout (≤ 25 µm)'}</th>
                    <th className="pb-2.5">{isBonnet ? 'Hem Gap' : 'Parallelism (≤ 40 µm)'}</th>
                    <th className="pb-2.5">Wear / Rework Index</th>
                    <th className="pb-2.5">Origin Machine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {analytics.time_series.slice(-15).reverse().map((ts, idx) => (
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
                      <td className="py-2.5 text-slate-300">{ts.dtv_um.toFixed(2)} {isBonnet ? 'mm' : 'µm'}</td>
                      <td className="py-2.5 text-slate-300">{ts.runout_um.toFixed(1)} {isBonnet ? 'mm' : 'µm'}</td>
                      <td className="py-2.5 text-slate-300">{ts.parallelism_um.toFixed(1)} {isBonnet ? 'mm' : 'µm'}</td>
                      <td className="py-2.5 text-cyan-400">{ts.wear_index.toFixed(1)}</td>
                      <td className="py-2.5 text-indigo-300">{ts.process_code}</td>
                    </tr>
                  ))}
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
              {isBonnet ? 'Serialized Car Bonnet Quality History' : 'Serialized Rotor Quality History'} ({analytics.records.length} Records)
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
                    <th className="pb-2.5">Station</th>
                    <th className="pb-2.5">RPN</th>
                    <th className="pb-2.5">{isBonnet ? 'Die Stamping Zone' : 'Clock Position'}</th>
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
                          ? isBonnet
                            ? `${r.defects[0].zone_name || 'Class-A Surface'} (X:${((r.defects[0].panel_x_normalized ?? 0.5) * 100).toFixed(0)}%, Y:${((r.defects[0].panel_y_normalized ?? 0.5) * 100).toFixed(0)}%)`
                            : `${r.defects[0].clock_hour || (r.defects[0].theta_degrees / 30).toFixed(1)}h (${r.defects[0].zone_name || 'Swept Band'})`
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
