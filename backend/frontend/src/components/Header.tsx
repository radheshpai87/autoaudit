import { ShieldCheck, Cpu, HardDrive } from 'lucide-react'
import type { HealthResponse } from '../types/inspection'

interface HeaderProps {
  health: HealthResponse | null
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">AUTOINSPECT AI</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                v1.0-MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Automotive Component Quality Inspection System
            </p>
          </div>
        </div>

        {/* System & Model status HUD badge */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {health ? (
            <>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
                  health.inference_mode === 'real_ai'
                    ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  ENGINE:{' '}
                  <strong>{health.inference_mode === 'real_ai' ? 'YOLO-SEG AI' : 'DEMO / MOCK'}</strong>
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[180px]" title={health.weights_path}>
                  {health.weights_path || 'No weights configured'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/50 border border-slate-700 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Connecting to inspection backend...
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
