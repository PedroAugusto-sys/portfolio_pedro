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
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
      
      const floatY = Math.sin(state.clock.elapsedTime * 0.8) * 0.4 + 
                     Math.sin(state.clock.elapsedTime * 1.5) * 0.15
      innerGroupRef.current.position.y = initialYRef.current + floatY
    }
  })

  const { cerebro, centerOffset } = useMemo(() => {
    const cloned = cerebroScene.clone()
    
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })
    
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    
    const offset = new THREE.Vector3(-center.x, -center.y - 0.3, -center.z)
    
    initialYRef.current = offset.y
    
    return {
      cerebro: cloned,
      centerOffset: offset
    }
  }, [cerebroScene])

  const BASE_SCALE = 0.8

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
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
