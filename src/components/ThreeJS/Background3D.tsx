import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const Background3D = () => {
  const particlesRef = useRef<THREE.Points>(null)

  // Aumentar número de partículas para melhor efeito em tela cheia
  const particleCount = 2000
  
  // Memoizar posições para evitar recriação a cada render
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    // Distribuir partículas em uma área maior para cobrir toda a tela
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 100 // X - área maior
      pos[i + 1] = (Math.random() - 0.5) * 100 // Y - área maior
      pos[i + 2] = (Math.random() - 0.5) * 50 // Z - profundidade
    }
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      // Rotação suave e lenta
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1
    }
  })

  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#0ea5e9"
          transparent
          opacity={0.4}
          sizeAttenuation={true}
        />
      </points>

      {/* Grid helper sutil - removido para não interferir */}
    </>
  )
}

export default Background3D
