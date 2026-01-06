/**
 * Storage Adapter - IndexedDB Implementation
 * 
 * Uses idb-keyval for async storage to support large files (PDFs/Images).
 * Includes auto-migration from localStorage on first load.
 */

import { get, set, del, keys } from 'idb-keyval'

const STORAGE_PREFIX = 'apricity'

// Helper to keep keys consistent
const getKey = (id) => id.startsWith(STORAGE_PREFIX) ? id : `${STORAGE_PREFIX}-${id}`

/**
 * Migration: Move data from localStorage to IndexedDB
 */
async function migrateFromLocalStorage() {
  try {
    const migratedKeys = []
    
    // Find all app keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          // Read from LS
          const data = JSON.parse(localStorage.getItem(key))
          
          // Write to IDB
          await set(key, data)
          migratedKeys.push(key)
        } catch (e) {
          console.error('Migration failed for key:', key, e)
        }
      }
    }

    // Clean up LS after successful migration
    migratedKeys.forEach(key => localStorage.removeItem(key))
    if (migratedKeys.length > 0) {
      console.log(`Migrated ${migratedKeys.length} items from localStorage to IndexedDB`)
    }
  } catch (error) {
    console.error('Migration critical error:', error)
  }
}

export const storage = {
  /**
   * Save data to storage
   * @param {string} key 
   * @param {any} data 
   */
  async save(key, data) {
    try {
      const storageKey = getKey(key)
      await set(storageKey, {
        ...data,
        lastModified: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Failed to save to IDB:', error)
      return false
    }
  },

  /**
   * Load document from storage
   * @param {string} startupId 
   */
  async load(startupId) {
    // Attempt migration on first load access or just run it?
    // Running it here ensures content is available if it was just in LS.
    // However, for performance, we might want to do this only once globally.
    // For simplicity/robustness, checking if we find nothing in IDB but something in LS is a good strategy,
    // but explicit migration function is clearer.
    // We'll trust the Context to call init/migration or just do it lazily here?
    // Let's keep it simple: The Context will likely just call 'load', so we can't easily hook in.
    // BUT, we can run migration once at module level or assume `load` might need to check LS fallback.
    
    // Let's add a specialized init method or just auto-migrate if data is missing?
    // Safer: Allow Context to trigger init.
    
    try {
      const storageKey = getKey(startupId)
      const data = await get(storageKey)
      return data || null
    } catch (error) {
      console.error('Failed to load from IDB:', error)
      return null
    }
  },

  /**
   * Initialize storage (run migration)
   */
  async init() {
    await migrateFromLocalStorage()
  },

  /**
   * Delete document from storage
   */
  async delete(startupId) {
    try {
      const storageKey = getKey(startupId)
      await del(storageKey)
      return true
    } catch (error) {
      console.error('Failed to delete from IDB:', error)
      return false
    }
  }
}
