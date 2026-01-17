import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useThreeScene } from '../../hooks/useThreeScene'
import { useMobile } from '../../hooks/useMobile'

interface Scene3DProps {
  children: React.ReactNode
  cameraPosition?: [number, number, number]
  enableControls?: boolean
  className?: string
}


// Componente para gerenciar recuperação de contexto WebGL
const WebGLContextManager = () => {
  const { gl } = useThree()
  
  useEffect(() => {
    const canvas = gl.domElement
    
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn('⚠️ WebGL Context Lost - tentando recuperar...')
    }
    
    const handleContextRestored = () => {
      console.log('✅ WebGL Context Restored - recarregando página...')
      // Recarregar a página para garantir estado limpo
      setTimeout(() => window.location.reload(), 100)
    }
    
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)
    
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])
  
  return null
}

const SceneContent = ({
  children,
  enableControls = true,
  cameraPosition = [0, 0, 5],
}: Omit<Scene3DProps, 'className'>) => {
  useThreeScene()

  return (
    <>
      <WebGLContextManager />
      <PerspectiveCamera makeDefault position={cameraPosition} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.0} />
      {enableControls && (
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
        />
      )}
      {children}
    </>
  )
}

const Scene3D = ({
  children,
  cameraPosition = [0, 0, 5],
  enableControls = true,
  className = '',
}: Scene3DProps) => {
  const isMobile = useMobile()

  return (
    <div className={`w-full h-full ${className}`} style={{ background: 'transparent' }}>
      <Canvas
        gl={{ 
          antialias: false, // Desabilitado para reduzir uso de memória e evitar context lost
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: false,
          preserveDrawingBuffer: false,
          // Configurações para evitar perda de contexto
          failIfMajorPerformanceCaveat: false,
          // Limitar uso de memória
          precision: 'highp',
          // Reduzir uso de recursos
          premultipliedAlpha: false,
        }}
        dpr={[1, 1]} // DPR fixo em 1 para reduzir uso de memória drasticamente
        camera={{ position: cameraPosition }}
        performance={{ min: 0.5, max: 1, debounce: 200 }}
        style={{ background: 'transparent' }}
        frameloop="always"
        onCreated={({ gl, scene }) => {
          try {
            // Configurar o renderer
            // Não tentar acessar o contexto diretamente pois o Canvas já criou um
            // O WebGLContextManager cuida do monitoramento do contexto
            gl.setClearColor('#000000', 0)
            gl.shadowMap.enabled = false
            // Limitar pixel ratio para evitar sobrecarga e perda de contexto
            // DPR fixo em 1 para máxima compatibilidade e menor uso de memória
            gl.setPixelRatio(1)
            gl.outputColorSpace = 'srgb'
            // Otimizações de performance para reduzir uso de memória
            gl.sortObjects = false
            scene.frustumCulled = true
          } catch (error) {
            console.error('Erro ao configurar WebGL:', error)
            // Não lançar o erro para evitar loop infinito de re-renderização
            // O WebGLContextManager vai lidar com a recuperação
          }
        }}
        onError={(error) => {
          console.error('❌ Erro no Canvas:', error)
          // Não fazer reload automático aqui, deixar o WebGLContextManager lidar
        }}
      >
        <Suspense fallback={null}>
          <SceneContent 
            enableControls={enableControls && !isMobile}
            cameraPosition={cameraPosition}
          >
            {children}
          </SceneContent>
        </Suspense>
      </Canvas>
    </div>
  )
}

export default Scene3D
