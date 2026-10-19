import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useMapView } from '../../state/MapViewContext'
import { Vector3 } from 'three'

const DEFAULT_POS = new Vector3(0, 12, 15)
const DEFAULT_TARGET = new Vector3(0, 0.35, 0)
const MIN_POLAR = 0.2
const MAX_POLAR = Math.PI / 2.08
export function MapOrbitRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const { register } = useMapView()

  useEffect(() => {
    register({
      yaw: (radians) => {
        const c = controlsRef.current
        if (!c) return
        c.setAzimuthalAngle(c.getAzimuthalAngle() + radians)
        c.update()
      },
      pitch: (radians) => {
        const c = controlsRef.current
        if (!c) return
        const next = Math.min(
          MAX_POLAR,
          Math.max(MIN_POLAR, c.getPolarAngle() + radians),
        )
        c.setPolarAngle(next)
        c.update()
      },
      reset: () => {
        const c = controlsRef.current
        camera.position.copy(DEFAULT_POS)
        if (c) {
          c.target.copy(DEFAULT_TARGET)
          c.update()
        }
      },
    })
    return () => register(null)
  }, [camera, register])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableRotate
      enableZoom
      screenSpacePanning
      maxPolarAngle={MAX_POLAR}
      minPolarAngle={MIN_POLAR}
      minDistance={4}
      maxDistance={40}
      target={[DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z]}
      zoomSpeed={0.85}
      panSpeed={0.75}
      rotateSpeed={0.5}
      enableDamping
      dampingFactor={0.08}
    />
  )
}
