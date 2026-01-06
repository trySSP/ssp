'use client'

import { useDocument } from '@/context/DocumentContext'

export default function CoverageBar() {
  const { coverage } = useDocument()

  return (
    <footer className="h-10 px-4 flex items-center justify-between border-t border-gray-200 bg-white">
      <div 
        className="flex items-center gap-3 text-xs text-gray-400 cursor-help"
        title="This represents how much you have told us. You can tell us as much as you could!"
      >
        <span>Data coverage:</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono">{coverage}%</span>
        </div>
      </div>
      
      {/* Apricity Branding */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <span>🍊</span>
        <span>Apricity</span>
      </div>
    </footer>
  )
}
