import { ContactShadows, Environment, Sky, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useYear } from '../state/YearContext'
import { MapLabels } from './map/Labels'
import { MapOrbitRig } from './map/MapOrbitRig'
import { Rivers } from './map/Rivers'
import { OceanPlane, TerrainMesh } from './map/TerrainMesh'
import { TerritoryLayers } from './map/TerritoryLayers'

function SceneContent() {
  const { control } = useYear()

  return (
    <>
      <color attach="background" args={['#0b1520']} />
      <fog attach="fog" args={['#1a2834', 22, 48]} />

      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#d8e4f0', '#3a3428', 0.65]} />
      <directionalLight
        castShadow
        position={[14, 20, 6]}
        intensity={1.55}
        color="#fff2dd"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <directionalLight position={[-10, 8, -12]} intensity={0.35} color="#8eb4d8" />
      <pointLight position={[0, 6, 0]} intensity={0.25} color="#c4a574" distance={40} />

      <Sky
        distance={450000}
        sunPosition={[10, 2.2, -6]}
        inclination={0.51}
        azimuth={0.22}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
        rayleigh={1.15}
        turbidity={4.5}
      />
      <Stars radius={100} depth={50} count={3500} factor={2.6} saturation={0} fade speed={0.25} />
      <Environment preset="sunset" environmentIntensity={0.28} />

      <OceanPlane />
      <TerrainMesh />
      <TerritoryLayers control={control} />
      <Rivers />
      <MapLabels showCities />

      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.35}
        scale={48}
        blur={2.4}
        far={12}
        color="#0a1014"
      />

      <MapOrbitRig />
    </>
  )
}

export function MapScene() {
  return (
    <Canvas
      camera={{ position: [0, 12, 15], fov: 40, near: 0.1, far: 120 }}
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      aria-label="三國疆域立體地形圖；可用右側視角鈕或拖曳旋轉"
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
