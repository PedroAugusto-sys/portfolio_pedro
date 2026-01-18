import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { track3DInteraction } from '../../utils/analytics'
import { preserveMaterials } from '../../utils/modelUtils'
import { useMobile } from '../../hooks/useMobile'

interface Character3DProps {
  scrollProgress?: number
}

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
}

const Character3D = ({ scrollProgress = 0 }: Character3DProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const innerGroupRef = useRef<THREE.Group>(null)
  const { scene: characterScene } = useGLTF('/models/hero/character.glb')
  const isMobile = useMobile()
  
  // Refs para animação
  const scrollRef = useRef(0)
  const targetScrollRef = useRef(0)
  const initializedRef = useRef(false)
  
  // Refs para mouse tracking
  const mouseRef = useRef({ x: 0, y: 0 })
  
  // Refs para sistema de partículas
  const particlesRef = useRef<Particle[]>([])
  const particlesGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const particlesMaterialRef = useRef<THREE.PointsMaterial | null>(null)
  const particlesSystemRef = useRef<THREE.Points | null>(null)
  const lastScrollRef = useRef(0)

  // Clonar e preparar o personagem
  const character = useMemo(() => {
    const cloned = characterScene.clone(true)
    preserveMaterials(cloned)
    
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        child.frustumCulled = false
        child.castShadow = false
        child.receiveShadow = false
      }
    })
    
    return cloned
  }, [characterScene])

  // Calcular offset para centralizar
  const centerOffset = useMemo(() => {
    try {
      const box = new THREE.Box3().setFromObject(character)
      const center = box.getCenter(new THREE.Vector3())
      return new THREE.Vector3(-center.x, -center.y, -center.z)
    } catch {
      return new THREE.Vector3(0, 0, 0)
    }
  }, [character])

  // Escala base
  const BASE_SCALE = isMobile ? 0.9 : 1.1

  // Rastreamento do mouse (desktop only)
  useEffect(() => {
    if (isMobile) return
    
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isMobile])

  // Atualizar target scroll quando prop mudar
  useEffect(() => {
    targetScrollRef.current = scrollProgress
  }, [scrollProgress])

  // Inicializar sistema de partículas
  useEffect(() => {
    const geometry = new THREE.BufferGeometry()
    const maxParticles = 300
    const positions = new Float32Array(maxParticles * 3)
    const sizes = new Float32Array(maxParticles)
    positions.fill(0)
    sizes.fill(0.1)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    particlesGeometryRef.current = geometry

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    
    particlesMaterialRef.current = material

    const particles = new THREE.Points(geometry, material)
    particles.frustumCulled = false
    particlesSystemRef.current = particles

    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [])

  // Frame loop principal
  useFrame((state, delta) => {
    if (!groupRef.current || !innerGroupRef.current) return

    // Calcular scroll progress diretamente do DOM para garantir precisão
    let currentScroll = scrollProgress
    const heroElement = document.getElementById('hero')
    if (heroElement) {
      const rect = heroElement.getBoundingClientRect()
      const sectionHeight = heroElement.offsetHeight || window.innerHeight
      
      if (rect.bottom < 0) {
        currentScroll = 1
      } else if (rect.top > 0) {
        currentScroll = 0
      } else {
        // rect.top é negativo quando scrollou para baixo
        const scrolled = Math.abs(rect.top)
        currentScroll = Math.max(0, Math.min(1, scrolled / sectionHeight))
      }
    }

    // Suavizar transição do scroll
    scrollRef.current = THREE.MathUtils.lerp(scrollRef.current, currentScroll, 0.15)
    const scroll = scrollRef.current

    // Inicialização
    if (!initializedRef.current) {
      innerGroupRef.current.position.set(centerOffset.x, centerOffset.y + 2, centerOffset.z)
      innerGroupRef.current.scale.setScalar(BASE_SCALE * 0.8)
      innerGroupRef.current.rotation.set(0, 0, 0)
      groupRef.current.rotation.set(0, 0, 0)
      initializedRef.current = true
      
      if (particlesSystemRef.current) {
        groupRef.current.add(particlesSystemRef.current)
      }
    }

    // ========================================
    // ANIMAÇÕES BASEADAS NO SCROLL
    // ========================================

    // 1. QUEDA VERTICAL - O personagem desce conforme você scrolla
    // Posição inicial: centro + 2 unidades acima
    // Posição final: centro - 6 unidades abaixo
    const fallStartY = centerOffset.y + 2
    const fallEndY = centerOffset.y - (isMobile ? 4 : 6)
    const fallDistance = fallStartY - fallEndY
    
    // Aplicar curva de easing para queda mais natural (aceleração)
    const easedScroll = scroll * scroll // Easing quadrático
    const targetY = fallStartY - (easedScroll * fallDistance)

    // 2. MOVIMENTO LATERAL - Pequeno drift para a direita
    const targetX = centerOffset.x + (scroll * 1.5)

    // 3. MOVIMENTO DE PROFUNDIDADE - Aproxima enquanto cai
    const targetZ = centerOffset.z + (scroll * -1.0)

    // Aplicar posições (Y direto para resposta imediata)
    innerGroupRef.current.position.y = targetY
    innerGroupRef.current.position.x = THREE.MathUtils.lerp(
      innerGroupRef.current.position.x,
      targetX,
      0.2
    )
    innerGroupRef.current.position.z = THREE.MathUtils.lerp(
      innerGroupRef.current.position.z,
      targetZ,
      0.2
    )

    // 4. ESCALA - Aumenta conforme cai (efeito de aproximação)
    const minScale = BASE_SCALE * 0.8
    const maxScale = BASE_SCALE * 1.3
    const targetScale = minScale + (scroll * (maxScale - minScale))
    
    const currentScale = innerGroupRef.current.scale.x
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15)
    innerGroupRef.current.scale.setScalar(newScale)

    // 5. ROTAÇÃO Y (GIRO) - Rotação constante + adicional no scroll
    const baseRotY = state.clock.elapsedTime * 0.1 // Rotação lenta constante
    const scrollRotY = scroll * Math.PI * 2 // Uma volta completa durante a queda
    groupRef.current.rotation.y = baseRotY + scrollRotY

    // 6. ROTAÇÃO X (INCLINAÇÃO PARA FRENTE) - Inclina como se estivesse caindo
    const targetRotX = scroll * Math.PI * 0.4 // Até 72 graus de inclinação
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.2
    )

    // 7. ROTAÇÃO Z (CAMBALHOTA LATERAL) - Gira no eixo lateral
    const targetRotZ = scroll * Math.PI * 0.6 // Até 108 graus
    innerGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      innerGroupRef.current.rotation.z,
      targetRotZ,
      0.15
    )

    // 8. BALANÇO SUAVE (quando parado no topo)
    if (scroll < 0.1) {
      const idleSwayY = Math.sin(state.clock.elapsedTime * 2) * 0.05
      const idleSwayX = Math.cos(state.clock.elapsedTime * 1.5) * 0.03
      innerGroupRef.current.position.y += idleSwayY
      innerGroupRef.current.position.x += idleSwayX
    }

    // 9. OLHAR INTERATIVO (mouse tracking - apenas desktop)
    if (!isMobile) {
      const lookX = mouseRef.current.x * 0.2
      const lookY = mouseRef.current.y * 0.15
      
      // Combinar com rotação do scroll, mas reduzir quando está girando muito
      const lookInfluence = Math.max(0, 1 - scroll * 0.8)
      groupRef.current.rotation.x += lookY * lookInfluence
      innerGroupRef.current.rotation.y = lookX * lookInfluence
    }

    // ========================================
    // SISTEMA DE PARTÍCULAS DE RASTRO
    // ========================================
    if (particlesSystemRef.current && particlesGeometryRef.current) {
      const scrollDelta = Math.abs(scroll - lastScrollRef.current)
      lastScrollRef.current = scroll

      // Emitir partículas quando há movimento de scroll
      if (scroll > 0.05 && scrollDelta > 0.001) {
        const emitCount = Math.min(Math.floor(scrollDelta * 100) + 2, 8)
        
        for (let i = 0; i < emitCount; i++) {
          if (particlesRef.current.length < 300) {
            const charPos = innerGroupRef.current.position.clone()
            
            // Partículas saem do personagem em direção oposta ao movimento
            const particle: Particle = {
              position: new THREE.Vector3(
                charPos.x + (Math.random() - 0.5) * 1.0,
                charPos.y + (Math.random() - 0.5) * 0.8 + 0.5,
                charPos.z + (Math.random() - 0.5) * 1.0
              ),
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.3 + 0.1, // Para cima (rastro)
                (Math.random() - 0.5) * 0.5
              ),
              life: 1.5,
              maxLife: 1.5 + Math.random() * 0.5,
              size: 0.1 + Math.random() * 0.1
            }
            particlesRef.current.push(particle)
          }
        }
      }

      // Atualizar partículas existentes
      const activeParticles: Particle[] = []
      
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.life -= delta
        
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1)
          continue
        }

        // Atualizar posição
        p.position.add(p.velocity.clone().multiplyScalar(delta))
        
        // Gravidade leve
        p.velocity.y -= delta * 0.3
        
        // Fricção
        p.velocity.multiplyScalar(0.98)
        
        activeParticles.push(p)
      }

      // Atualizar geometria
      if (activeParticles.length > 0) {
        const positions = new Float32Array(activeParticles.length * 3)
        
        for (let i = 0; i < activeParticles.length; i++) {
          const p = activeParticles[i]
          positions[i * 3] = p.position.x
          positions[i * 3 + 1] = p.position.y
          positions[i * 3 + 2] = p.position.z
        }
        
        particlesGeometryRef.current.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        )
        particlesGeometryRef.current.setDrawRange(0, activeParticles.length)
        particlesGeometryRef.current.attributes.position.needsUpdate = true
        
        // Opacidade baseada na vida média
        let avgLife = 0
        activeParticles.forEach(p => avgLife += p.life / p.maxLife)
        avgLife /= activeParticles.length
        
        if (particlesMaterialRef.current) {
          particlesMaterialRef.current.opacity = avgLife * 0.8
        }
        
        particlesSystemRef.current.visible = true
      } else {
        particlesSystemRef.current.visible = false
      }
    }
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_character')
  }

  return (
    <group ref={groupRef} onClick={handleClick}>
      <group ref={innerGroupRef}>
        <primitive object={character} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/hero/character.glb')

export default Character3D
