import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { track3DInteraction } from '../../utils/analytics'

const Character3D = () => {
  const groupRef = useRef<THREE.Group>(null)
  const innerGroupRef = useRef<THREE.Group>(null)
  const { scene: characterScene } = useGLTF('/models/hero/character.glb')

  // Clonar e otimizar o modelo
  const character = useMemo(() => {
    const cloned = characterScene.clone()
    
    // Otimizar geometria
    cloned.traverse((child) => {
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
      }
    })
    
    return cloned
  }, [characterScene])

  // Calcular bounding box para centralizar o modelo
  const centerOffset = useMemo(() => {
    try {
      const box = new THREE.Box3().setFromObject(character)
      const center = box.getCenter(new THREE.Vector3())
      // Retornar offset negativo para centralizar
      return new THREE.Vector3(-center.x, -center.y, -center.z)
    } catch (error) {
      console.warn('Erro ao calcular bounding box:', error)
      return new THREE.Vector3(0, 0, 0)
    }
  }, [character])

  // Animação de rotação e flutuação
  useFrame((state) => {
    if (groupRef.current) {
      // Rotação suave no eixo Y
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
    
    if (innerGroupRef.current) {
      // Flutuação vertical suave
      const floatY = Math.sin(state.clock.elapsedTime * 1.2) * 0.3
      innerGroupRef.current.position.y = centerOffset.y + floatY
    }
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_character')
  }

  // Escala base padronizada
  const BASE_SCALE = 1.2

  return (
    <group ref={groupRef} onClick={handleClick}>
      <group 
        ref={innerGroupRef}
        position={[centerOffset.x, centerOffset.y, centerOffset.z]}
        scale={[BASE_SCALE, BASE_SCALE, BASE_SCALE]}
      >
        <primitive object={character} />
      </group>
    </group>
  )
}

// Pré-carregar o modelo
useGLTF.preload('/models/hero/character.glb')

export default Character3D
