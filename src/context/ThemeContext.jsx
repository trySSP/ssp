'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('apricity-theme')
    if (savedTheme) {
      setTimeout(() => {
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
      }, 0)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTimeout(() => {
        setTheme('dark')
        document.documentElement.setAttribute('data-theme', 'dark')
      }, 0)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('apricity-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
