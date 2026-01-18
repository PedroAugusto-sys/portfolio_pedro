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
  color: THREE.Color
}

// Cores para os diferentes estados
const COLORS = {
  idle: new THREE.Color(0x00ffff),      // Ciano - estado parado
  falling: new THREE.Color(0xff6600),   // Laranja - caindo (scroll para baixo)
  rising: new THREE.Color(0x00ff88),    // Verde - subindo (scroll para cima)
  fast: new THREE.Color(0xff0066),      // Rosa/Magenta - movimento rápido
}

const Character3D = ({ scrollProgress = 0 }: Character3DProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const innerGroupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.PointLight | null>(null)
  const { scene: characterScene } = useGLTF('/models/hero/character.glb')
  const isMobile = useMobile()
  
  // Refs para animação
  const scrollRef = useRef(0)
  const previousScrollRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const scrollDirectionRef = useRef<'down' | 'up' | 'idle'>('idle')
  const initializedRef = useRef(false)
  
  // Refs para efeito de glow
  const currentGlowColorRef = useRef(new THREE.Color(0x00ffff))
  const targetGlowColorRef = useRef(new THREE.Color(0x00ffff))
  const glowIntensityRef = useRef(0.5)
  
  // Refs para mouse tracking
  const mouseRef = useRef({ x: 0, y: 0 })
  
  // Refs para sistema de partículas
  const particlesRef = useRef<Particle[]>([])
  const particlesGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const particlesMaterialRef = useRef<THREE.PointsMaterial | null>(null)
  const particlesSystemRef = useRef<THREE.Points | null>(null)
  
  // Refs para animação de scroll reverso
  const reverseAnimationRef = useRef(0) // 0 = normal, 1 = totalmente reverso
  const spinVelocityRef = useRef(0)

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

  // Inicializar sistema de partículas
  useEffect(() => {
    const geometry = new THREE.BufferGeometry()
    const maxParticles = 300
    const positions = new Float32Array(maxParticles * 3)
    const colors = new Float32Array(maxParticles * 3)
    positions.fill(0)
    colors.fill(1)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    particlesGeometryRef.current = geometry

    const material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      vertexColors: true, // Usar cores por vértice
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
        const scrolled = Math.abs(rect.top)
        currentScroll = Math.max(0, Math.min(1, scrolled / sectionHeight))
      }
    }

    // Calcular velocidade e direção do scroll
    const scrollDelta = currentScroll - previousScrollRef.current
    scrollVelocityRef.current = THREE.MathUtils.lerp(
      scrollVelocityRef.current,
      Math.abs(scrollDelta) / Math.max(delta, 0.001),
      0.3
    )
    
    // Determinar direção do scroll
    if (Math.abs(scrollDelta) > 0.0005) {
      scrollDirectionRef.current = scrollDelta > 0 ? 'down' : 'up'
    } else {
      scrollDirectionRef.current = 'idle'
    }
    
    previousScrollRef.current = currentScroll

    // Suavizar transição do scroll
    scrollRef.current = THREE.MathUtils.lerp(scrollRef.current, currentScroll, 0.15)
    const scroll = scrollRef.current
    
    // ========================================
    // ANIMAÇÃO DE SCROLL REVERSO
    // ========================================
    // Quando sobe (scroll reverso), o personagem tem comportamento diferente
    const isScrollingUp = scrollDirectionRef.current === 'up'
    const isScrollingDown = scrollDirectionRef.current === 'down'
    
    // Transição suave para estado reverso
    const targetReverse = isScrollingUp ? 1 : 0
    reverseAnimationRef.current = THREE.MathUtils.lerp(
      reverseAnimationRef.current,
      targetReverse,
      0.1
    )
    const reverseAmount = reverseAnimationRef.current

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
    // MUDANÇA DE COR / GLOW
    // ========================================
    // Determinar cor alvo baseada no estado
    const speed = scrollVelocityRef.current
    
    if (speed < 0.5) {
      // Parado ou muito lento - ciano
      targetGlowColorRef.current.copy(COLORS.idle)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 0.5, 0.1)
    } else if (speed > 3) {
      // Movimento muito rápido - rosa/magenta
      targetGlowColorRef.current.copy(COLORS.fast)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 2.5, 0.1)
    } else if (isScrollingUp) {
      // Subindo - verde
      targetGlowColorRef.current.copy(COLORS.rising)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 1.5 + speed * 0.3, 0.1)
    } else if (isScrollingDown) {
      // Descendo - laranja
      targetGlowColorRef.current.copy(COLORS.falling)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 1.0 + speed * 0.3, 0.1)
    }
    
    // Suavizar transição de cor
    currentGlowColorRef.current.lerp(targetGlowColorRef.current, 0.08)
    
    // Atualizar cor das partículas
    if (particlesMaterialRef.current) {
      particlesMaterialRef.current.color.copy(currentGlowColorRef.current)
    }

    // ========================================
    // ANIMAÇÕES BASEADAS NO SCROLL
    // ========================================

    // 1. QUEDA/SUBIDA VERTICAL
    const fallStartY = centerOffset.y + 2
    const fallEndY = centerOffset.y - (isMobile ? 4 : 6)
    const fallDistance = fallStartY - fallEndY
    
    // Easing diferente para subida vs descida
    let easedScroll: number
    if (isScrollingUp) {
      // Subindo - easing mais suave (desacelera)
      easedScroll = 1 - Math.pow(1 - scroll, 2)
    } else {
      // Descendo - easing de aceleração
      easedScroll = scroll * scroll
    }
    const targetY = fallStartY - (easedScroll * fallDistance)

    // 2. MOVIMENTO LATERAL - Inverte direção no scroll reverso
    const lateralDirection = isScrollingUp ? -1 : 1
    const targetX = centerOffset.x + (scroll * 1.5 * lateralDirection)

    // 3. MOVIMENTO DE PROFUNDIDADE
    const depthDirection = isScrollingUp ? 1 : -1
    const targetZ = centerOffset.z + (scroll * 1.0 * depthDirection)

    // Aplicar posições
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

    // 4. ESCALA - Maior quando subindo (efeito de "ascensão heroica")
    const minScale = BASE_SCALE * 0.8
    const maxScale = BASE_SCALE * 1.3
    const scaleBonus = isScrollingUp ? 0.2 : 0
    const targetScale = minScale + (scroll * (maxScale - minScale)) + scaleBonus * reverseAmount
    
    const currentScale = innerGroupRef.current.scale.x
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15)
    innerGroupRef.current.scale.setScalar(newScale)

    // 5. ROTAÇÃO Y (GIRO) - Inverte no scroll reverso
    const baseRotY = state.clock.elapsedTime * 0.1
    
    // Acumular velocidade de spin baseada na direção
    if (isScrollingDown) {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, speed * 0.5, 0.1)
    } else if (isScrollingUp) {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, -speed * 0.8, 0.1) // Gira ao contrário mais rápido
    } else {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, 0, 0.05)
    }
    
    const scrollRotY = scroll * Math.PI * 2 * (1 - reverseAmount * 2) // Inverte direção
    groupRef.current.rotation.y = baseRotY + scrollRotY + spinVelocityRef.current

    // 6. ROTAÇÃO X (INCLINAÇÃO) - Para frente ao descer, para trás ao subir
    const tiltDirection = isScrollingUp ? -0.3 : 0.4
    const targetRotX = scroll * Math.PI * tiltDirection
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.15
    )

    // 7. ROTAÇÃO Z (CAMBALHOTA) - Inverte no scroll reverso
    const rollDirection = isScrollingUp ? -0.4 : 0.6
    const targetRotZ = scroll * Math.PI * rollDirection
    innerGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      innerGroupRef.current.rotation.z,
      targetRotZ,
      0.15
    )

    // 8. BALANÇO SUAVE (quando parado)
    if (scroll < 0.1 && scrollDirectionRef.current === 'idle') {
      const idleSwayY = Math.sin(state.clock.elapsedTime * 2) * 0.05
      const idleSwayX = Math.cos(state.clock.elapsedTime * 1.5) * 0.03
      innerGroupRef.current.position.y += idleSwayY
      innerGroupRef.current.position.x += idleSwayX
      
      // Pulsação de glow suave quando idle
      glowIntensityRef.current = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    }

    // 9. OLHAR INTERATIVO (mouse tracking)
    if (!isMobile) {
      const lookX = mouseRef.current.x * 0.2
      const lookY = mouseRef.current.y * 0.15
      const lookInfluence = Math.max(0, 1 - scroll * 0.8)
      groupRef.current.rotation.x += lookY * lookInfluence
      innerGroupRef.current.rotation.y += lookX * lookInfluence * 0.5
    }

    // 10. EFEITO DE "RECUPERAÇÃO" AO SUBIR
    // Quando sobe, o personagem parece "se endireitar" como um super-herói
    if (isScrollingUp && scroll > 0.1) {
      // Reduz as rotações mais rapidamente (se endireitando)
      groupRef.current.rotation.x *= 0.95
      innerGroupRef.current.rotation.z *= 0.95
      
      // Adiciona uma leve "pose heroica" - braços mais abertos (via escala X ligeiramente maior)
      const heroicPose = reverseAmount * 0.1
      innerGroupRef.current.scale.x = newScale * (1 + heroicPose)
    }

    // ========================================
    // SISTEMA DE PARTÍCULAS COM CORES
    // ========================================
    if (particlesSystemRef.current && particlesGeometryRef.current) {
      // Emitir partículas com cores baseadas na direção
      const shouldEmit = (scroll > 0.05 && speed > 0.5) || speed > 2
      
      if (shouldEmit) {
        const emitCount = Math.min(Math.floor(speed * 3) + 1, 10)
        
        for (let i = 0; i < emitCount; i++) {
          if (particlesRef.current.length < 300) {
            const charPos = innerGroupRef.current.position.clone()
            
            // Direção das partículas baseada no movimento
            const velY = isScrollingUp ? -0.3 - Math.random() * 0.2 : 0.2 + Math.random() * 0.3
            
            const particle: Particle = {
              position: new THREE.Vector3(
                charPos.x + (Math.random() - 0.5) * 1.0,
                charPos.y + (Math.random() - 0.5) * 0.8,
                charPos.z + (Math.random() - 0.5) * 1.0
              ),
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.6,
                velY,
                (Math.random() - 0.5) * 0.6
              ),
              life: 1.5,
              maxLife: 1.5 + Math.random() * 0.5,
              size: 0.1 + Math.random() * 0.15,
              color: currentGlowColorRef.current.clone()
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

        p.position.add(p.velocity.clone().multiplyScalar(delta))
        
        // Gravidade diferente baseada na direção original
        const gravityDirection = isScrollingUp ? 0.2 : -0.3
        p.velocity.y += delta * gravityDirection
        p.velocity.multiplyScalar(0.98)
        
        activeParticles.push(p)
      }

      // Atualizar geometria com posições e cores
      if (activeParticles.length > 0) {
        const positions = new Float32Array(activeParticles.length * 3)
        const colors = new Float32Array(activeParticles.length * 3)
        
        for (let i = 0; i < activeParticles.length; i++) {
          const p = activeParticles[i]
          const lifeRatio = p.life / p.maxLife
          
          positions[i * 3] = p.position.x
          positions[i * 3 + 1] = p.position.y
          positions[i * 3 + 2] = p.position.z
          
          // Cor com fade baseado na vida
          colors[i * 3] = p.color.r * lifeRatio
          colors[i * 3 + 1] = p.color.g * lifeRatio
          colors[i * 3 + 2] = p.color.b * lifeRatio
        }
        
        particlesGeometryRef.current.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        )
        particlesGeometryRef.current.setAttribute(
          'color',
          new THREE.BufferAttribute(colors, 3)
        )
        particlesGeometryRef.current.setDrawRange(0, activeParticles.length)
        particlesGeometryRef.current.attributes.position.needsUpdate = true
        particlesGeometryRef.current.attributes.color.needsUpdate = true
        
        if (particlesMaterialRef.current) {
          particlesMaterialRef.current.opacity = 0.8
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
      {/* Luz de glow que segue o personagem */}
      <pointLight
        ref={glowRef}
        color={currentGlowColorRef.current}
        intensity={glowIntensityRef.current}
        distance={8}
        decay={2}
      />
      <group ref={innerGroupRef}>
        <primitive object={character} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/hero/character.glb')

export default Character3D
