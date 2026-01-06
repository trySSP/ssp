'use client'

import { useState, useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Icons from 'lucide-react'
import { ARTIFACT_TEMPLATES } from '@/config/artifacts'
import { useDocument } from '@/context/DocumentContext'

/**
 * Get Lucide icon component by name
 */
function getIcon(iconName, className = 'w-4 h-4') {
  const IconComponent = Icons[iconName]
  if (!IconComponent) {
    return <Icons.FileText className={className} />
  }
  return <IconComponent className={className} />
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LeftRail() {
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef(null)
  const { 
    documentList, 
    fileList, 
    activeDocId,
    activeFileId,
    createDocument, 
    setActiveDocument,
    setActiveFile,
    deleteDocument,
    uploadFile,
    deleteFile 
  } = useDocument()

  const handleCreateDocument = (template) => {
    createDocument(template)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      await uploadFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Separate custom from templates for cleaner rendering
  const regularTemplates = ARTIFACT_TEMPLATES.filter(t => t.id !== 'custom')
  const customTemplate = ARTIFACT_TEMPLATES.find(t => t.id === 'custom')

  return (
    <aside 
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
        isExpanded ? 'w-56' : 'w-12'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header with expand toggle */}
      <div className="flex items-center justify-between px-2 py-3 border-b border-gray-100">
        {isExpanded && (
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2">
            Documents
          </span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 ml-auto"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Icons.ChevronRight 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Add new document button */}
      <div className="p-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={`flex items-center gap-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 ${
                isExpanded ? 'w-full px-3 py-2' : 'w-8 h-8 justify-center'
              }`}
              aria-label="Add document"
            >
              <Icons.Plus className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="text-sm">New Document</span>}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              sideOffset={8}
              side="right"
              align="start"
            >
              <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Choose Template
              </div>
              
              <div className="h-px bg-gray-100 my-1" />
              
              {regularTemplates.map((template) => (
                <DropdownMenu.Item
                  key={template.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
                  onSelect={() => handleCreateDocument(template)}
                >
                  <span className="text-gray-400">
                    {getIcon(template.icon)}
                  </span>
                  <span>{template.title}</span>
                </DropdownMenu.Item>
              ))}
              
              {customTemplate && (
                <>
                  <div className="h-px bg-gray-100 my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
                    onSelect={() => handleCreateDocument(customTemplate)}
                  >
                    <span className="text-gray-400">
                      {getIcon(customTemplate.icon)}
                    </span>
                    <span>{customTemplate.title}</span>
                  </DropdownMenu.Item>
                </>
              )}
              
              {/* PDF Upload Option */}
              <div className="h-px bg-gray-100 my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer outline-none transition-colors"
                onSelect={() => fileInputRef.current?.click()}
              >
                <span className="text-gray-400">
                  <Icons.Upload className="w-4 h-4" />
                </span>
                <span>Upload a PDF</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Document and File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Documents */}
        {documentList.map((doc) => (
          <div
            key={doc.id}
            className={`group flex items-center gap-2 mx-2 rounded-lg cursor-pointer transition-colors ${
              activeDocId === doc.id 
                ? 'bg-orange-50 text-orange-600' 
                : 'hover:bg-gray-50 text-gray-600'
            } ${isExpanded ? 'px-3 py-2' : 'w-8 h-8 justify-center'}`}
            onClick={() => setActiveDocument(doc.id)}
            title={doc.title}
          >
            <span className={`flex-shrink-0 ${activeDocId === doc.id ? 'text-orange-500' : 'text-gray-400'}`}>
              {getIcon(doc.icon)}
            </span>
            {isExpanded && (
              <>
                <span className="text-sm truncate flex-1">{doc.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDocument(doc.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-all text-gray-400 hover:text-gray-600"
                  aria-label="Delete document"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        
        {/* Files section */}
        {fileList.length > 0 && (
          <>
            {isExpanded && (
              <div className="px-4 py-2 mt-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-t border-gray-100">
                Files
              </div>
            )}
            {fileList.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                  activeFileId === file.id 
                    ? 'bg-red-50 text-red-600' 
                    : 'hover:bg-gray-50 text-gray-600'
                } ${isExpanded ? 'px-3 py-2' : 'w-8 h-8 justify-center'}`}
                onClick={() => setActiveFile(file.id)}
                title={`${file.name} (${formatFileSize(file.size)})`}
              >
                <span className={`flex-shrink-0 ${activeFileId === file.id ? 'text-red-500' : 'text-gray-400'}`}>
                  <Icons.FileType className="w-4 h-4" />
                </span>
                {isExpanded && (
                  <>
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(file.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-all text-gray-400 hover:text-gray-600"
                      aria-label="Delete file"
                    >
                      <Icons.X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </>
        )}
        
        {documentList.length === 0 && fileList.length === 0 && isExpanded && (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            No documents yet.<br />Click + to create one.
          </div>
        )}
      </div>
    </aside>
  )
}
