import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const About3D = () => {
  const groupRef = useRef<THREE.Group>(null)
  const innerGroupRef = useRef<THREE.Group>(null)
  const initialYRef = useRef<number>(0)
  const { scene: cerebroScene } = useGLTF('/models/about/cerebro.glb')

  useFrame((state) => {
    if (groupRef.current && innerGroupRef.current) {
      // Rotação suave baseada em tempo (mais precisa que incremental)
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
      
      // Animação de floating (movimento vertical suave com múltiplas frequências para movimento mais orgânico)
      const floatY = Math.sin(state.clock.elapsedTime * 0.8) * 0.4 + 
                     Math.sin(state.clock.elapsedTime * 1.5) * 0.15
      innerGroupRef.current.position.y = initialYRef.current + floatY
    }
  })

  // Clonar a cena e calcular bounding box para centralizar
  const { cerebro, centerOffset } = useMemo(() => {
    const cloned = cerebroScene.clone()
    
    // Otimizar geometria
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })
    
    // Calcular bounding box do modelo
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    
    // Calcular offset para centralizar (inverter o centro)
    // Ajustar Y para centralizar melhor (reduzir offset negativo)
    const offset = new THREE.Vector3(-center.x, -center.y - 0.3, -center.z)
    
    // Armazenar Y inicial para animação de floating
    initialYRef.current = offset.y
    
    return {
      cerebro: cloned,
      centerOffset: offset
    }
  }, [cerebroScene])

  // Escala padrão para padronizar tamanhos
  // Reduzir scale para evitar que o cérebro seja cortado
  const BASE_SCALE = 0.8

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Cérebro centralizado (conhecimento) - ajustado para não cortar */}
      <group 
        ref={innerGroupRef}
        position={[centerOffset.x, centerOffset.y, centerOffset.z]} 
        scale={[BASE_SCALE * 5.0, BASE_SCALE * 5.0, BASE_SCALE * 5.0]}
      >
        <primitive object={cerebro} />
      </group>
    </group>
  )
}

export default About3D
