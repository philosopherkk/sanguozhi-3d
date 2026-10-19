import { Html } from '@react-three/drei'
import { sampleElevation } from '../../geo/elevation'
import { lonLatToWorld } from '../../geo/project'
import { LANDMARKS, RIVERS } from '../../geo/rivers'

export function MapLabels({ showCities = true }: { showCities?: boolean }) {
  return (
    <group>
      {LANDMARKS.filter((l) =>
        showCities ? true : l.kind === 'mountain' || l.kind === 'basin',
      ).map((l) => {
        const [x, z] = lonLatToWorld(l.lon, l.lat)
        const y = Math.max(sampleElevation(l.lon, l.lat), 0) + 0.35
        const cls =
          l.kind === 'mountain'
            ? 'map-label map-label--mtn'
            : l.kind === 'city'
              ? 'map-label map-label--city'
              : l.kind === 'pass'
                ? 'map-label map-label--pass'
                : 'map-label map-label--basin'
        return (
          <Html
            key={l.id}
            position={[x, y, z]}
            center
            distanceFactor={18}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <span className={cls}>{l.name}</span>
          </Html>
        )
      })}
      {RIVERS.map((r) => {
        const mid = r.path[Math.floor(r.path.length / 2)]
        const [lon, lat] = mid
        const [x, z] = lonLatToWorld(lon, lat)
        const y = Math.max(sampleElevation(lon, lat), 0) + 0.28
        return (
          <Html
            key={`river-${r.id}`}
            position={[x, y, z]}
            center
            distanceFactor={20}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <span className="map-label map-label--river">{r.name}</span>
          </Html>
        )
      })}
    </group>
  )
}
