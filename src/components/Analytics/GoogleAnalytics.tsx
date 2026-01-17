import { useEffect } from 'react'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

const GA4_ID = import.meta.env.VITE_GA4_ID || ''

const GoogleAnalytics = () => {
  useEffect(() => {
    if (!GA4_ID) {
      // Silenciar em produção, apenas logar em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('Google Analytics ID não configurado')
      }
      return
    }

    // Carregar script do Google Analytics
    const script1 = document.createElement('script')
    script1.async = true
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
    document.head.appendChild(script1)

    // Inicializar gtag
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    window.gtag = gtag

    gtag('js', new Date())
    gtag('config', GA4_ID, {
      page_path: window.location.pathname,
    })

    return () => {
      // Cleanup se necessário
    }
  }, [])

  return null
}

export default GoogleAnalytics
