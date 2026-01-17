import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { track3DInteraction } from '../../utils/analytics'

interface ProjectCard3DProps {
  modelPath: string
  modelIndex: number
}

const ProjectCard3D = ({ modelPath, modelIndex }: ProjectCard3DProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const { scene } = useGLTF(modelPath)

  useFrame((state) => {
    if (groupRef.current && modelRef.current) {
      // Rotação suave contínua
      groupRef.current.rotation.y += 0.01
      
      // Movimento flutuante vertical
      const floatOffset = Math.sin(state.clock.elapsedTime * 1.5 + modelIndex) * 0.3
      modelRef.current.position.y = floatOffset
      
      // Rotação adicional no hover
      if (hovered) {
        modelRef.current.rotation.y += 0.05
        // Transição suave de escala
        modelRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1)
      } else {
        // Voltar ao tamanho normal suavemente
        modelRef.current.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.1)
      }
    }
  })

  const handleClick = () => {
    track3DInteraction('click', `project_card_${modelIndex}`)
  }

  const handlePointerOver = () => {
    setHovered(true)
    track3DInteraction('hover', `project_card_${modelIndex}`)
  }

  const handlePointerOut = () => {
    setHovered(false)
  }

  // Clonar a cena para evitar problemas de reutilização
  const clonedScene = scene.clone()

  // Escala padrão ajustada para cards menores
  // Aumentar escala para smartphone (todos os smartphones)
  // Ajustar escala para estrela
  const isSmartphone = modelPath.includes('smartphone')
  const isStar = modelPath.includes('star')
  const BASE_SCALE = isSmartphone ? 2.5 : isStar ? 1.2 : 0.5

  return (
    <group ref={groupRef}>
      <group
        ref={modelRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={[BASE_SCALE, BASE_SCALE, BASE_SCALE]}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  )
}

export default ProjectCard3D

