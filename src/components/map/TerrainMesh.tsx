import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  Color,
  DoubleSide,
  type Mesh,
} from 'three'
import { sampleElevation, terrainColor } from '../../geo/elevation'
import { lonLatToWorld, MAP_BOUNDS, MAP_DEPTH, MAP_WIDTH } from '../../geo/project'

const SEG_X = 240
const SEG_Z = 200

export function TerrainMesh() {
  const meshRef = useRef<Mesh>(null)

  const { positions, colors, normalsReady } = useMemo(() => {
    const { lonMin, lonMax, latMin, latMax } = MAP_BOUNDS
    const vertsX = SEG_X + 1
    const vertsZ = SEG_Z + 1
    const positions = new Float32Array(vertsX * vertsZ * 3)
    const colors = new Float32Array(vertsX * vertsZ * 3)

    for (let iz = 0; iz < vertsZ; iz++) {
      for (let ix = 0; ix < vertsX; ix++) {
        const u = ix / SEG_X
        const v = iz / SEG_Z
        const lon = lonMin + u * (lonMax - lonMin)
        const lat = latMax - v * (latMax - latMin)
        const [x, z] = lonLatToWorld(lon, lat)
        let y = sampleElevation(lon, lat)
        if (y < 0) y = -0.04

        // Gentle slope shading baked into vertex color
        const hN = sampleElevation(lon, lat + 0.15)
        const hE = sampleElevation(lon + 0.15, lat)
        const slope = Math.min(1, Math.abs(hN - y) + Math.abs(hE - y)) * 2.2
        const shade = 1 - slope * 0.28

        const i = (iz * vertsX + ix) * 3
        positions[i] = x
        positions[i + 1] = y
        positions[i + 2] = z

        const [r, g, b] = terrainColor(y)
        colors[i] = r * shade
        colors[i + 1] = g * shade
        colors[i + 2] = b * shade
      }
    }

    return { positions, colors, normalsReady: true }
  }, [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !normalsReady) return
    const geom = mesh.geometry
    geom.setAttribute('position', new BufferAttribute(positions, 3))
    geom.setAttribute('color', new BufferAttribute(colors, 3))
    geom.computeVertexNormals()
    geom.computeBoundingSphere()
  }, [positions, colors, normalsReady])

  return (
    <mesh
      ref={meshRef}
      receiveShadow
      castShadow
      frustumCulled={false}
      userData={{ mapWidth: MAP_WIDTH, mapDepth: MAP_DEPTH }}
    >
      <planeGeometry args={[MAP_WIDTH, MAP_DEPTH, SEG_X, SEG_Z]} />
      <meshStandardMaterial
        vertexColors
        side={DoubleSide}
        roughness={0.88}
        metalness={0.04}
        envMapIntensity={0.35}
      />
    </mesh>
  )
}

export function OceanPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[MAP_WIDTH * 1.35, MAP_DEPTH * 1.35]} />
        <meshPhysicalMaterial
          color={new Color('#1c4a62')}
          roughness={0.18}
          metalness={0.08}
          transmission={0.12}
          thickness={0.4}
          transparent
          opacity={0.92}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* Soft horizon band */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <ringGeometry args={[18, 32, 64]} />
        <meshBasicMaterial color="#152830" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}
