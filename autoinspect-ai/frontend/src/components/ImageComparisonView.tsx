import { useState } from 'react'
import { Eye, ZoomIn } from 'lucide-react'
import type { InspectionResponse } from '../types/inspection'

interface ImageComparisonViewProps {
  originalUrl: string
  inspectionResult: InspectionResponse
}

type ViewMode = 'comparison' | 'original' | 'detection' | 'mask_only'

export const ImageComparisonView: React.FC<ImageComparisonViewProps> = ({
  originalUrl,
  inspectionResult,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison')
  const [zoomOriginal, setZoomOriginal] = useState(false)
  const [zoomAnalyzed, setZoomAnalyzed] = useState(false)

  const analyzedUrl =
    viewMode === 'mask_only' && inspectionResult.mask_overlay_base64
      ? inspectionResult.mask_overlay_base64
      : inspectionResult.annotated_image_base64 || originalUrl

  return (
    <div className="flex flex-col gap-4">
      {/* View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span>INSPECTION DISPLAY MODE:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'comparison'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('detection')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'detection'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            AI Inspection (HUD)
          </button>
          <button
            onClick={() => setViewMode('mask_only')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'mask_only'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Segmentation Only
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'original'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Original Only
          </button>
        </div>
      </div>

      {/* Main Image View Container */}
      {viewMode === 'comparison' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. ORIGINAL IMAGE PANEL */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-lg">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Original Image
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {inspectionResult.image_width} × {inspectionResult.image_height} px
              </span>
            </div>
            <div className="relative aspect-square sm:aspect-[4/3] bg-black/60 flex items-center justify-center p-2 overflow-hidden group">
              <img
                src={originalUrl}
                alt="Original Component"
                className={`max-h-full max-w-full object-contain rounded transition-transform duration-200 ${
                  zoomOriginal ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setZoomOriginal(!zoomOriginal)}
              />
              <button
                onClick={() => setZoomOriginal(!zoomOriginal)}
                className="absolute bottom-3 right-3 p-1.5 rounded bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Toggle Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. AI INSPECTION PANEL */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-cyan-800/40 bg-slate-900/60 shadow-lg shadow-cyan-950/20">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                AI Inspection (Detection & Masks)
              </span>
              <span className="text-[11px] font-mono text-cyan-500">
                {inspectionResult.defect_count} defect(s) detected
              </span>
            </div>
            <div className="relative aspect-square sm:aspect-[4/3] bg-black/60 flex items-center justify-center p-2 overflow-hidden group">
              <img
                src={analyzedUrl}
                alt="AI Analyzed Component"
                className={`max-h-full max-w-full object-contain rounded transition-transform duration-200 ${
                  zoomAnalyzed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setZoomAnalyzed(!zoomAnalyzed)}
              />
              <button
                onClick={() => setZoomAnalyzed(!zoomAnalyzed)}
                className="absolute bottom-3 right-3 p-1.5 rounded bg-slate-900/80 text-cyan-400 hover:text-white border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Toggle Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Single Full-width Image View */
        <div className="flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
              {viewMode === 'original'
                ? 'Original Component Image'
                : viewMode === 'mask_only'
                ? 'Defect Segmentation Overlay (Masks)'
                : 'Defect Detection & HUD Overlay'}
            </span>
          </div>
          <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-black/60 flex items-center justify-center p-3 overflow-hidden">
            <img
              src={viewMode === 'original' ? originalUrl : analyzedUrl}
              alt="Component View"
              className="max-h-full max-w-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  )
}
