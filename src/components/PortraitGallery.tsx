import { useEffect, useMemo, useState } from 'react'
import { PersonPortrait, withBase } from './PersonPortrait'

type PortraitRow = {
  era: string
  id: string
  name: string
  file: string
  basis: string
}

type PortraitManifest = {
  style?: string
  portraits: PortraitRow[]
}

const ERA_LABELS: Record<string, string> = {
  zhou: '夏商周',
  qinhan: '秦漢',
  sanguozhi: '三國',
  'imperial-jin': '晉',
  'imperial-nanbei': '十六國南北朝',
  'imperial-sui': '隋',
  'imperial-tang': '唐',
  'imperial-wudai': '五代十國',
  'imperial-liaosong': '遼宋',
  'imperial-yuanmingqing': '元明清',
  'imperial-minguo': '民國',
  'imperial-civilwar': '國共內戰',
  'imperial-prc': '共和國',
  'japan-history': '日本通史',
  'japan-asuka': '飛鳥',
  'japan-nara': '奈良',
  heian: '平安',
  'japan-kamakura': '鎌倉',
  'japan-muromachi': '室町',
  sengoku: '戰國',
  'japan-azuchi': '安土桃山',
  'japan-edo': '江戶',
  bakumatsu: '幕末',
  'japan-imjin': '朝鮮之役',
  'japan-modern': '近代日本',
}

/**
 * 人物圖鑑：把 public/portraits/manifest.json 的想像圖連同姓名與考據依據列出。
 * 讀 manifest 而非另建一份清單，避免圖檔增減時圖鑑與資料各自漂移。
 * 日本通史的二十六張圖未掛在任何時代的人物頁，這裡是它們的展示入口。
 */
export function PortraitGallery() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<PortraitRow[]>([])
  const [era, setEra] = useState('all')
  const [query, setQuery] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    // manifest 放在 public/ 下，部署在 base（例如 /sanguozhi-3d/）時根絕對路徑會 404，
    // 因此與頭像一樣經 withBase 解析；Vercel 的根路徑部署結果不變。
    fetch(withBase('/portraits/manifest.json'), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<PortraitManifest>
      })
      .then((data) => setRows(data.portraits ?? []))
      .catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const eras = useMemo(
    () => Array.from(new Set(rows.map((row) => row.era))).sort(),
    [rows],
  )
  const shown = useMemo(() => {
    const needle = query.trim()
    return rows.filter((row) => {
      if (era !== 'all' && row.era !== era) return false
      if (!needle) return true
      return row.name.includes(needle) || row.id.includes(needle)
    })
  }, [rows, era, query])

  return (
    <>
      <button
        type="button"
        className="portrait-gallery__trigger"
        aria-label="開啟人物圖鑑"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        人物圖鑑
      </button>
      {open ? (
        <div className="portrait-gallery" role="dialog" aria-modal="true" aria-label="人物圖鑑">
          <button
            type="button"
            className="portrait-gallery__backdrop"
            aria-label="關閉人物圖鑑"
            onClick={() => setOpen(false)}
          />
          <section className="portrait-gallery__panel">
            <header className="portrait-gallery__head">
              <div>
                <h2>人物圖鑑</h2>
                <p>
                  共 {rows.length} 幅人物想像圖，依人物記錄的 id 與時代配對。想像圖不是史料或本人照片。
                </p>
              </div>
              <button
                type="button"
                className="portrait-gallery__close"
                onClick={() => setOpen(false)}
              >
                關閉
              </button>
            </header>
            <div className="portrait-gallery__filters">
              <label>
                時代
                <select value={era} onChange={(event) => setEra(event.target.value)}>
                  <option value="all">全部（{rows.length}）</option>
                  {eras.map((id) => (
                    <option key={id} value={id}>
                      {ERA_LABELS[id] ?? id}（{rows.filter((row) => row.era === id).length}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                搜尋姓名
                <input
                  type="search"
                  value={query}
                  placeholder="例如：諸葛亮"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <span className="portrait-gallery__count">顯示 {shown.length} 幅</span>
            </div>
            {failed ? (
              <p className="portrait-gallery__empty">圖鑑資料載入失敗，請重新整理頁面。</p>
            ) : shown.length === 0 ? (
              <p className="portrait-gallery__empty">沒有符合的人物。</p>
            ) : (
              <ul className="portrait-gallery__grid">
                {shown.map((row) => (
                  <li key={`${row.era}:${row.id}`} className="portrait-gallery__item">
                    <PersonPortrait
                      src={`/portraits/${row.file}`}
                      name={row.name}
                      note={row.basis}
                      size="md"
                    />
                    <strong>{row.name}</strong>
                    <span>{ERA_LABELS[row.era] ?? row.era}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
