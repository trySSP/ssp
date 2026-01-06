'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useDocument } from '@/context/DocumentContext'
import { useTheme } from '@/context/ThemeContext'

export default function TopBar() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { startupName, setStartupName, saveStatus } = useDocument()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(startupName)
  const inputRef = useRef(null)

  useEffect(() => {
    setEditValue(startupName)
  }, [startupName])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    const trimmed = editValue.trim()
    if (trimmed) {
      setStartupName(trimmed)
    } else {
      setEditValue(startupName)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setEditValue(startupName)
      setIsEditing(false)
    }
  }

  const getSaveIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
            Saving...
          </span>
        )
      case 'saved':
        return (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Saved
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            Error saving
          </span>
        )
      default:
        return null
    }
  }

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border-subtle bg-main">
      <div className="flex items-center gap-3">
        <span className="text-base">🍊</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="text-sm font-medium text-primary bg-transparent border-b border-border-subtle outline-none px-0 py-0.5 min-w-[120px]"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-primary hover:text-secondary transition-colors flex items-center gap-1 group"
          >
            {startupName}
            <svg 
              className="w-3 h-3 text-faint opacity-0 group-hover:opacity-100 transition-opacity" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {getSaveIndicator()}
        <button
          onClick={() => {
            // Generate UUID and navigate to view page
            const viewId = crypto.randomUUID()
            router.push(`/${viewId}`)
          }}
          className="px-3 py-1.5 text-xs font-medium text-secondary border border-border-subtle rounded-md transition-all duration-200 hover:text-accent-primary hover:border-accent-primary hover:bg-orange-50/10"
        >
          Develop a View
        </button>

        <div className="w-px h-4 bg-border-subtle" />

        <button
          onClick={toggleTheme}
          className="p-1.5 text-secondary hover:text-primary rounded-md hover:bg-surface transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Icons.Sun className="w-4 h-4" />
          ) : (
            <Icons.Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  )
}
