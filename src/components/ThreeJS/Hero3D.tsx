import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { track3DInteraction } from '../../utils/analytics'

const Hero3D = () => {
  const groupRef = useRef<THREE.Group>(null)
  const { scene: characterScene } = useGLTF('/models/hero/character.glb')
  const { scene: pcScene } = useGLTF('/models/hero/a_pc_playing_btf4.glb')

  useFrame((state) => {
    if (groupRef.current) {
      // Rotação suave baseada em tempo
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_object')
  }

  // Clonar as cenas apenas uma vez usando useMemo para evitar recriação
  const { character, pc } = useMemo(() => {
    const char = characterScene.clone()
    const pcClone = pcScene.clone()
    
    // Otimizar geometrias
    char.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })
    
    pcClone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })
    
    return { character: char, pc: pcClone }
  }, [characterScene, pcScene])

  // Escala padrão para padronizar tamanhos (mesma usada em outras seções)
  const BASE_SCALE = 0.8

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Personagem principal centralizado - aumentado em 50% */}
      <group position={[-0.5, -0.5, 0]} scale={[BASE_SCALE * 2.7, BASE_SCALE * 2.7, BASE_SCALE * 2.7]}>
        <primitive object={character} />
      </group>

      {/* PC movido para longe do avatar, mais à direita e atrás */}
      <group position={[5.5, -1.5, -2.5]} rotation={[0, -Math.PI / 4, 0]} scale={[BASE_SCALE * 0.75, BASE_SCALE * 0.75, BASE_SCALE * 0.75]}>
        <primitive object={pc} />
      </group>
    </group>
  )
}

export default Hero3D

// Pré-carregar os modelos
useGLTF.preload('/models/hero/character.glb')
useGLTF.preload('/models/hero/a_pc_playing_btf4.glb')
