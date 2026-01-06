/**
 * Coverage Calculation Utilities
 * 
 * Pure functions for calculating document data coverage.
 * Start simple (character count), extensible for future metrics.
 */

const DEFAULT_TARGET_CHARS = 10000

/**
 * Extract plain text from TipTap JSON content
 */
export function extractText(content) {
  if (!content) return ''
  
  if (typeof content === 'string') return content
  
  if (content.type === 'text') {
    return content.text || ''
  }
  
  if (content.content && Array.isArray(content.content)) {
    return content.content.map(extractText).join('')
  }
  
  return ''
}

/**
 * Count characters in document content
 */
export function getCharCount(content) {
  return extractText(content).length
}

/**
 * Count words in document content
 */
export function getWordCount(content) {
  const text = extractText(content).trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Calculate coverage percentage
 * 
 * @param {object} content - TipTap JSON content
 * @param {object} options - Configuration options
 * @returns {number} - Coverage percentage (0-100)
 */
export function calculateCoverage(content, options = {}) {
  const { targetChars = DEFAULT_TARGET_CHARS } = options
  const charCount = getCharCount(content)
  return Math.min(100, Math.round((charCount / targetChars) * 100))
}

/**
 * Get coverage stats for display
 */
export function getCoverageStats(content, options = {}) {
  const { targetChars = DEFAULT_TARGET_CHARS } = options
  const charCount = getCharCount(content)
  const wordCount = getWordCount(content)
  const percentage = calculateCoverage(content, options)
  
  return {
    charCount,
    wordCount,
    percentage,
    targetChars,
    remaining: Math.max(0, targetChars - charCount)
  }
}
