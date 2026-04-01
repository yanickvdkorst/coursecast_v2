'use client'

import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-6 rounded-full transition-colors"
      style={{
        background: theme === 'dark' ? 'var(--color-gold-500)' : 'var(--border-color)',
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform flex items-center justify-center text-xs"
        style={{
          background: '#fff',
          transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)',
        }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
