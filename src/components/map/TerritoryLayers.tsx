import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import {
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  type Mesh,
} from 'three'
import type { ProvinceControl } from '../../data/territoryControl'
import { sampleElevation } from '../../geo/elevation'
import { lonLatToWorld } from '../../geo/project'
import { factionColor, factionName } from '../../lib/factionColors'
import {
  mergeFactionTerritories,
  type LonLat,
} from '../../lib/mergeFactionPolygons'
import type { FactionId } from '../../types/data'

function ringToShape(ring: LonLat[]): Shape {
  const shape = new Shape()
  ring.forEach(([lon, lat], i) => {
    const [x, z] = lonLatToWorld(lon, lat)
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  return shape
}

function ringCentroidY(ring: LonLat[]): [number, number, number] {
  let lon = 0
  let lat = 0
  for (const [a, b] of ring) {
    lon += a
    lat += b
  }
  const n = ring.length
  lon /= n
  lat /= n
  const [x, z] = lonLatToWorld(lon, lat)
  const y = Math.max(sampleElevation(lon, lat), 0.02) + 0.14
  return [x, y, z]
}

function FactionTerritoryMesh({
  faction,
  rings,
  labelAt,
}: {
  faction: FactionId
  rings: LonLat[][]
  labelAt: LonLat
}) {
  const color = factionColor(faction)
  const geometry = useMemo(() => {
    const shapes = rings.map(ringToShape)
    const geo = new ExtrudeGeometry(shapes, {
      depth: 0.28,
      bevelEnabled: false,
    })
    geo.rotateX(-Math.PI / 2)
    const anchor = rings[0] ?? [labelAt]
    const y = ringCentroidY(anchor)[1]
    geo.translate(0, y * 0.12 + 0.06, 0)
    return geo
  }, [rings, labelAt])

  const labelPos = useMemo(() => {
    const anchor = rings[0] ?? [labelAt]
    return ringCentroidY(anchor)
  }, [rings, labelAt])

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.62}
          roughness={0.5}
          metalness={0.06}
          clearcoat={0.2}
          clearcoatRoughness={0.45}
          emissive={color}
          emissiveIntensity={0.18}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html
        position={labelPos}
        center
        distanceFactor={22}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="terr-label">
          <span className="terr-label__fac" style={{ color }}>
            {factionName(faction)}
          </span>
        </div>
      </Html>
    </group>
  )
}

export function TerritoryLayers({ control }: { control: ProvinceControl }) {
  const shapes = useMemo(() => mergeFactionTerritories(control), [control])

  return (
    <group name="territories">
      {shapes.map(({ faction, rings, labelAt }) => (
        <FactionTerritoryMesh
          key={faction}
          faction={faction}
          rings={rings}
          labelAt={labelAt}
        />
      ))}
    </group>
  )
}

/** Keep TypeScript happy if Mesh type needed later */
export type TerritoryMesh = Mesh
