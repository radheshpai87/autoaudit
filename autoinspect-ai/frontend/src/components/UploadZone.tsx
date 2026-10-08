import React, { useRef, useState } from 'react'
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react'

interface UploadZoneProps {
  onImageSelected: (file: File) => void
  disabled?: boolean
  selectedFileName?: string
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onImageSelected,
  disabled = false,
  selectedFileName,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateAndPass = (file: File) => {
    setErrorMsg(null)
    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg']
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpe?g|png)$/i)) {
      setErrorMsg('Please select a valid image file (JPG, JPEG, or PNG).')
      return
    }

    const maxBytes = 20 * 1024 * 1024
    if (file.size > maxBytes) {
      setErrorMsg('File size exceeds 20MB limit.')
      return
    }

    onImageSelected(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0])
    }
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-105 group-hover:bg-cyan-950 group-hover:text-cyan-400 transition-all border border-slate-700">
            {selectedFileName ? <ImageIcon className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">
              {selectedFileName ? (
                <span className="text-cyan-300 font-mono text-sm">{selectedFileName}</span>
              ) : (
                'Upload Automotive Component Image'
              )}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Drag & drop or browse to inspect brake rotors, machined shafts, engine blocks, or castings.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>FORMATS: JPG, JPEG, PNG</span>
            <span>•</span>
            <span>MAX: 20MB</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
