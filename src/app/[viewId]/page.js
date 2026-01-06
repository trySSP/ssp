'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import * as Icons from 'lucide-react'

/**
 * View Processing Page
 * 
 * This page displays the status of a view being generated.
 * It polls the backend API with the viewId (UUID) and displays
 * the results when ready.
 */

// Processing stages for visual feedback
const STAGES = [
  { id: 'collecting', label: 'Collecting documents', icon: 'FileStack' },
  { id: 'analyzing', label: 'Analyzing content', icon: 'Search' },
  { id: 'processing', label: 'Processing with AI', icon: 'Sparkles' },
  { id: 'generating', label: 'Generating view', icon: 'Layout' }
]

export default function ViewPage() {
  const params = useParams()
  const viewId = params.viewId
  
  const [status, setStatus] = useState('processing') // 'processing' | 'ready' | 'error'
  const [currentStage, setCurrentStage] = useState(0)
  const [viewData, setViewData] = useState(null)
  const [error, setError] = useState(null)

  // Simulate stage progression (will be replaced with actual API polling)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < STAGES.length - 1) return prev + 1
        return prev
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Poll API for view status
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/views/${viewId}`)
        // const data = await response.json()
        // 
        // if (data.status === 'ready') {
        //   setStatus('ready')
        //   setViewData(data.view)
        //   clearInterval(pollInterval)
        // }
      } catch (err) {
        console.error('Failed to poll view status:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [viewId])

  // Get icon component
  const getIcon = (iconName, className = 'w-5 h-5') => {
    const IconComponent = Icons[iconName]
    return IconComponent ? <IconComponent className={className} /> : null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-lg">🍊</span>
          <span className="font-medium text-gray-900">Apricity</span>
        </div>
        <a 
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <Icons.ArrowLeft className="w-4 h-4" />
          Back to workspace
        </a>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {status === 'processing' && (
          <div className="max-w-md w-full">
            {/* Processing indicator */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
              </div>
              <h1 className="text-2xl font-medium text-gray-900 mb-2">
                Developing your view
              </h1>
              <p className="text-gray-500">
                This may take a few moments...
              </p>
            </div>

            {/* Progress stages */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="space-y-4">
                {STAGES.map((stage, index) => {
                  const isComplete = index < currentStage
                  const isCurrent = index === currentStage
                  
                  return (
                    <div 
                      key={stage.id}
                      className={`flex items-center gap-4 ${
                        isComplete || isCurrent ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isComplete 
                          ? 'bg-green-100 text-green-600'
                          : isCurrent
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isComplete ? (
                          <Icons.Check className="w-4 h-4" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        ) : (
                          getIcon(stage.icon, 'w-4 h-4')
                        )}
                      </div>
                      <span className={`text-sm ${
                        isComplete || isCurrent ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {stage.label}
                      </span>
                      {isCurrent && (
                        <Icons.Loader2 className="w-4 h-4 text-orange-500 animate-spin ml-auto" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* View ID */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                View ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{viewId}</code>
              </p>
            </div>
          </div>
        )}

        {status === 'ready' && viewData && (
          <div className="max-w-4xl w-full">
            {/* TODO: Render the actual view content */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <h1 className="text-2xl font-medium text-gray-900 mb-4">View Ready</h1>
              <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(viewData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <Icons.AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-500 mb-6">
              {error || 'Failed to generate view. Please try again.'}
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Icons.ArrowLeft className="w-4 h-4" />
              Back to workspace
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
