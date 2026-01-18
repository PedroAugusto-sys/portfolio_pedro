import { useRef, useMemo, useEffect, useState } from 'react'
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
}

const Character3D = ({ scrollProgress = 0 }: Character3DProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const innerGroupRef = useRef<THREE.Group>(null)
  const { scene: characterScene } = useGLTF('/models/hero/character.glb')
  const isMobile = useMobile()
  
  // Estado para controlar o progresso da animação de entrada
  const [fadeInProgress, setFadeInProgress] = useState(0)
  
  // Refs para materiais para poder modificá-los
  const materialsRef = useRef<Map<string, THREE.Material>>(new Map())
  const originalColorsRef = useRef<Map<string, THREE.Color>>(new Map())
  
  // Flag para inicialização
  const initializedRef = useRef(false)
  
  // Refs para mouse tracking
  const mouseRef = useRef({ x: 0, y: 0 })
  const neckBoneRef = useRef<THREE.Bone | null>(null)
  
  // Refs para sistema de partículas
  const particlesRef = useRef<Particle[]>([])
  const particlesGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const particlesMaterialRef = useRef<THREE.PointsMaterial | null>(null)
  const particlesSystemRef = useRef<THREE.Points | null>(null)
  const previousScrollProgressRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const lastScrollProgressRef = useRef(scrollProgress)
  const lastScrollUpdateRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0)

  const character = useMemo(() => {
    const cloned = characterScene.clone(true)
    
    // preserveMaterials já clona os materiais, então vamos trabalhar com os materiais já clonados
    preserveMaterials(cloned)
    
    // Armazena os materiais clonados para acesso posterior e garante que as texturas estejam preservadas
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        if (child.material) {
          // preserveMaterials já clonou o material, então vamos garantir que as texturas estejam preservadas
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((mat, index) => {
            const materialKey = `${child.name || 'unnamed'}_${mat.name || 'material'}_${index}`
            
            // Armazena o material (já clonado por preserveMaterials)
            materialsRef.current.set(materialKey, mat)
            
            // Garantir que as texturas estejam preservadas e marcadas para atualização
            if (mat instanceof THREE.MeshStandardMaterial || 
                mat instanceof THREE.MeshPhysicalMaterial ||
                mat instanceof THREE.MeshPhongMaterial ||
                mat instanceof THREE.MeshLambertMaterial) {
              
              // Lista de propriedades de textura para verificar
              const textureProps = [
                'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
                'emissiveMap', 'aoMap', 'lightMap', 'bumpMap', 
                'displacementMap', 'alphaMap', 'envMap'
              ]
              
              textureProps.forEach((prop) => {
                const texture = (mat as any)[prop] as THREE.Texture | undefined
                if (texture && texture.image) {
                  // Garantir que a textura seja atualizada
                  texture.needsUpdate = true
                }
              })
              
              // Garantir que o material seja atualizado
              mat.needsUpdate = true
            }
            
            // Armazena a cor original se o material tiver uma cor
            if (mat instanceof THREE.MeshStandardMaterial || 
                mat instanceof THREE.MeshBasicMaterial ||
                mat instanceof THREE.MeshPhysicalMaterial) {
              originalColorsRef.current.set(materialKey, mat.color.clone())
            }
          })
        }

        if (child instanceof THREE.Mesh) {
          child.frustumCulled = true
          if (child.geometry) {
            child.geometry.computeBoundingSphere()
          }
          child.castShadow = false
          child.receiveShadow = false
        }
        
        if (child instanceof THREE.SkinnedMesh) {
          child.matrixAutoUpdate = true
          child.castShadow = false
          child.receiveShadow = false
          
          // Garantir que o skeleton seja atualizado (mas não aqui, apenas no useFrame)
          if (child.skeleton) {
            // Não atualizar o skeleton aqui, apenas configurar
            
            // Procurar pelo osso da cabeça/pescoço para o olhar interativo
            const bones = child.skeleton.bones
            
            // Função recursiva para buscar na hierarquia de ossos
            const findBoneRecursive = (bone: THREE.Bone, targetNames: string[]): THREE.Bone | null => {
              // Verificar se o nome do osso corresponde
              if (targetNames.some(name => 
                bone.name.toLowerCase().includes(name.toLowerCase()) || 
                bone.name.toLowerCase() === name.toLowerCase()
              )) {
                return bone
              }
              
              // Buscar nos filhos
              for (const childBone of bone.children) {
                if (childBone instanceof THREE.Bone) {
                  const found = findBoneRecursive(childBone, targetNames)
                  if (found) return found
                }
              }
              
              return null
            }
            
            // Tentar encontrar o osso da cabeça ou pescoço
            const possibleNames = ['head', 'neck', 'cabeça', 'pescoço', 'skull', 'cranio']
            
            // Buscar na raiz primeiro
            for (const bone of bones) {
              const found = findBoneRecursive(bone, possibleNames)
              if (found) {
                neckBoneRef.current = found
                break
              }
            }
            
            // Se não encontrou, usar o osso mais alto na hierarquia
            if (!neckBoneRef.current && bones.length > 0) {
              let topBone = bones[0]
              let maxY = topBone.position.y
              
              for (const bone of bones) {
                if (bone.position.y > maxY) {
                  topBone = bone
                  maxY = bone.position.y
                }
              }
              neckBoneRef.current = topBone
            }
          }
        }
      }
    })
    
    return cloned
  }, [characterScene])

  const centerOffset = useMemo(() => {
    try {
      const box = new THREE.Box3().setFromObject(character)
      const center = box.getCenter(new THREE.Vector3())
      return new THREE.Vector3(-center.x, -center.y, -center.z)
    } catch (error) {
      console.warn('Erro ao calcular bounding box:', error)
      return new THREE.Vector3(0, 0, 0)
    }
  }, [character])

  const BASE_SCALE = isMobile ? 1.0 : 1.2
  const lerpFactor = isMobile ? 0.5 : 0.4 // Fator de suavização mais rápido para resposta mais imediata

  // Animação de entrada (fade-in)
  useEffect(() => {
    // Ao montar, começamos a animar o fadeInProgress de 0 para 1
    let startTime = Date.now()
    const duration = 1500 // 1.5 segundos para o fade-in

    const animateFadeIn = () => {
      const elapsedTime = Date.now() - startTime
      const progress = Math.min(1, elapsedTime / duration)
      setFadeInProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animateFadeIn)
      }
    }
    requestAnimationFrame(animateFadeIn)
  }, [])

  // Rastreamento de posição do mouse (apenas em desktop)
  useEffect(() => {
    if (isMobile) return
    
    const handleMouseMove = (event: MouseEvent) => {
      // Normalizar posição do mouse de -1 a 1
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isMobile])

  useEffect(() => {
    if (Math.abs(scrollProgress - lastScrollProgressRef.current) > 0.0001) {
      lastScrollProgressRef.current = scrollProgress
      lastScrollUpdateRef.current = typeof performance !== 'undefined' ? performance.now() : 0
    }
  }, [scrollProgress])

  // Inicializar sistema de partículas
  useEffect(() => {
    // Criar geometria de partículas
    const geometry = new THREE.BufferGeometry()
    const maxParticles = 500
    const positions = new Float32Array(maxParticles * 3)
    // Inicializar todas as posições como zero
    positions.fill(0)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    particlesGeometryRef.current = geometry

    // Criar material de partículas (binários 01 ou poeira estelar)
    const material = new THREE.PointsMaterial({
      color: 0x00ffff, // Ciano para binários
      size: 0.08, // Aumentado para melhor visibilidade
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    
    particlesMaterialRef.current = material

    // Criar sistema de partículas
    const particles = new THREE.Points(geometry, material)
    particles.visible = false // Começa invisível
    particlesSystemRef.current = particles

    return () => {
      if (particlesGeometryRef.current) {
        particlesGeometryRef.current.dispose()
      }
      if (particlesMaterialRef.current) {
        particlesMaterialRef.current.dispose()
      }
      particlesSystemRef.current = null
    }
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current || !innerGroupRef.current) return

    // Inicializar posição, escala e rotação na primeira execução
    if (!initializedRef.current) {
      // Começar bem acima (de cima) para o efeito de queda
      // Esta posição inicial será sobrescrita pela animação de scroll, mas serve como base
      const initialScale = isMobile ? BASE_SCALE * 0.6 : BASE_SCALE * 0.7
      const startY = centerOffset.y + (isMobile ? 6 : 10) // Mesma posição inicial usada na animação
      innerGroupRef.current.position.set(centerOffset.x, startY, centerOffset.z)
      innerGroupRef.current.scale.set(initialScale, initialScale, initialScale)
      innerGroupRef.current.rotation.set(0, 0, 0)
      groupRef.current.rotation.set(0, 0, 0)
      initializedRef.current = true
      
      // Adicionar sistema de partículas ao grupo
      if (particlesSystemRef.current) {
        groupRef.current.add(particlesSystemRef.current)
      }
    }

    // --- OLHAR INTERATIVO (MOUSE TRACKING) ---
    // Atualizar skeleton se houver (apenas uma vez por frame)
    let skeletonUpdated = false
    character.traverse((child) => {
      if (!skeletonUpdated && child instanceof THREE.SkinnedMesh && child.skeleton) {
        child.skeleton.update()
        skeletonUpdated = true
      }
    })
    
    if (neckBoneRef.current) {
      // Calcular rotação baseada na posição do mouse
      const targetRotationY = mouseRef.current.x * 0.5 // Limitar rotação Y
      const targetRotationX = -mouseRef.current.y * 0.5 // Limitar rotação X (invertido)
      
      // Aplicar rotação suavizada usando lerp
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        neckBoneRef.current.rotation.y,
        targetRotationY,
        0.1
      )
      neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        neckBoneRef.current.rotation.x,
        targetRotationX,
        0.1
      )
      
      // Garantir que o osso seja atualizado
      neckBoneRef.current.updateMatrixWorld(true)
    } else {
      // Fallback: aplicar rotação no grupo interno se o osso não for encontrado
      const targetRotationY = mouseRef.current.x * 0.2
      const targetRotationX = -mouseRef.current.y * 0.2
      
      innerGroupRef.current.rotation.y += (targetRotationY - innerGroupRef.current.rotation.y) * 0.05
      innerGroupRef.current.rotation.x += (targetRotationX - innerGroupRef.current.rotation.x) * 0.05
    }
    // --- FIM DO OLHAR INTERATIVO ---

    const now = typeof performance !== 'undefined' ? performance.now() : 0
    let effectiveScrollProgress = scrollProgress

    // Fallback: recalcula progresso de scroll direto do DOM se o prop estiver "travado"
    // Isso garante que mesmo se o scrollProgress não atualizar, ainda funcionará
    if (now - lastScrollUpdateRef.current > 200 || Math.abs(scrollProgress - effectiveScrollProgress) > 0.1) {
      const heroElement = document.getElementById('hero')
      if (heroElement) {
        const rect = heroElement.getBoundingClientRect()
        const sectionHeight = heroElement.offsetHeight || window.innerHeight
        if (rect.bottom < 0) {
          effectiveScrollProgress = 1
        } else if (rect.top > window.innerHeight) {
          effectiveScrollProgress = 0
        } else {
          // Quando rect.top é negativo, significa que já scrollou para baixo
          // Quanto mais negativo, mais scrollou
          const scrolled = Math.max(0, -rect.top)
          effectiveScrollProgress = Math.max(0, Math.min(1, scrolled / sectionHeight))
        }
      }
    }

    // ANIMAÇÃO DE QUEDA: Personagem cai de cima para baixo conforme o scroll
    // Quanto mais você scrolla, mais o personagem desce (como se estivesse caindo)
    
    // Posição Y: começa bem acima e cai para baixo conforme scroll aumenta
    // scrollProgress 0 = no topo (posição inicial), scrollProgress 1 = embaixo (posição final)
    const startY = centerOffset.y + (isMobile ? 6 : 10) // Posição inicial (bem acima)
    const endY = centerOffset.y - (isMobile ? 5 : 8) // Posição final (bem abaixo)
    const fallDistance = startY - endY // Distância total da queda
    
    // Interpola a posição Y baseada no scrollProgress
    // Quando scrollProgress = 0, personagem está em startY (alto)
    // Quando scrollProgress = 1, personagem está em endY (baixo)
    const targetPosY = startY - (effectiveScrollProgress * fallDistance)
    
    // Posição X: pequeno movimento lateral baseado no scroll (opcional)
    const targetPosX = centerOffset.x + (effectiveScrollProgress * 0.5) // Move levemente para a direita
    
    // Posição Z: pequeno movimento para frente/trás baseado no scroll
    const targetPosZ = centerOffset.z + (effectiveScrollProgress * -0.8) // Move levemente para trás
    
    // Aplicar posições com resposta direta ao scroll (sem lerp no Y para resposta imediata)
    innerGroupRef.current.position.x = THREE.MathUtils.lerp(
      innerGroupRef.current.position.x,
      targetPosX,
      0.8 // Mais rápido para resposta imediata
    )
    // Y sem lerp para garantir que a queda seja visível e imediata
    innerGroupRef.current.position.y = targetPosY
    innerGroupRef.current.position.z = THREE.MathUtils.lerp(
      innerGroupRef.current.position.z,
      targetPosZ,
      0.8
    )

    // Escala: aumenta um pouco conforme cai (efeito de aproximação)
    const minScale = isMobile ? BASE_SCALE * 0.6 : BASE_SCALE * 0.7
    const maxScale = isMobile ? BASE_SCALE * 1.0 : BASE_SCALE * 1.1
    const targetScale = minScale + (effectiveScrollProgress * (maxScale - minScale))
    
    innerGroupRef.current.scale.set(
      THREE.MathUtils.lerp(innerGroupRef.current.scale.x, targetScale, lerpFactor),
      THREE.MathUtils.lerp(innerGroupRef.current.scale.y, targetScale, lerpFactor),
      THREE.MathUtils.lerp(innerGroupRef.current.scale.z, targetScale, lerpFactor)
    )

    // Rotação: simula o boneco girando enquanto cai
    // Rotação Y: combina rotação base com rotação do scroll
    const baseRotationY = state.clock.elapsedTime * 0.15 // Rotação base mais lenta
    const scrollRotationY = effectiveScrollProgress * Math.PI * 1.2 // Rotação adicional do scroll (aumentada para ser mais visível)
    const targetRotationY = baseRotationY + scrollRotationY
    
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY,
      0.6 // Mais rápido para resposta imediata
    )
    
    // Rotação X: inclina para frente conforme cai (como se estivesse caindo de cabeça)
    const targetRotationX = effectiveScrollProgress * Math.PI * 0.6 // Até ~108 graus (mais inclinado)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotationX,
      0.6
    )
    
    // Rotação Z: rotação lateral (como se estivesse girando no ar)
    const targetRotationZ = effectiveScrollProgress * Math.PI * 0.5 // Até 90 graus (mais rotação)
    innerGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      innerGroupRef.current.rotation.z,
      targetRotationZ,
      0.6
    )

    // --- SISTEMA DE PARTÍCULAS DE RASTRO NO SCROLL ---
    if (particlesSystemRef.current && particlesGeometryRef.current && innerGroupRef.current) {
      // Calcular velocidade do scroll (proteção contra delta muito grande ou muito pequeno)
      const safeDelta = Math.min(Math.max(delta, 0.001), 0.1) // Limitar delta entre 0.001 e 0.1
      const scrollDelta = effectiveScrollProgress - previousScrollProgressRef.current
      scrollVelocityRef.current = Math.abs(scrollDelta) / safeDelta
      previousScrollProgressRef.current = effectiveScrollProgress

      // Emitir partículas continuamente durante o scroll (não apenas em scroll rápido)
      // Partículas devem sair do personagem como se ele estivesse caindo
      if (effectiveScrollProgress > 0.1) {
        // Emitir partículas baseado no scrollProgress, não apenas na velocidade
        const emitRate = effectiveScrollProgress * (isMobile ? 3 : 5) // Mais partículas conforme scroll aumenta
        const emitCount = Math.min(Math.floor(emitRate), isMobile ? 8 : 15)
        
        for (let i = 0; i < emitCount; i++) {
          if (particlesRef.current.length < 500) {
            // Posição da partícula na posição Y do personagem (onde ele está caindo)
            const characterPos = innerGroupRef.current.position.clone()
            const particle: Particle = {
              position: new THREE.Vector3(
                characterPos.x + (Math.random() - 0.5) * 0.6,
                characterPos.y + (Math.random() - 0.5) * 0.4,
                characterPos.z + (Math.random() - 0.5) * 0.6
              ),
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                -Math.abs(Math.random() * 0.5 + 0.2), // Velocidade para baixo (caindo)
                (Math.random() - 0.5) * 0.8
              ),
              life: 1.5,
              maxLife: 1.5 + Math.random() * 0.8 // Vida entre 1.5 e 2.3 segundos
            }
            particlesRef.current.push(particle)
          }
        }
      }
      
      // Também emitir partículas em scroll rápido (adicional)
      const scrollThreshold = isMobile ? 2.0 : 1.5
      if (scrollVelocityRef.current > scrollThreshold) {
        const maxParticles = isMobile ? 5 : 10
        const emitCount = Math.min(Math.floor(scrollVelocityRef.current * (isMobile ? 2 : 3)), maxParticles)
        
        for (let i = 0; i < emitCount; i++) {
          if (particlesRef.current.length < 500) {
            const characterPos = innerGroupRef.current.position.clone()
            const particle: Particle = {
              position: new THREE.Vector3(
                characterPos.x + (Math.random() - 0.5) * 0.5,
                characterPos.y + (Math.random() - 0.5) * 0.3,
                characterPos.z + (Math.random() - 0.5) * 0.5
              ),
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.6,
                -Math.abs(Math.random() * 0.4 + 0.1),
                (Math.random() - 0.5) * 0.6
              ),
              life: 1.2,
              maxLife: 1.2 + Math.random() * 0.6
            }
            particlesRef.current.push(particle)
          }
        }
      }

      // Atualizar partículas existentes
      let activeParticleCount = 0
      const activeParticles: Particle[] = []

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const particle = particlesRef.current[i]
        
        // Atualizar vida
        particle.life -= safeDelta
        
        if (particle.life <= 0) {
          // Remover partícula morta
          particlesRef.current.splice(i, 1)
          continue
        }

        // Atualizar posição
        particle.position.add(particle.velocity.clone().multiplyScalar(safeDelta))
        
        // Aplicar gravidade leve
        particle.velocity.y -= 0.5 * safeDelta
        
        // Reduzir velocidade (fricção)
        particle.velocity.multiplyScalar(0.98)

        // Adicionar à lista de partículas ativas
        activeParticles.push(particle)
        activeParticleCount++
      }

      // Atualizar geometria
      if (activeParticleCount > 0) {
        // Criar novo buffer com apenas as partículas ativas
        const activePositions = new Float32Array(activeParticleCount * 3)
        for (let i = 0; i < activeParticleCount; i++) {
          const particle = activeParticles[i]
          activePositions[i * 3] = particle.position.x
          activePositions[i * 3 + 1] = particle.position.y
          activePositions[i * 3 + 2] = particle.position.z
        }
        
        particlesGeometryRef.current.setAttribute(
          'position',
          new THREE.BufferAttribute(activePositions, 3)
        )
        particlesGeometryRef.current.setDrawRange(0, activeParticleCount)
        particlesGeometryRef.current.attributes.position.needsUpdate = true
      } else {
        particlesGeometryRef.current.setDrawRange(0, 0)
      }

      // Atualizar opacidade baseada na vida das partículas
      if (particlesMaterialRef.current && activeParticleCount > 0) {
        particlesSystemRef.current.visible = true
        // Opacidade média baseada na vida das partículas
        let totalLife = 0
        particlesRef.current.forEach(p => {
          totalLife += p.life / p.maxLife
        })
        const avgOpacity = totalLife / activeParticleCount
        particlesMaterialRef.current.opacity = Math.min(0.8, avgOpacity * 0.8)
      } else {
        particlesSystemRef.current.visible = false
      }
    }
    // --- FIM DO SISTEMA DE PARTÍCULAS ---
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_character')
  }

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* 
        IMPORTANTE: não passar position/scale aqui.
        O componente re-renderiza com o scrollProgress e props de posição/escala
        sobrescrevem as animações do useFrame (efeito “não cai”). 
      */}
      <group ref={innerGroupRef}>
        <primitive object={character} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/hero/character.glb')

export default Character3D
