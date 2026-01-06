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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
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
      className={`flex flex-col border-r border-border-subtle bg-surface transition-all duration-200 ${
        (isExpanded || isDropdownOpen) ? 'w-56' : 'w-12'
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
      <div className="flex items-center justify-between px-2 py-3 border-b border-border-subtle">
        {isExpanded && (
          <span className="text-xs font-medium text-faint uppercase tracking-wider px-2">
            Documents
          </span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-main transition-colors text-secondary hover:text-primary ml-auto"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Icons.ChevronRight 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Add new document button */}
      <div className="p-2">
        <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className={`flex items-center gap-2 rounded-lg hover:bg-main transition-colors text-secondary hover:text-primary ${
                (isExpanded || isDropdownOpen) ? 'w-full px-3 py-2' : 'w-8 h-8 justify-center'
              }`}
              aria-label="Add document"
            >
                <Icons.Plus className="w-5 h-5 flex-shrink-0" />
              {(isExpanded || isDropdownOpen) && <span className="text-sm">New Document</span>}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-main rounded-lg shadow-lg border border-border-subtle py-1 z-50"
              sideOffset={8}
              side="right"
              align="start"
            >
              <div className="px-3 py-2 text-xs font-medium text-faint uppercase tracking-wider">
                Choose Template
              </div>
              
              <div className="h-px bg-border-subtle my-1" />
              
              {regularTemplates.map((template) => (
                <DropdownMenu.Item
                  key={template.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary cursor-pointer outline-none transition-colors"
                  onSelect={() => handleCreateDocument(template)}
                >
                  <span className="text-faint">
                    {getIcon(template.icon)}
                  </span>
                  <span>{template.title}</span>
                </DropdownMenu.Item>
              ))}
              
              {customTemplate && (
                <>
                  <div className="h-px bg-border-subtle my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-3 px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary cursor-pointer outline-none transition-colors"
                    onSelect={() => handleCreateDocument(customTemplate)}
                  >
                    <span className="text-faint">
                      {getIcon(customTemplate.icon)}
                    </span>
                    <span>{customTemplate.title}</span>
                  </DropdownMenu.Item>
                </>
              )}
              
              {/* PDF Upload Option */}
              <div className="h-px bg-border-subtle my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-3 px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary cursor-pointer outline-none transition-colors"
                onSelect={() => fileInputRef.current?.click()}
              >
                <span className="text-faint">
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
                ? 'bg-orange-50/10 text-accent-primary' 
                : 'hover:bg-main text-secondary'
            } ${(isExpanded || isDropdownOpen) ? 'px-3 py-2' : 'w-8 h-8 justify-center'}`}
            onClick={() => setActiveDocument(doc.id)}
            title={doc.title}
          >
            <span className={`flex-shrink-0 ${activeDocId === doc.id ? 'text-accent-primary' : 'text-faint'}`}>
              {getIcon(doc.icon)}
            </span>
            {(isExpanded || isDropdownOpen) && (
              <>
                <span className="text-sm truncate flex-1">{doc.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDocument(doc.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-surface transition-all text-faint hover:text-secondary"
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
            {(isExpanded || isDropdownOpen) && (
              <div className="px-4 py-2 mt-2 text-xs font-medium text-faint uppercase tracking-wider border-t border-border-subtle">
                Files
              </div>
            )}
            {fileList.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                  activeFileId === file.id 
                    ? 'bg-orange-50/10 text-accent-primary' 
                    : 'hover:bg-main text-secondary'
                } ${(isExpanded || isDropdownOpen) ? 'px-3 py-2' : 'w-8 h-8 justify-center'}`}
                onClick={() => setActiveFile(file.id)}
                title={`${file.name} (${formatFileSize(file.size)})`}
              >
                <span className={`flex-shrink-0 ${activeFileId === file.id ? 'text-accent-primary' : 'text-faint'}`}>
                  <Icons.FileType className="w-4 h-4" />
                </span>
                {(isExpanded || isDropdownOpen) && (
                  <>
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(file.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-surface transition-all text-faint hover:text-secondary"
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
        
        {documentList.length === 0 && fileList.length === 0 && (isExpanded || isDropdownOpen) && (
          <div className="px-4 py-8 text-center text-xs text-faint">
            No documents yet.<br />Click + to create one.
          </div>
        )}
      </div>
    </aside>
  )
}
