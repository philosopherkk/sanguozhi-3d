import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import {
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  type Mesh,
} from 'three'
import { PROVINCES, type Province } from '../../data/provinces'
import type { ProvinceControl } from '../../data/territoryControl'
import { sampleElevation } from '../../geo/elevation'
import { lonLatToWorld } from '../../geo/project'
import { factionColor, factionName } from '../../lib/factionColors'
import type { FactionId } from '../../types/data'

function provinceShape(province: Province): Shape {
  const shape = new Shape()
  province.ring.forEach(([lon, lat], i) => {
    const [x, z] = lonLatToWorld(lon, lat)
    // Shape is in XY; we rotate mesh later so Y→world Z
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  return shape
}

function centroid(province: Province): [number, number, number] {
  let lon = 0
  let lat = 0
  for (const [a, b] of province.ring) {
    lon += a
    lat += b
  }
  const n = province.ring.length
  lon /= n
  lat /= n
  const [x, z] = lonLatToWorld(lon, lat)
  const y = Math.max(sampleElevation(lon, lat), 0.02) + 0.12
  return [x, y, z]
}

function ProvinceMesh({
  province,
  faction,
}: {
  province: Province
  faction: FactionId
}) {
  const color = factionColor(faction)
  const geometry = useMemo(() => {
    const shape = provinceShape(province)
    const geo = new ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: false,
    })
    // Extrude along +Z in shape space; rotate to sit on XZ ground
    geo.rotateX(-Math.PI / 2)
    const c = centroid(province)
    geo.translate(0, c[1] * 0.15 + 0.05, 0)
    return geo
  }, [province])

  const labelPos = useMemo(() => centroid(province), [province])

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.55}
          roughness={0.55}
          metalness={0.08}
          clearcoat={0.25}
          clearcoatRoughness={0.4}
          emissive={color}
          emissiveIntensity={0.14}
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
          <span className="terr-label__prov">{province.name}</span>
          <span className="terr-label__fac" style={{ color }}>
            {factionName(faction)}
          </span>
        </div>
      </Html>
    </group>
  )
}

export function TerritoryLayers({ control }: { control: ProvinceControl }) {
  const entries = useMemo(() => {
    return PROVINCES.map((p) => {
      const faction = control[p.id]
      return faction ? { province: p, faction } : null
    }).filter(Boolean) as { province: Province; faction: FactionId }[]
  }, [control])

  return (
    <group name="territories">
      {entries.map(({ province, faction }) => (
        <ProvinceMesh key={province.id} province={province} faction={faction} />
      ))}
    </group>
  )
}

/** Keep TypeScript happy if Mesh type needed later */
export type TerritoryMesh = Mesh
