'use client'

import { useDocument } from '@/context/DocumentContext'

export default function CoverageBar() {
  const { coverage } = useDocument()

  return (
    <footer className="h-10 px-4 flex items-center justify-between border-t border-border-subtle bg-main">
      <div 
        className="flex items-center gap-3 text-xs text-secondary cursor-help"
        title="This represents how much you have told us. You can tell us as much as you could!"
      >
        <span>Data coverage:</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-border-subtle rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-faint">{coverage}%</span>
        </div>
      </div>
      
      {/* Apricity Branding */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-faint">
        <span>🍊</span>
        <span>Apricity</span>
      </div>
    </footer>
  )
}
