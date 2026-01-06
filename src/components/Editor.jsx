'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import * as Icons from 'lucide-react'
import { useDocument } from '@/context/DocumentContext'
import { useEffect, useRef, useState } from 'react'

/**
 * Get Lucide icon component by name
 */
function getIcon(iconName, className = 'w-5 h-5') {
  const IconComponent = Icons[iconName]
  if (!IconComponent) {
    return <Icons.FileText className={className} />
  }
  return <IconComponent className={className} />
}

export default function Editor() {
  const { activeDocument, updateDocumentContent, updateDocumentTitle, isLoaded } = useDocument()
  const editorRef = useRef(null)
  const lastDocIdRef = useRef(null)
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(activeDocument?.title || '')
  const [prevDocId, setPrevDocId] = useState(activeDocument?.id)
  const titleInputRef = useRef(null)

  // Sync title value when document changes (Render-time adjustment pattern)
  // This avoids the ESLint error about calling setState in useEffect
  if (activeDocument && activeDocument.id !== prevDocId) {
    setPrevDocId(activeDocument.id)
    setTitleValue(activeDocument.title)
    setIsEditingTitle(false)
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleSubmit = () => {
    const trimmed = titleValue.trim()
    if (trimmed && activeDocument) {
      updateDocumentTitle(activeDocument.id, trimmed)
    } else {
      setTitleValue(activeDocument?.title || '')
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setTitleValue(activeDocument?.title || '')
      setIsEditingTitle(false)
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...'
          }
          return 'Start writing your thoughts...'
        },
        emptyEditorClass: 'is-editor-empty'
      })
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-gray max-w-none focus:outline-none min-h-[calc(100vh-12rem)] px-16 py-8'
      }
    },
    onUpdate: ({ editor }) => {
      updateDocumentContent(editor.getJSON())
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor
    }
  })

  // Load content when active document changes
  useEffect(() => {
    if (editor && activeDocument) {
      // Only update content if document changed
      if (lastDocIdRef.current !== activeDocument.id) {
        if (activeDocument.content) {
          editor.commands.setContent(activeDocument.content)
        } else {
          editor.commands.clearContent()
        }
        lastDocIdRef.current = activeDocument.id
        editor.commands.focus('end')
      }
    } else if (editor && !activeDocument) {
      editor.commands.clearContent()
      lastDocIdRef.current = null
    }
  }, [editor, activeDocument, isLoaded])

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-300 text-sm">Loading...</div>
      </div>
    )
  }

  if (!activeDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface/50">
      <div className="text-center">
        <Icons.FileText className="w-10 h-10 text-border-subtle mx-auto mb-4" />
        <p className="text-faint text-sm">
          Select a document to start writing<br />
          or create a new one
        </p>
      </div>
    </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center loading-fade-in relative">
        {/* Document Header with Title */}
        <div className="w-full max-w-3xl px-16 pt-8 pb-4 flex items-center gap-3">
          <div className="text-accent-primary">
            {getIcon(activeDocument.icon, 'w-8 h-8')}
          </div>
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-3xl font-medium text-primary bg-transparent border-b border-border-subtle outline-none py-1"
                placeholder="Untitled"
              />
            ) : (
              <h1 
                onClick={() => setIsEditingTitle(true)}
                className="text-3xl font-medium text-primary hover:text-secondary transition-colors cursor-text py-1 border-b border-transparent hover:border-border-subtle"
              >
                {activeDocument.title || 'Untitled'}
              </h1>
            )}
          </div>
        </div>

        <EditorContent editor={editor} className="flex-1 w-full max-w-3xl" />
      </div>
  )
}

