import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const Achievements3D = () => {
  const groupRef = useRef<THREE.Group>(null)
  const initialYRef = useRef<number>(0)
  const { scene: rubiksCubeScene } = useGLTF('/models/achievements/rubiks_cube.glb')

  useFrame((state) => {
    if (groupRef.current) {
      // Rotação suave baseada em tempo
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5
      // Flutuação vertical
      groupRef.current.position.y = initialYRef.current + Math.sin(state.clock.elapsedTime) * 0.3
    }
  })

  // Clonar a cena apenas uma vez usando useMemo
  const rubiksCube = useMemo(() => {
    const cloned = rubiksCubeScene.clone()
    
    // Otimizar geometria
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })
    
    return cloned
  }, [rubiksCubeScene])

  // Escala padrão para padronizar tamanhos (mesma usada em outras seções)
  const BASE_SCALE = 0.8

  return (
    <group ref={groupRef} position={[0, initialYRef.current, 0]}>
      {/* Cubo mágico centralizado (conquistas) */}
      <group scale={[BASE_SCALE * 1.5, BASE_SCALE * 1.5, BASE_SCALE * 1.5]}>
        <primitive object={rubiksCube} />
      </group>
    </group>
  )
}

export default Achievements3D

