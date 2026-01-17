import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Loader } from '@react-three/drei'
import Navigation from './components/UI/Navigation'
import LoadingScreen from './components/UI/LoadingScreen'
import GoogleAnalytics from './components/Analytics/GoogleAnalytics'
import TagManager from './components/Analytics/TagManager'
import GlobalBackground3D from './components/ThreeJS/GlobalBackground3D'
import { generateStructuredData } from './utils/seo'

// Lazy load das seções para code splitting
const Hero = lazy(() => import('./components/Sections/Hero'))
const About = lazy(() => import('./components/Sections/About'))
const Projects = lazy(() => import('./components/Sections/Projects'))
const Achievements = lazy(() => import('./components/Sections/Achievements'))

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Adicionar structured data
    const structuredData = generateStructuredData({
      name: 'Pedro',
      description: 'Desenvolvedor Full Stack especializado em tecnologias modernas e experiências 3D interativas',
      url: import.meta.env.VITE_SITE_URL || window.location.origin,
    })

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <GoogleAnalytics />
      <TagManager />
      {isLoading ? (
        <LoadingScreen onLoaded={() => {
          setIsLoading(false)
          // Delay aumentado para garantir que o Canvas do LoadingScreen seja completamente desmontado
          // e que a GPU tenha tempo de liberar recursos antes de criar novos Canvas
          // 1000ms (1 segundo) para garantir limpeza completa e evitar context lost
          setTimeout(() => setShowContent(true), 1000)
        }} />
      ) : showContent ? (
        <div className="min-h-screen bg-black text-white relative">
          {/* Background 3D Global - Temporariamente desabilitado para testar */}
          {/* <Suspense fallback={null}>
            <GlobalBackground3D />
          </Suspense> */}
          
          <Navigation />
          <main className="relative z-10 overflow-visible">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
              <Hero />
              <About />
              <Projects />
              <Achievements />
            </Suspense>
          </main>
          {/* Loader do drei para mostrar progresso de carregamento 3D */}
          <Loader />
        </div>
      ) : null}
    </Router>
  )
}

export default App
