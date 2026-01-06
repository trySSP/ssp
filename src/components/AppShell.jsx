'use client'

import { DocumentProvider } from '@/context/DocumentContext'
import TopBar from './TopBar'
import LeftRail from './LeftRail'
import ContentViewer from './ContentViewer'
import CoverageBar from './CoverageBar'

function AppShellContent() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftRail />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <ContentViewer />
        </main>
      </div>
      
      <CoverageBar />
    </div>
  )
}

export default function AppShell() {
  return (
    <DocumentProvider>
      <AppShellContent />
    </DocumentProvider>
  )
}
