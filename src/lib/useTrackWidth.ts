import { useEffect, useRef, useState } from 'react'

/**
 * 量度刻度列的實際寬度，供 layoutTicks 把「以 1280px 校準」的百分比換算回目前視窗。
 * 窄屏（約 390px）若不換算，四位年份的實際寬度會比估算的大三倍，刻度互相重疊。
 * 首幀用 1280 免得 SSR／量度前後跳動；ResizeObserver 一量到就更新。
 */
export function useTrackWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(1280)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
