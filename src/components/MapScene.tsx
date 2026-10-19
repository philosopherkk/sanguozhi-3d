import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

function TerrainPlaceholder() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 10, 24, 20]} />
      <meshStandardMaterial color="#3a4a3a" flatShading wireframe={false} />
    </mesh>
  )
}

function LandmarkMarkers() {
  const marks: { label: string; position: [number, number, number] }[] = [
    { label: '黃河', position: [0, 0.15, -1.5] },
    { label: '長江', position: [0.5, 0.12, 1.2] },
    { label: '秦嶺', position: [-1.2, 0.35, 0.2] },
    { label: '漢中', position: [-1.5, 0.2, 0.5] },
  ]

  return (
    <>
      {marks.map((m) => (
        <mesh key={m.label} position={m.position}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#c4a574" flatShading />
        </mesh>
      ))}
    </>
  )
}

export function MapScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 10], fov: 45 }}
      shadows
      style={{ width: '100%', height: '100%' }}
      aria-label="三國疆域立體地圖"
    >
      <color attach="background" args={['#1a1f1a']} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.1}
        shadow-mapSize={[1024, 1024]}
      />
      <TerrainPlaceholder />
      <LandmarkMarkers />
      <OrbitControls
        enablePan
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={20}
      />
    </Canvas>
  )
}
