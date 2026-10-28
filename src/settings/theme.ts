import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
export type Theme = 'light' | 'dark' | 'system'
export function validTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}
export function useTheme() {
  const saved = useLiveQuery(() => db.settings.get('theme'), [])
  const theme = validTheme(saved?.value)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14231e' : '#173f34')
    }
    apply(); media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return { theme, setTheme: (value: Theme) => db.settings.put({ key: 'theme', value }) }
}
