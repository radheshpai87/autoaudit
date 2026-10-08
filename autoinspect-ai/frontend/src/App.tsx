import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { ImageComparisonView } from './components/ImageComparisonView'
import { InspectionSummary } from './components/InspectionSummary'
import type { HealthResponse, InspectionResponse } from './types/inspection'
import { Loader2, AlertCircle } from 'lucide-react'

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [inspectionResult, setInspectionResult] = useState<InspectionResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch backend health on mount
  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
      }
    } catch (err) {
      console.warn('Backend currently unreachable:', err)
    }
  }

  const handleImageSelected = async (file: File) => {
    setSelectedFile(file)
    setErrorMessage(null)

    // Create object URL for immediate original preview
    const previewUrl = URL.createObjectURL(file)
    setOriginalImageUrl(previewUrl)

    // Trigger inspection API call
    runInspection(file)
  }

  const runInspection = async (file: File) => {
    setIsInspecting(true)
    setErrorMessage(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server responded with code ${res.status}`)
      }

      const data: InspectionResponse = await res.json()
      setInspectionResult(data)
    } catch (err: any) {
      console.error('Inspection failed:', err)
      setErrorMessage(err.message || 'Inspection failed. Please try again.')
    } finally {
      setIsInspecting(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setOriginalImageUrl(null)
    setInspectionResult(null)
    setErrorMessage(null)
  }

  // Pre-load real inspection sample image from API for instant user testing
  const loadQuickSample = async (sampleType: 'good' | 'almost_worn' | 'crack' | 'surface' | 'anomaly') => {
    const filenameMap: Record<string, string> = {
      good: 'sample_rotor_good.jpg',
      almost_worn: 'sample_rotor_almost_worn.jpg',
      crack: 'sample_rotor_crack.jpg',
      surface: 'sample_surface_defect.jpg',
      anomaly: 'sample_rotor_unknown_anomaly.jpg',
    }
    const filename = filenameMap[sampleType] || 'part.jpg'

    try {
      setIsInspecting(true)
      const res = await fetch(`/api/sample/${sampleType}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch sample (${res.statusText})`)
      }
      const blob = await res.blob()
      const testFile = new File([blob], filename, { type: 'image/jpeg' })
      setSelectedFile(testFile)
      setOriginalImageUrl(URL.createObjectURL(blob))
      await runInspection(testFile)
    } catch (err: any) {
      setErrorMessage('Could not load sample: ' + err.message)
      setIsInspecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Industrial Header */}
      <Header health={health} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        {/* Intro Hero Banner (when no inspection active) */}
        {!inspectionResult && !isInspecting && (
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto pt-6 pb-2">
            <span className="text-xs font-mono font-semibold tracking-widest text-cyan-400 uppercase px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/80 mb-3">
              Automated Optical Inspection (AOI)
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Precision Automotive Brake Defect Detection
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Upload automotive brake disc photos. The system classifies anomalies into{' '}
              <span className="text-rose-300 font-semibold font-mono">Thermal Fractures</span>,{' '}
              <span className="text-blue-300 font-semibold font-mono">Surface-Level Defects (GC10-DET)</span>, and{' '}
              <span className="text-purple-300 font-semibold font-mono">Unknown Anomalies</span>, complete with
              engineering root-cause explanations and workshop actions.
            </p>

            {/* Quick Test Presets Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-500 font-mono">Quick Test Presets:</span>
              <button
                onClick={() => loadQuickSample('good')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono transition-colors border border-emerald-800/80 font-bold"
              >
                1. GOOD (Pass)
              </button>
              <button
                onClick={() => loadQuickSample('almost_worn')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono transition-colors border border-amber-800/80 font-bold"
              >
                2. ALMOST WORN
              </button>
              <button
                onClick={() => loadQuickSample('crack')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono transition-colors border border-rose-800/80 font-bold"
              >
                3. THERMAL DEFECT (Crack)
              </button>
              <button
                onClick={() => loadQuickSample('surface')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono transition-colors border border-blue-800/80 font-bold"
              >
                4. SURFACE DEFECT (GC10-DET)
              </button>
              <button
                onClick={() => loadQuickSample('anomaly')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono transition-colors border border-purple-900/80 font-bold"
              >
                5. UNKNOWN ANOMALY
              </button>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {!inspectionResult && !isInspecting && (
          <div className="max-w-2xl mx-auto w-full">
            <UploadZone
              onImageSelected={handleImageSelected}
              disabled={isInspecting}
              selectedFileName={selectedFile?.name}
            />
          </div>
        )}

        {/* Loading Spinner */}
        {isInspecting && (
          <div className="flex flex-col items-center justify-center p-16 gap-4 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <div className="text-center">
              <h3 className="text-base font-bold text-white font-mono">
                RUNNING AI INFERENCE...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Executing segmentation masks, calculating bounding boxes, and evaluating defect severity.
              </p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-0.5">Inspection Error</h4>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Inspection Results View */}
        {inspectionResult && originalImageUrl && (
          <div className="flex flex-col gap-8">
            {/* Side-by-Side Comparison Panels */}
            <ImageComparisonView
              originalUrl={originalImageUrl}
              inspectionResult={inspectionResult}
            />

            {/* Industrial Inspection Summary & Detected Defects */}
            <InspectionSummary
              inspection={inspectionResult}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      {/* Industrial Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>AUTOINSPECT AI PLATFORM</span>
          <span>•</span>
          <span>STAGE 1: DEFECT SEGMENTATION MVP</span>
        </div>
        <div>
          <span>Architecture: Modular Model Engine (YOLO / DINOv2 / PatchCore Ready)</span>
        </div>
      </footer>
    </div>
  )
}

export default App
