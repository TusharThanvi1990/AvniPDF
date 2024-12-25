import { useState, useEffect } from 'react'

interface LayoutConfig {
  columns: number
  orientation: 'portrait' | 'landscape'
}

export function useResponsiveLayout(): LayoutConfig {
  const [layout, setLayout] = useState<LayoutConfig>({
    columns: 1,
    orientation: 'portrait',
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      let columns = 1
      if (width >= 1200) columns = 3
      else if (width >= 768) columns = 2

      const orientation = width > height ? 'landscape' : 'portrait'

      setLayout({ columns, orientation })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return layout
}

