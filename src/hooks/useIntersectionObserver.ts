import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number
  root?: Element | null
  rootMargin?: string
  persist?: boolean // Se true, mantém hasIntersected mesmo quando elemento sai da viewport
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const hasIntersectedRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Limpar observer anterior se existir
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        
        // Marcar como intersectado na primeira vez que entra na viewport
        if (entry.isIntersecting && !hasIntersectedRef.current) {
          hasIntersectedRef.current = true
          setHasIntersected(true)
          
          // Se persist for false, desconectar após primeira interseção para performance
          if (!options.persist && observerRef.current) {
            observerRef.current.disconnect()
          }
        }
      },
      {
        threshold: options.threshold || 0.1,
        root: options.root || null,
        rootMargin: options.rootMargin || '0px',
      }
    )

    observerRef.current = observer
    observer.observe(element)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [options.threshold, options.root, options.rootMargin, options.persist])

  return { elementRef, isIntersecting, hasIntersected }
}
