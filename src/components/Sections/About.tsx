import { useEffect, Suspense, useRef } from 'react'
import Scene3D from '../ThreeJS/Scene3D'
import About3D from '../ThreeJS/About3D'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'
import { trackSectionView } from '../../utils/analytics'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const About = () => {
  const { elementRef, hasIntersected } = useIntersectionObserver({ 
    threshold: 0.2,
    rootMargin: '200px',
    persist: true
  })
  const contentRef = useRef<HTMLDivElement>(null)
  const animationsCreatedRef = useRef(false)

  useEffect(() => {
    if (hasIntersected) {
      trackSectionView('about')
    }
  }, [hasIntersected])

  useEffect(() => {
    if (hasIntersected && contentRef.current && !animationsCreatedRef.current) {
      gsap.set(contentRef.current, { opacity: 0, y: 30 })
      gsap.to(contentRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top 90%',
          toggleActions: 'play none none none',
          once: true,
        },
      })

      const elements = elementRef.current?.querySelectorAll('.animate-on-scroll') || []
      
      elements.forEach((el, index) => {
        gsap.set(el, { opacity: 0, y: 40 })
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          delay: 0.1 + index * 0.05,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
            once: true,
          },
        })
      })

      const threeDElements = elementRef.current?.querySelectorAll('[class*="h-[600px]"], [class*="h-[700px]"], [class*="h-[800px]"], [class*="h-[900px]"], [class*="h-[1000px]"], [class*="h-[1100px]"]') || []
      threeDElements.forEach((el, index) => {
        gsap.set(el, { opacity: 0, scale: 0.95 })
        gsap.to(el, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          delay: 0.15 + index * 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
            once: true,
          },
        })
      })

      animationsCreatedRef.current = true
    }
  }, [hasIntersected, elementRef])

  const skills = [
    'Java',
    'Python',
    'C#',
    'TypeScript',
    'JavaScript',
    'HTML',
    'SCSS',
    'React',
    'React.js',
    'Three.js',
    'Node.js',
    'Spring',
    'Spring Boot',
    'Angular',
    'Bootstrap',
    '.NET',
    'GSAP',
    'Tailwind CSS',
    'Vite',
    'FastAPI',
    'Streamlit',
    'JPA/Hibernate',
    'ElectronJS',
    'PostgreSQL',
    'MongoDB',
    'Pandas',
    'Big Data',
    'Git',
    'GitHub',
    'Jira',
    'Selenium',
    'Playwright',
    'DBeaver',
    'Slack',
    'VS Code',
    'Docker',
    'Swagger',
  ]

  return (
    <section
      id="about"
      ref={elementRef}
      className="relative min-h-screen py-20 px-4 sm:px-6 lg:px-8 overflow-visible"
    >
      <div className="max-w-7xl mx-auto relative">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div ref={contentRef} className="space-y-8 relative z-10">
            <div className="animate-on-scroll">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Sobre <span className="text-primary-400">Mim</span>
              </h2>
            </div>

            <div className="animate-on-scroll space-y-4 text-gray-300 text-lg">
              <p>
                Engenheiro de Software formado pela Fatesg (conclusão em 
                2025) com sólida trajetória de 3 anos e 8 meses na Escolar 
                Manager. Atuei como Analista de QA, desenvolvendo uma visão 
                crítica sobre o produto e garantindo entregas de alta qualidade que 
                resolvem problemas reais do usuário.
              </p>
              <p>
                Possuo competências em C#, React.js e automação, com inglês fluente 
                para atuação em times globais. Busco aplicar minha experiência em 
                engenharia para escalar processos de testes e otimizar os ciclos de 
                desenvolvimento.
              </p>
            </div>

            {/* Foto de Perfil */}
            <div className="animate-on-scroll">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary-500/30 shadow-lg shadow-primary-500/20">
                <img
                  src="/images/face.png"
                  alt="Pedro - Desenvolvedor"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="animate-on-scroll">
              <h3 className="text-2xl font-bold text-white mb-4">
                Tecnologias
              </h3>
              <div className="flex flex-wrap gap-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Objeto 3D Decorativo */}
          <div className="relative h-[700px] md:h-[900px] lg:h-[1000px] xl:h-[1100px] animate-on-scroll overflow-visible -mb-20 md:-mb-32 lg:-mb-40" style={{ zIndex: 1 }}>
            <div className="absolute inset-0 w-full h-full pointer-events-auto">
              <Suspense fallback={<div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">Carregando 3D...</div>}>
                <Scene3D
                  cameraPosition={[0, 0.3, 7]}
                  enableControls={true}
                  className="w-full h-full"
                >
                  <About3D />
                </Scene3D>
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
