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
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef(null)

  // Sync title value when document changes
  useEffect(() => {
    if (activeDocument) {
      setTitleValue(activeDocument.title)
      setIsEditingTitle(false)
    }
  }, [activeDocument?.id])

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
  }, [editor, activeDocument])

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-300 text-sm">Loading...</div>
      </div>
    )
  }

  if (!activeDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <Icons.FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            Select a document or create a new one<br />
            using the <span className="font-medium">+</span> button
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {/* Document header */}
      <div className="px-16 pt-8 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            {getIcon(activeDocument.icon, 'w-6 h-6')}
          </span>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="text-xl font-medium text-gray-900 bg-transparent border-b border-gray-300 outline-none py-0.5 min-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-medium text-gray-900 hover:text-gray-600 transition-colors flex items-center gap-2 group"
            >
              {activeDocument.title}
              <Icons.Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </div>
      
      <EditorContent editor={editor} />
    </div>
  )
}

