/**
 * Storage Adapter
 * 
 * Abstracts localStorage operations for easy API replacement later.
 */

const STORAGE_PREFIX = 'apricity'

export const storage = {
  /**
   * Save data to storage
   */
  save(key, data) {
    try {
      const storageKey = key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}-${key}`
      localStorage.setItem(storageKey, JSON.stringify({
        ...data,
        lastModified: new Date().toISOString()
      }))
      return true
    } catch (error) {
      console.error('Failed to save:', error)
      return false
    }
  },

  /**
   * Load document from storage
   */
  load(startupId) {
    try {
      const key = `${STORAGE_PREFIX}-${startupId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load:', error)
      return null
    }
  },

  /**
   * Delete document from storage
   */
  delete(startupId) {
    try {
      const key = `${STORAGE_PREFIX}-${startupId}`
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Failed to delete:', error)
      return false
    }
  },

  /**
   * List all saved startups
   */
  listAll() {
    const startups = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const id = key.replace(`${STORAGE_PREFIX}-`, '')
        const data = this.load(id)
        if (data) {
          startups.push({ id, ...data })
        }
      }
    }
    return startups
  }
}

// Future: API Storage Adapter
// export const apiStorage = {
//   async save(startupId, data) {
//     return fetch(`/api/startups/${startupId}`, {
//       method: 'PUT',
//       body: JSON.stringify(data)
//     })
//   },
//   async load(startupId) {
//     return fetch(`/api/startups/${startupId}`).then(r => r.json())
//   }
// }
