import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { track3DInteraction } from '../../utils/analytics'

const PC3D = () => {
  const groupRef = useRef<THREE.Group>(null)
  const pcRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const { scene: pcScene } = useGLTF('/models/hero/a_pc_playing_btf4.glb')

  useFrame((state) => {
    if (groupRef.current && pcRef.current) {
      // Rotação suave baseada no tempo (mais lenta quando interativo)
      if (!hovered) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.15
      }
      
      // Efeito de hover - escala ligeiramente maior
      if (hovered) {
        pcRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.1)
      } else {
        pcRef.current.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.1)
      }
    }
  })

  const handleClick = () => {
    track3DInteraction('click', 'hero_pc')
  }

  const handlePointerOver = () => {
    setHovered(true)
    track3DInteraction('hover', 'hero_pc')
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  // Clonar a cena para evitar problemas de reutilização
  const pc = pcScene.clone()

  // Escala padrão para padronizar tamanhos
  const BASE_SCALE = 0.8

  return (
    <group ref={groupRef}>
      {/* PC - Interativo */}
      <group 
        ref={pcRef}
        position={[0, 0, 0]} 
        rotation={[0, -Math.PI / 4, 0]} 
        scale={[BASE_SCALE * 0.75, BASE_SCALE * 0.75, BASE_SCALE * 0.75]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive object={pc} />
      </group>
    </group>
  )
}

export default PC3D

