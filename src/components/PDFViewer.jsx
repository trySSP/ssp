'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PDFViewer({ file }) {
  const [zoom, setZoom] = useState(100)

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface/50">
        <div className="text-center">
          <Icons.FileType className="w-10 h-10 text-border-subtle mx-auto mb-4" />
          <p className="text-faint text-sm">No PDF selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-main">
      {/* PDF Header */}
      <div className="px-6 py-4 bg-surface border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent-primary">
              <Icons.FileType className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-lg font-medium text-primary">{file.name}</h1>
              <p className="text-xs text-secondary">
                {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-main text-secondary hover:text-primary transition-colors"
              aria-label="Zoom out"
            >
              <Icons.ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-faint w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-main text-secondary hover:text-primary transition-colors"
              aria-label="Zoom in"
            >
              <Icons.ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border-subtle mx-2" />
            <a
              href={file.data}
              download={file.name}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-main text-secondary hover:text-primary transition-colors"
              aria-label="Download PDF"
            >
              <Icons.Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      
      {/* PDF Embed */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div 
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{ 
            width: `${zoom}%`,
            maxWidth: '100%',
            height: 'fit-content'
          }}
        >
          <iframe
            src={`${file.data}#toolbar=0&navpanes=0`}
            className="w-full"
            style={{ minHeight: 'calc(100vh - 12rem)' }}
            title={file.name}
          />
        </div>
      </div>
    </div>
  )
}
