import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Activity,
  Layers,
  MapPin,
  Maximize2,
  Wrench,
  FileText,
  Disc,
} from 'lucide-react'
import type { InspectionResponse, SeverityLevel, OverallStatus } from '../types/inspection'

interface InspectionSummaryProps {
  inspection: InspectionResponse
  onReset: () => void
}

export const InspectionSummary: React.FC<InspectionSummaryProps> = ({
  inspection,
  onReset,
}) => {
  const primaryDefect = inspection.detections.length > 0 ? inspection.detections[0] : null

  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-950/80 text-red-300 border-red-700/80 ring-red-500/30'
      case 'high':
        return 'bg-orange-950/80 text-orange-300 border-orange-700/80 ring-orange-500/30'
      case 'medium':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/80 ring-amber-500/30'
      case 'low':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/80 ring-blue-500/30'
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700'
    }
  }

  const getOverallStatusDisplay = (status: OverallStatus) => {
    switch (status) {
      case 'PASS':
        return {
          label: 'QA PASS — ROTOR APPROVED',
          description: 'No cracks, heat checks, or severe grooving detected. Rotor within safe operational tolerance.',
          badgeBg: 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />,
        }
      case 'REVIEW':
        return {
          label: 'REQUIRES WORKSHOP REVIEW',
          description: 'Non-critical scoring or unknown surface anomaly flagged. Measure thickness and check runout.',
          badgeBg: 'bg-amber-950/60 border-amber-500/70 text-amber-300',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />,
        }
      case 'REJECT':
        return {
          label: 'QA REJECT — CONDEMN ROTOR',
          description: 'Critical structural crack or deep thermal damage detected. Rotor must not be re-fitted.',
          badgeBg: 'bg-red-950/60 border-red-500/70 text-red-300',
          icon: <AlertOctagon className="w-8 h-8 text-red-400 shrink-0" />,
        }
    }
  }

  const overall = getOverallStatusDisplay(inspection.overall_status)

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Overall QA Status Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${overall.badgeBg}`}
      >
        <div className="flex items-center gap-4">
          {overall.icon}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-cyan-400" />
                Brake Rotor QA Status
              </span>
              {inspection.inference_mode === 'demo_mock' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                  DEMO/MOCK
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white m-0">
              {overall.label}
            </h2>
            <p className="text-xs mt-0.5 opacity-90">{overall.description}</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg bg-slate-900/90 text-white hover:bg-slate-800 border border-slate-700 text-xs font-medium transition-all shadow shrink-0"
        >
          Run New Inspection
        </button>
      </div>

      {/* 1.5. Trained Condition Classification Triage (GOOD vs ALMOST_WORN vs FAULTY) */}
      {inspection.condition_classification && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase m-0">
                AI Condition Classifier (Trained 3-Class Brake Model)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Confidence: {(inspection.condition_classification.confidence * 100).toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Condition Badge Card */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Triage State</span>
              <div className="my-2">
                <span
                  className={`inline-block px-3 py-1 rounded-md text-sm font-black tracking-wider uppercase border ${
                    inspection.condition_classification.condition === 'GOOD'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : inspection.condition_classification.condition === 'ALMOST_WORN'
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : 'bg-red-950 text-red-300 border-red-600'
                  }`}
                >
                  {inspection.condition_classification.condition.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {inspection.condition_classification.triage_verdict}
              </p>
            </div>

            {/* Wear & Damage Index */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Wear Index</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {inspection.condition_classification.wear_index_score.toFixed(1)} / 100
                </span>
              </div>
              <div className="my-3 w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    inspection.condition_classification.wear_index_score > 70
                      ? 'bg-red-500'
                      : inspection.condition_classification.wear_index_score > 40
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, inspection.condition_classification.wear_index_score)}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {inspection.condition_classification.wear_index_score > 70
                  ? 'Exceeds discard limit'
                  : inspection.condition_classification.wear_index_score > 40
                  ? 'Approaching discard spec'
                  : 'Minimal surface wear'}
              </span>
            </div>

            {/* Probability Distribution */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between text-xs font-mono">
              <span className="text-[11px] text-slate-400 uppercase">Class Probabilities</span>
              <div className="flex flex-col gap-1.5 my-2">
                {Object.entries(inspection.condition_classification.probabilities).map(([cName, prob]) => (
                  <div key={cName} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{cName.replace('_', ' ')}:</span>
                    <span className="text-slate-200 font-bold">{((prob as number) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Primary Inspection Result Card with Engineering Explanation */}
      {primaryDefect ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-400 uppercase flex items-center gap-2 m-0">
              <Activity className="w-4 h-4" />
              Primary Brake Disc Defect
            </h3>
            <span className="text-xs font-mono text-slate-400">
              ID: {inspection.image_id.slice(0, 8)}
            </span>
          </div>

          {/* Metric Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Defect Type */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Defect
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-wide">
                  {primaryDefect.defect_type.toUpperCase()}
                </span>
                {primaryDefect.is_unknown_anomaly && (
                  <span title="Anomaly detected but classification confidence below threshold">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                  </span>
                )}
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Confidence
              </span>
              <span className="text-lg font-mono font-bold text-cyan-400">
                {(primaryDefect.confidence * 100).toFixed(1)}%
              </span>
            </div>

            {/* Origin Classification: Surface-level vs Thermal vs Unknown */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Anomaly Origin
              </span>
              <div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                    primaryDefect.anomaly_origin === 'thermal'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-700/80'
                      : primaryDefect.anomaly_origin === 'surface_level'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-700/80'
                      : 'bg-purple-950/80 text-purple-300 border-purple-700/80'
                  }`}
                >
                  {primaryDefect.anomaly_origin === 'thermal'
                    ? 'THERMAL DEFECT'
                    : primaryDefect.anomaly_origin === 'surface_level'
                    ? 'SURFACE LEVEL'
                    : 'UNKNOWN ANOMALY'}
                </span>
              </div>
            </div>

            {/* Severity */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Severity
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ring-1 ${getSeverityBadgeClass(
                  primaryDefect.severity
                )}`}
              >
                {primaryDefect.severity.toUpperCase()}
              </span>
            </div>

            {/* Location */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Rotor Zone
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{primaryDefect.location || 'Outer Friction Ring'}</span>
              </div>
            </div>

            {/* Defect Area */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Defect Area
              </span>
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-lg font-mono font-bold text-slate-200">
                  {primaryDefect.area_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Engineering Explanation & Action Box */}
          {(primaryDefect.explanation || primaryDefect.recommendation) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {primaryDefect.explanation && (
                <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase">
                    <FileText className="w-4 h-4" />
                    <span>Engineering Root-Cause Diagnosis:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {primaryDefect.explanation}
                  </p>
                </div>
              )}

              {primaryDefect.recommendation && (
                <div className="p-4 rounded-lg bg-slate-950/70 border border-cyan-900/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase">
                    <Wrench className="w-4 h-4" />
                    <span>Recommended Workshop / QA Action:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {primaryDefect.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-emerald-300 mb-1">
            No Visible Defects Detected
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Brake rotor swept friction surface and cooling chamfers conform to manufacturer OE tolerances.
          </p>
        </div>
      )}

      {/* 3. DETECTED DEFECTS LIST (Table with Explanations) */}
      {inspection.detections.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-2 m-0">
              <Layers className="w-4 h-4 text-cyan-400" />
              Detected Defects & Rotor Anomaly Breakdown ({inspection.detections.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Model: {inspection.model_name}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 font-mono text-xs">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-950/40 text-slate-400 uppercase font-semibold text-[11px]">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Brake Defect Classification</div>
              <div className="col-span-2">Confidence</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-3 text-right">Rotor Zone & Area</div>
            </div>

            {/* Rows */}
            {inspection.detections.map((defect, idx) => (
              <div key={idx} className="flex flex-col px-6 py-3 hover:bg-slate-800/30 transition-colors gap-2">
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-1 text-slate-500 font-bold">{idx + 1}.</div>
                  <div className="col-span-4 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-100">
                      {defect.defect_type}
                    </span>
                    {defect.anomaly_origin && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${
                          defect.anomaly_origin === 'thermal'
                            ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                            : defect.anomaly_origin === 'surface_level'
                            ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                            : 'bg-purple-950/70 text-purple-300 border-purple-800'
                        }`}
                      >
                        {defect.anomaly_origin === 'thermal'
                          ? 'Thermal'
                          : defect.anomaly_origin === 'surface_level'
                          ? 'Surface'
                          : 'Unknown'}
                      </span>
                    )}
                    {defect.is_unknown_anomaly && (
                      <span className="text-[10px] px-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        Low Class Conf
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-cyan-400 font-bold">
                    {(defect.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ring-1 ${getSeverityBadgeClass(
                        defect.severity
                      )}`}
                    >
                      {defect.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-3 text-right text-slate-400">
                    <span className="font-medium text-slate-200">{defect.location || 'Friction Ring'}</span>
                    <span className="text-slate-500 text-[10px] block">
                      Area: {defect.area_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Inline Defect Explanation if secondary */}
                {idx > 0 && defect.explanation && (
                  <div className="text-[11px] text-slate-400 pl-8 pr-2 font-sans bg-slate-950/40 p-2 rounded border border-slate-800/60 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{defect.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
