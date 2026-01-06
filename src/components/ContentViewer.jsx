'use client'

import { useDocument } from '@/context/DocumentContext'
import Editor from './Editor'
import PDFViewer from './PDFViewer'
import * as Icons from 'lucide-react'

/**
 * ContentViewer - Unified content area that switches between Editor and PDFViewer
 * 
 * This component handles the display logic based on activeItemType:
 * - 'document' → shows the rich text Editor
 * - 'file' → shows the PDFViewer
 * - null → shows empty state
 */
export default function ContentViewer() {
  const { activeItemType, activeFile, isLoaded } = useDocument()

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-300 text-sm">Loading...</div>
      </div>
    )
  }

  // No active item
  if (!activeItemType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <Icons.FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            Select a document or upload a PDF<br />
            using the <span className="font-medium">+</span> button
          </p>
        </div>
      </div>
    )
  }

  // Active file (PDF)
  if (activeItemType === 'file') {
    return <PDFViewer file={activeFile} />
  }

  // Active document (rich text)
  return <Editor />
}
