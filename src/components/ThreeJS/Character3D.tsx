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
  
  // Refs para mouse tracking (olhar interativo)
  const mouseRef = useRef({ x: 0, y: 0 })
  const headBoneRef = useRef<THREE.Bone | null>(null)
  const neckBoneRef = useRef<THREE.Bone | null>(null)
  
  // Refs para animação de scroll reverso
  const reverseAnimationRef = useRef(0)
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
      
      // Procurar ossos da cabeça e pescoço para o olhar interativo
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        const bones = child.skeleton.bones
        
        // Função para buscar osso por nome
        const findBone = (targetNames: string[]): THREE.Bone | null => {
          for (const bone of bones) {
            const boneName = bone.name.toLowerCase()
            for (const target of targetNames) {
              if (boneName.includes(target.toLowerCase())) {
                return bone
              }
            }
          }
          return null
        }
        
        // Procurar osso da cabeça
        const headBone = findBone(['head', 'cabeça', 'skull', 'cranio', 'cabeca'])
        if (headBone) {
          headBoneRef.current = headBone
        }
        
        // Procurar osso do pescoço
        const neckBone = findBone(['neck', 'pescoço', 'pescoco'])
        if (neckBone) {
          neckBoneRef.current = neckBone
        }
        
        // Se não encontrou cabeça mas encontrou pescoço, usar pescoço
        if (!headBoneRef.current && neckBoneRef.current) {
          headBoneRef.current = neckBoneRef.current
        }
        
        // Se não encontrou nenhum, procurar o osso mais alto
        if (!headBoneRef.current && bones.length > 0) {
          let topBone = bones[0]
          let maxY = -Infinity
          
          for (const bone of bones) {
            const worldPos = new THREE.Vector3()
            bone.getWorldPosition(worldPos)
            if (worldPos.y > maxY) {
              topBone = bone
              maxY = worldPos.y
            }
          }
          headBoneRef.current = topBone
        }
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
    const isScrollingUp = scrollDirectionRef.current === 'up'
    const isScrollingDown = scrollDirectionRef.current === 'down'
    
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
    }

    // ========================================
    // MUDANÇA DE COR / GLOW
    // ========================================
    const speed = scrollVelocityRef.current
    
    if (speed < 0.5) {
      targetGlowColorRef.current.copy(COLORS.idle)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 0.5, 0.1)
    } else if (speed > 3) {
      targetGlowColorRef.current.copy(COLORS.fast)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 2.5, 0.1)
    } else if (isScrollingUp) {
      targetGlowColorRef.current.copy(COLORS.rising)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 1.5 + speed * 0.3, 0.1)
    } else if (isScrollingDown) {
      targetGlowColorRef.current.copy(COLORS.falling)
      glowIntensityRef.current = THREE.MathUtils.lerp(glowIntensityRef.current, 1.0 + speed * 0.3, 0.1)
    }
    
    currentGlowColorRef.current.lerp(targetGlowColorRef.current, 0.08)

    // ========================================
    // OLHAR INTERATIVO (CABEÇA SEGUE O MOUSE)
    // ========================================
    if (!isMobile && headBoneRef.current) {
      // Atualizar skeleton
      character.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          child.skeleton.update()
        }
      })
      
      // Calcular rotação alvo baseada na posição do mouse
      // Quanto mais o mouse está para a direita, mais a cabeça vira para a direita
      const targetHeadRotY = mouseRef.current.x * 0.6 // Rotação horizontal (esquerda/direita)
      const targetHeadRotX = -mouseRef.current.y * 0.4 // Rotação vertical (cima/baixo)
      
      // Aplicar rotação suavizada no osso da cabeça
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.y,
        targetHeadRotY,
        0.08
      )
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.x,
        targetHeadRotX,
        0.08
      )
      
      // Se também encontrou o pescoço, aplicar rotação menor nele
      if (neckBoneRef.current && neckBoneRef.current !== headBoneRef.current) {
        neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(
          neckBoneRef.current.rotation.y,
          targetHeadRotY * 0.3, // Pescoço gira menos que a cabeça
          0.05
        )
        neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          neckBoneRef.current.rotation.x,
          targetHeadRotX * 0.2,
          0.05
        )
      }
      
      // Atualizar matriz do osso
      headBoneRef.current.updateMatrixWorld(true)
      if (neckBoneRef.current) {
        neckBoneRef.current.updateMatrixWorld(true)
      }
    }

    // ========================================
    // ANIMAÇÕES BASEADAS NO SCROLL
    // ========================================

    // 1. QUEDA/SUBIDA VERTICAL
    const fallStartY = centerOffset.y + 2
    const fallEndY = centerOffset.y - (isMobile ? 4 : 6)
    const fallDistance = fallStartY - fallEndY
    
    let easedScroll: number
    if (isScrollingUp) {
      easedScroll = 1 - Math.pow(1 - scroll, 2)
    } else {
      easedScroll = scroll * scroll
    }
    const targetY = fallStartY - (easedScroll * fallDistance)

    // 2. MOVIMENTO LATERAL
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

    // 4. ESCALA
    const minScale = BASE_SCALE * 0.8
    const maxScale = BASE_SCALE * 1.3
    const scaleBonus = isScrollingUp ? 0.2 : 0
    const targetScale = minScale + (scroll * (maxScale - minScale)) + scaleBonus * reverseAmount
    
    const currentScale = innerGroupRef.current.scale.x
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15)
    innerGroupRef.current.scale.setScalar(newScale)

    // 5. ROTAÇÃO Y (GIRO)
    const baseRotY = state.clock.elapsedTime * 0.1
    
    if (isScrollingDown) {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, speed * 0.5, 0.1)
    } else if (isScrollingUp) {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, -speed * 0.8, 0.1)
    } else {
      spinVelocityRef.current = THREE.MathUtils.lerp(spinVelocityRef.current, 0, 0.05)
    }
    
    const scrollRotY = scroll * Math.PI * 2 * (1 - reverseAmount * 2)
    groupRef.current.rotation.y = baseRotY + scrollRotY + spinVelocityRef.current

    // 6. ROTAÇÃO X (INCLINAÇÃO)
    const tiltDirection = isScrollingUp ? -0.3 : 0.4
    const targetRotX = scroll * Math.PI * tiltDirection
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.15
    )

    // 7. ROTAÇÃO Z (CAMBALHOTA)
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
      
      glowIntensityRef.current = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    }

    // 9. EFEITO DE "RECUPERAÇÃO" AO SUBIR
    if (isScrollingUp && scroll > 0.1) {
      groupRef.current.rotation.x *= 0.95
      innerGroupRef.current.rotation.z *= 0.95
      
      const heroicPose = reverseAmount * 0.1
      innerGroupRef.current.scale.x = newScale * (1 + heroicPose)
    }
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_character')
  }

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Luz de glow que segue o personagem */}
      <pointLight
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
