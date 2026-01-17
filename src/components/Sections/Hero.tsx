import { useEffect, useRef, useState, Suspense } from 'react'
import Scene3D from '../ThreeJS/Scene3D'
import Character3D from '../ThreeJS/Character3D'
import { trackSectionView } from '../../utils/analytics'
import { useSmoothScroll } from '../../hooks/useSmoothScroll'
import { useTypingAnimation } from '../../hooks/useTypingAnimation'
import gsap from 'gsap'

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const character3DRef = useRef<HTMLDivElement>(null)
  const { scrollTo } = useSmoothScroll()
  
  const [greeting, setGreeting] = useState('')
  const [showNameAnimation, setShowNameAnimation] = useState(false)
  
  const typedName = useTypingAnimation({
    texts: ['Predo', 'Pedro'],
    typingSpeed: 150,
    deletingSpeed: 80,
    pauseTime: 1500,
    repeat: true,
  })

  useEffect(() => {
    const greetingText = 'Olá, eu sou o '
    let currentIndex = 0

    const typingInterval = setInterval(() => {
      if (currentIndex < greetingText.length) {
        setGreeting(greetingText.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(typingInterval)
        setShowNameAnimation(true)
      }
    }, 100)

    return () => clearInterval(typingInterval)
  }, [])

  useEffect(() => {
    trackSectionView('hero')
    
    const timer = setTimeout(() => {
      if (titleRef.current && subtitleRef.current && ctaRef.current) {
        gsap.set([titleRef.current, subtitleRef.current, ctaRef.current], {
          opacity: 0,
          y: 30,
          force3D: true,
        })
        
        if (character3DRef.current) {
          gsap.set(character3DRef.current, { 
            opacity: 0, 
            scale: 1.0,
            force3D: true,
          })
        }

        const tl = gsap.timeline({
          defaults: {
            ease: 'power2.out',
            force3D: true,
          },
        })

        tl.to([titleRef.current, subtitleRef.current, ctaRef.current], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
        })

        if (character3DRef.current) {
          tl.to(
            character3DRef.current,
            {
              opacity: 1,
              scale: 1.4,
              duration: 1,
              ease: 'power2.out',
            },
            '-=0.3'
          )
        }

        tl.call(() => {
          if (titleRef.current) {
            gsap.set(titleRef.current, { opacity: 1, y: 0 })
            gsap.set(titleRef.current, { clearProps: 'transform,will-change' })
          }
          if (subtitleRef.current) {
            gsap.set(subtitleRef.current, { opacity: 1, y: 0 })
            gsap.set(subtitleRef.current, { clearProps: 'transform,will-change' })
          }
          if (ctaRef.current) {
            gsap.set(ctaRef.current, { opacity: 1, y: 0 })
            gsap.set(ctaRef.current, { clearProps: 'transform,will-change' })
          }
          if (character3DRef.current) {
            gsap.set(character3DRef.current, { opacity: 1, scale: 1.4 })
          }
        })
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  const scrollToSection = (sectionId: string) => {
    scrollTo(sectionId, { duration: 1.0, offset: -80 })
  }

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1
              ref={titleRef}
              className="text-5xl md:text-7xl font-bold text-white leading-tight"
            >
              {greeting}
              {showNameAnimation && (
                <span className="text-primary-400">
                  {typedName}
                  <span className="animate-pulse">|</span>
                </span>
              )}
              {!showNameAnimation && greeting && (
                <span className="animate-pulse">|</span>
              )}
            </h1>
            <p
              ref={subtitleRef}
              className="text-xl md:text-2xl text-gray-300"
            >
              Desenvolvedor Full Stack especializado em tecnologias modernas
              e experiências 3D interativas
            </p>
            <div 
              ref={ctaRef} 
              className="flex gap-4 justify-center"
            >
              <button
                onClick={() => scrollToSection('projects')}
                className="px-8 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors transform hover:scale-105"
              >
                Ver Projetos
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="px-8 py-3 border-2 border-primary-500 text-primary-400 rounded-lg font-semibold hover:bg-primary-500/10 transition-colors"
              >
                Sobre Mim
              </button>
            </div>
          </div>

          <div className="relative h-[500px] md:h-[800px] lg:h-[800px] w-full flex items-end justify-center pb-8 md:pb-12">
            <div ref={character3DRef} className="h-full w-full max-w-2xl">
              <Suspense 
                fallback={
                  <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    Carregando...
                  </div>
                }
              >
                <Scene3D
                  cameraPosition={[0, 0.8, 5]}
                  enableControls={true}
                  className="w-full h-full"
                >
                  <Character3D />
                </Scene3D>
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  )
}

export default Hero
