import { useMemo } from 'react'
import {
  CatmullRomCurve3,
  Color,
  type ColorRepresentation,
  Vector3,
} from 'three'
import { sampleElevation } from '../../geo/elevation'
import { lonLatToWorld } from '../../geo/project'
import { RIVERS } from '../../geo/rivers'

function RiverTube({
  path,
  width,
  color,
}: {
  path: readonly (readonly [number, number])[]
  width: number
  color: ColorRepresentation
}) {
  const { curve, tubularSegments } = useMemo(() => {
    const pts = path.map(([lon, lat]) => {
      const [x, z] = lonLatToWorld(lon, lat)
      const y = Math.max(sampleElevation(lon, lat), 0.02) + 0.05
      return new Vector3(x, y, z)
    })
    return {
      curve: new CatmullRomCurve3(pts, false, 'catmullrom', 0.5),
      tubularSegments: Math.max(80, path.length * 14),
    }
  }, [path])

  const col = useMemo(() => new Color(color), [color])

  return (
    <mesh>
      <tubeGeometry args={[curve, tubularSegments, width, 8, false]} />
      <meshPhysicalMaterial
        color={col}
        roughness={0.15}
        metalness={0.05}
        transmission={0.2}
        thickness={0.3}
        transparent
        opacity={0.92}
        emissive={col}
        emissiveIntensity={0.12}
        envMapIntensity={0.6}
      />
    </mesh>
  )
}

export function Rivers() {
  return (
    <group>
      {RIVERS.map((r) => (
        <RiverTube key={r.id} path={r.path} width={r.width * 1.05} color={r.color} />
      ))}
    </group>
  )
}
