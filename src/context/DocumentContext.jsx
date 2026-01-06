'use client'

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { storage } from '@/utils/storage'
import { calculateCoverage } from '@/utils/coverage'

// Storage key for workspace
const WORKSPACE_KEY = 'apricity-workspace'

// Initial state
const initialState = {
  startupName: 'The Next Big Thing',
  documents: {}, // { docId: { id, title, icon, content, createdAt } }
  files: {}, // { fileId: { id, name, type, size, data, uploadedAt } }
  activeItemType: null, // 'document' | 'file' | null
  activeDocId: null,
  activeFileId: null,
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  isLoaded: false
}

// Action types
const ACTIONS = {
  LOAD_WORKSPACE: 'LOAD_WORKSPACE',
  SET_STARTUP_NAME: 'SET_STARTUP_NAME',
  CREATE_DOCUMENT: 'CREATE_DOCUMENT',
  UPDATE_DOCUMENT: 'UPDATE_DOCUMENT',
  UPDATE_DOCUMENT_TITLE: 'UPDATE_DOCUMENT_TITLE',
  SET_ACTIVE_DOC: 'SET_ACTIVE_DOC',
  SET_ACTIVE_FILE: 'SET_ACTIVE_FILE',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  UPLOAD_FILE: 'UPLOAD_FILE',
  DELETE_FILE: 'DELETE_FILE',
  SET_SAVE_STATUS: 'SET_SAVE_STATUS'
}

// Reducer
function workspaceReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_WORKSPACE:
      return {
        ...state,
        ...action.payload,
        isLoaded: true
      }
    case ACTIONS.SET_STARTUP_NAME:
      return {
        ...state,
        startupName: action.payload
      }
    case ACTIONS.CREATE_DOCUMENT: {
      const { id, title, icon, content } = action.payload
      return {
        ...state,
        documents: {
          ...state.documents,
          [id]: {
            id,
            title,
            icon,
            content,
            createdAt: new Date().toISOString()
          }
        },
        activeItemType: 'document',
        activeDocId: id,
        activeFileId: null
      }
    }
    case ACTIONS.UPDATE_DOCUMENT: {
      const { id, content } = action.payload
      if (!state.documents[id]) return state
      return {
        ...state,
        documents: {
          ...state.documents,
          [id]: {
            ...state.documents[id],
            content
          }
        }
      }
    }
    case ACTIONS.UPDATE_DOCUMENT_TITLE: {
      const { id, title } = action.payload
      if (!state.documents[id]) return state
      return {
        ...state,
        documents: {
          ...state.documents,
          [id]: {
            ...state.documents[id],
            title
          }
        }
      }
    }
    case ACTIONS.SET_ACTIVE_DOC:
      return {
        ...state,
        activeItemType: 'document',
        activeDocId: action.payload,
        activeFileId: null
      }
    case ACTIONS.SET_ACTIVE_FILE:
      return {
        ...state,
        activeItemType: 'file',
        activeFileId: action.payload,
        activeDocId: null
      }
    case ACTIONS.DELETE_DOCUMENT: {
      const docId = action.payload
      const { [docId]: removed, ...remainingDocs } = state.documents
      const docIds = Object.keys(remainingDocs)
      const wasActive = state.activeDocId === docId && state.activeItemType === 'document'
      return {
        ...state,
        documents: remainingDocs,
        activeItemType: wasActive ? (docIds.length > 0 ? 'document' : null) : state.activeItemType,
        activeDocId: wasActive ? (docIds.length > 0 ? docIds[0] : null) : state.activeDocId
      }
    }
    case ACTIONS.UPLOAD_FILE: {
      const { id, name, type, size, data } = action.payload
      return {
        ...state,
        files: {
          ...state.files,
          [id]: {
            id,
            name,
            type,
            size,
            data, // base64 encoded
            uploadedAt: new Date().toISOString()
          }
        },
        activeItemType: 'file',
        activeFileId: id,
        activeDocId: null
      }
    }
    case ACTIONS.DELETE_FILE: {
      const fileId = action.payload
      const { [fileId]: removed, ...remainingFiles } = state.files
      return {
        ...state,
        files: remainingFiles
      }
    }
    case ACTIONS.SET_SAVE_STATUS:
      return {
        ...state,
        saveStatus: action.payload
      }
    default:
      return state
  }
}

// Context
const DocumentContext = createContext(null)

// Provider
export function DocumentProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)
  const saveTimeoutRef = useRef(null)

  // Load workspace on mount
  useEffect(() => {
    const saved = storage.load(WORKSPACE_KEY)
    if (saved && Object.keys(saved.documents || {}).length > 0) {
      dispatch({
        type: ACTIONS.LOAD_WORKSPACE,
        payload: {
          startupName: saved.startupName || initialState.startupName,
          documents: saved.documents || {},
          files: saved.files || {},
          activeItemType: saved.activeItemType || (saved.activeDocId ? 'document' : null),
          activeDocId: saved.activeDocId || null,
          activeFileId: saved.activeFileId || null
        }
      })
    } else {
      // Create default Problem Statement document on first load
      const defaultDocId = `doc-${Date.now()}`
      dispatch({
        type: ACTIONS.LOAD_WORKSPACE,
        payload: {
          ...initialState,
          documents: {
            [defaultDocId]: {
              id: defaultDocId,
              title: 'Problem Statement',
              icon: 'Target',
              content: null,
              createdAt: new Date().toISOString()
            }
          },
          activeItemType: 'document',
          activeDocId: defaultDocId,
          activeFileId: null
        }
      })
    }
  }, [])

  // Debounced save function
  const saveWorkspace = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    dispatch({ type: ACTIONS.SET_SAVE_STATUS, payload: 'saving' })

    saveTimeoutRef.current = setTimeout(() => {
      const success = storage.save(WORKSPACE_KEY, {
        startupName: state.startupName,
        documents: state.documents,
        files: state.files,
        activeDocId: state.activeDocId
      })

      dispatch({
        type: ACTIONS.SET_SAVE_STATUS,
        payload: success ? 'saved' : 'error'
      })

      setTimeout(() => {
        dispatch({ type: ACTIONS.SET_SAVE_STATUS, payload: 'idle' })
      }, 2000)
    }, 500)
  }, [state.startupName, state.documents, state.files, state.activeDocId])

  // Auto-save on state change
  useEffect(() => {
    if (state.isLoaded) {
      saveWorkspace()
    }
  }, [state.documents, state.files, state.startupName, state.isLoaded, saveWorkspace])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Get active document
  const activeDocument = state.activeDocId ? state.documents[state.activeDocId] : null

  // Calculate coverage for active document
  const coverage = activeDocument ? calculateCoverage(activeDocument.content) : 0

  // Get documents as sorted array
  const documentList = Object.values(state.documents).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )

  // Get files as sorted array
  const fileList = Object.values(state.files).sort(
    (a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt)
  )

  // Actions
  const setStartupName = useCallback((name) => {
    dispatch({ type: ACTIONS.SET_STARTUP_NAME, payload: name })
  }, [])

  const createDocument = useCallback((template) => {
    const id = `doc-${Date.now()}`
    dispatch({
      type: ACTIONS.CREATE_DOCUMENT,
      payload: {
        id,
        title: template.title,
        icon: template.icon,
        content: null // Start with empty content
      }
    })
    return id
  }, [])

  const updateDocumentContent = useCallback((content) => {
    if (state.activeDocId) {
      dispatch({
        type: ACTIONS.UPDATE_DOCUMENT,
        payload: { id: state.activeDocId, content }
      })
    }
  }, [state.activeDocId])

  const setActiveDocument = useCallback((docId) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_DOC, payload: docId })
  }, [])

  const deleteDocument = useCallback((docId) => {
    dispatch({ type: ACTIONS.DELETE_DOCUMENT, payload: docId })
  }, [])

  const updateDocumentTitle = useCallback((docId, title) => {
    dispatch({ type: ACTIONS.UPDATE_DOCUMENT_TITLE, payload: { id: docId, title } })
  }, [])

  const uploadFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const id = `file-${Date.now()}`
        dispatch({
          type: ACTIONS.UPLOAD_FILE,
          payload: {
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result // base64
          }
        })
        resolve(id)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])


  const deleteFile = useCallback((fileId) => {
    dispatch({ type: ACTIONS.DELETE_FILE, payload: fileId })
  }, [])

  const setActiveFile = useCallback((fileId) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_FILE, payload: fileId })
  }, [])

  // Get active file
  const activeFile = state.activeFileId ? state.files[state.activeFileId] : null

  const value = {
    startupName: state.startupName,
    documents: state.documents,
    documentList,
    files: state.files,
    fileList,
    activeItemType: state.activeItemType,
    activeDocId: state.activeDocId,
    activeDocument,
    activeFileId: state.activeFileId,
    activeFile,
    saveStatus: state.saveStatus,
    coverage,
    isLoaded: state.isLoaded,
    setStartupName,
    createDocument,
    updateDocumentContent,
    updateDocumentTitle,
    setActiveDocument,
    setActiveFile,
    deleteDocument,
    uploadFile,
    deleteFile
  }

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  )
}

// Hook
export function useDocument() {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider')
  }
  return context
}
