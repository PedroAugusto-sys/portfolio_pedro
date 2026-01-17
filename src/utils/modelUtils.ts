import * as THREE from 'three'

export const preserveMaterials = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat) => {
            const clonedMat = mat.clone()
            if (clonedMat instanceof THREE.MeshStandardMaterial || 
                clonedMat instanceof THREE.MeshPhongMaterial || 
                clonedMat instanceof THREE.MeshLambertMaterial) {
              clonedMat.needsUpdate = true
              
              const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap']
              
              textureProps.forEach((prop) => {
                const texture = clonedMat[prop as keyof typeof clonedMat] as THREE.Texture | undefined
                if (texture) {
                  texture.needsUpdate = true
                }
              })
            }
            return clonedMat
          })
        } else {
          const mat = child.material.clone()
          if (mat instanceof THREE.MeshStandardMaterial || 
              mat instanceof THREE.MeshPhongMaterial || 
              mat instanceof THREE.MeshLambertMaterial) {
            mat.needsUpdate = true
            
            const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap']
            
            textureProps.forEach((prop) => {
              const texture = mat[prop as keyof typeof mat] as THREE.Texture | undefined
              if (texture) {
                texture.needsUpdate = true
              }
            })
            
            child.material = mat
          }
        }
      }
    }
  })
}