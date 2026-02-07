'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useDocument } from '@/context/DocumentContext'

/**
 * View Processing Page
 * 
 * Displays the status of a view being generated and results.
 * Integrates with DocumentContext to read inputs and update status.
 */

// Processing stages for visual feedback during pending state
const STAGES = [
  { id: 'collecting', label: 'Collecting documents', icon: 'FileStack' },
  { id: 'analyzing', label: 'Analyzing content', icon: 'Search' },
  { id: 'processing', label: 'Processing with AI', icon: 'Sparkles' },
  { id: 'generating', label: 'Generating view', icon: 'Layout' }
]

export default function ViewPage() {
  const params = useParams()
  const viewId = params.viewId
  
  const { views, updateView, isLoaded } = useDocument()
  const view = views?.[viewId]
  
  const [currentStage, setCurrentStage] = useState(0)
  const isFetchingRef = useRef(false)

  // Animation for stages
  useEffect(() => {
    if (view?.status === 'pending') {
      const interval = setInterval(() => {
        setCurrentStage(prev => {
          if (prev < STAGES.length - 1) return prev + 1
          return prev
        })
      }, 1500)
      return () => clearInterval(interval)
    } else if (view?.status === 'completed') {
      setCurrentStage(STAGES.length - 1)
    }
  }, [view?.status])

  // Trigger analysis if pending
  useEffect(() => {
    if (!isLoaded || !view) return

    if (view.status === 'pending' && !isFetchingRef.current) {
      isFetchingRef.current = true;

      (async () => {
        try {
          const response = await fetch('/api/views', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: view.content
            })
          })

          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`)
          }

          const data = await response.json()
          
          if (data.error) {
            throw new Error(data.error)
          }

         updateView(viewId, {
  status: 'completed',
  data: data
})


updateView(viewId, {
  status: 'completed',
  data: data 
})

        } catch (error) {
          console.error('View generation failed:', error)
          updateView(viewId, {
            status: 'error',
            error: error.message || 'Failed to generate view'
          })
        } finally {
          isFetchingRef.current = false
        }
      })()
    }
  }, [isLoaded, view, viewId, updateView])

  // Get icon component
  const getIcon = (iconName, className = 'w-5 h-5') => {
    const IconComponent = Icons[iconName]
    return IconComponent ? <IconComponent className={className} /> : null
  }

  // Loading state for context
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Icons.Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // 404 State
  if (!view) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icons.FileQuestion className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-medium text-primary mb-2">View Not Found</h1>
        <p className="text-secondary mb-6 text-center max-w-sm">
          The requested view ID does not exist or has been deleted.
        </p>
        <Link 
          href="/"
          className="px-4 py-2 bg-main border border-border-subtle rounded-lg text-sm text-primary hover:bg-surface transition-colors"
        >
          Return to Workspace
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border-subtle bg-main">
        <div className="flex items-center gap-3">
          <span className="text-lg">🍊</span>
          <span className="font-medium text-primary">Apricity</span>
        </div>
        <Link 
          href="/"
          className="text-sm text-secondary hover:text-primary transition-colors flex items-center gap-1"
        >
          <Icons.ArrowLeft className="w-4 h-4" />
          Back to workspace
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {view.status === 'pending' && (
          <div className="max-w-md w-full">
            {/* Processing indicator */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-border-subtle" />
                <div className="absolute inset-0 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
              </div>
              <h1 className="text-2xl font-medium text-primary mb-2">
                Developing your view
              </h1>
              <p className="text-secondary">
                Analyzing your documents...
              </p>
            </div>

            {/* Progress stages */}
            <div className="bg-main rounded-xl border border-border-subtle p-6 shadow-sm">
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
                          ? 'bg-accent-success/20 text-accent-success'
                          : isCurrent
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : 'bg-surface text-secondary'
                      }`}>
                        {isComplete ? (
                          <Icons.Check className="w-4 h-4" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
                        ) : (
                          getIcon(stage.icon, 'w-4 h-4')
                        )}
                      </div>
                      <span className={`text-sm ${
                        isComplete || isCurrent ? 'text-primary' : 'text-faint'
                      }`}>
                        {stage.label}
                      </span>
                      {isCurrent && (
                        <Icons.Loader2 className="w-4 h-4 text-accent-primary animate-spin ml-auto" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* View ID */}
            <div className="mt-6 text-center">
              <p className="text-xs text-secondary">
                View ID: <code className="bg-surface border border-border-subtle px-2 py-0.5 rounded text-primary">{viewId}</code>
              </p>
            </div>
          </div>
        )}

        {view.status === 'completed' && (
          <div className="max-w-4xl w-full">
            <div className="bg-main rounded-xl border border-border-subtle p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-medium text-primary flex items-center gap-2">
                  <Icons.Sparkles className="w-6 h-6 text-accent-primary" />
                  Analysis Result
                </h1>
                <span className="text-xs text-secondary">
                  Generated {new Date(view.createdAt).toLocaleString()}
                </span>
              </div>
              
              <div className="prose prose-sm max-w-none text-secondary">
  {view.data && typeof view.data === 'object' &&
    Object.entries(view.data).map(([key, value]) => (
      <div key={key} className="mb-6">
        <h3 className="text-sm font-semibold uppercase text-primary mb-2">
          {key.replace(/_/g, ' ')}
        </h3>
        <div className="whitespace-pre-wrap">
          {value}
        </div>
      </div>
    ))
  }
</div>

            </div>
          </div>
        )}

        {view.status === 'error' && (
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <Icons.AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-medium text-primary mb-2">
              Analysis Failed
            </h1>
            <p className="text-secondary mb-6">
              {view.error || 'Failed to generate view. Please try again.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-main rounded-lg hover:bg-secondary transition-colors"
            >
              <Icons.ArrowLeft className="w-4 h-4" />
              Back to workspace
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
