'use client'

import { useState, useRef, useEffect } from 'react'
import { useDocument } from '@/context/DocumentContext'

export default function TopBar() {
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
    <header className="h-12 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-base">🍊</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="text-sm font-medium text-gray-900 bg-transparent border-b border-gray-300 outline-none px-0 py-0.5 min-w-[120px]"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors flex items-center gap-1 group"
          >
            {startupName}
            <svg 
              className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" 
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
          className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-md transition-all duration-200 hover:text-orange-500 hover:border-orange-400 hover:bg-orange-50"
        >
          Develop a View
        </button>
      </div>
    </header>
  )
}
