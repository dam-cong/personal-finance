import { useEffect, useState } from 'react'

export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    function currentHeight() {
      return viewport?.height ?? window.innerHeight
    }
    let maxHeight = currentHeight()

    function handleResize() {
      const height = currentHeight()
      if (height > maxHeight) maxHeight = height
      setOpen(maxHeight - height > 150)
    }

    viewport?.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    return () => {
      viewport?.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return open
}
