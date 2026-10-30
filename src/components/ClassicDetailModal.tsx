import { useState } from 'react'

export type ReadingLevel = 'elementary' | 'secondary' | 'university'

export interface ReadingLayers {
  elementary: string
  secondary: string
  university: string
}

const LEVELS: { id: ReadingLevel; label: string }[] = [
  { id: 'elementary', label: '小學生' },
  { id: 'secondary', label: '中學生' },
  { id: 'university', label: '大學生' },
]

export interface ClassicDetailContent {
  year: number
  /** 預設顯示 year 數字。負數紀年可改傳「前632」。 */
  yearLabel?: string
  title: string
  causes: string
  course: string
  keyFigures: { name: string; role: string }[]
  outcome: string
  classicQuote: string
  classicSource: string
  /** 預設「典籍原文」。意譯時改傳「意譯」。 */
  quoteHeading?: string
  layers: ReadingLayers
  zhwikiUrl: string
  furtherReading?: { label: string; url: string }[]
  /** Card-level primary citation (AGENTS.md) */
  entrySource?: string
  disputed?: boolean
  note?: string
}

export function ClassicDetailModal({
  detail,
  onClose,
}: {
  detail: ClassicDetailContent
  onClose: () => void
}) {
  const [level, setLevel] = useState<ReadingLevel>('secondary')

  return (
    <div
      className="event-detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="event-detail__panel event-detail__panel--wide">
        <header className="event-detail__header">
          <h3 id="event-detail-title">
            {detail.yearLabel ?? detail.year} · {detail.title}
          </h3>
          <button type="button" className="event-detail__close" onClick={onClose}>
            關閉
          </button>
        </header>
        <div className="event-detail__body">
          <section className="event-detail__quote">
            <h4>{detail.quoteHeading ?? '典籍原文'}</h4>
            <blockquote>
              <p>{detail.classicQuote}</p>
              <cite>{detail.classicSource}</cite>
            </blockquote>
          </section>
          <section>
            <h4>語譯（分程度）</h4>
            <div className="level-tabs" role="tablist" aria-label="語譯程度">
              {LEVELS.map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  role="tab"
                  aria-selected={level === lv.id}
                  className={
                    level === lv.id ? 'level-tabs__btn is-active' : 'level-tabs__btn'
                  }
                  onClick={() => setLevel(lv.id)}
                >
                  {lv.label}
                </button>
              ))}
            </div>
            <p className="event-detail__paraphrase event-detail__paraphrase--long">
              {detail.layers[level]}
            </p>
          </section>
          <section>
            <h4>起因</h4>
            <p>{detail.causes}</p>
          </section>
          <section>
            <h4>經過</h4>
            <p>{detail.course}</p>
          </section>
          <section>
            <h4>關鍵人物</h4>
            <ul className="event-detail__figures">
              {detail.keyFigures.map((f) => (
                <li key={f.name}>
                  <strong>{f.name}</strong>
                  <span>{f.role}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>結果與影響</h4>
            <p>{detail.outcome}</p>
          </section>
          {detail.entrySource ? (
            <p className="person-source">出典：{detail.entrySource}</p>
          ) : null}
          {detail.disputed ? (
            <p className="person-note">存疑條目{detail.note ? `：${detail.note}` : ''}</p>
          ) : detail.note ? (
            <p className="person-note">{detail.note}</p>
          ) : null}
          <p className="person-source">
            延伸閱讀：
            <a href={detail.zhwikiUrl} target="_blank" rel="noreferrer">
              中文維基百科
            </a>
            {detail.furtherReading?.map((r) => (
              <span key={r.url}>
                {' · '}
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="event-detail__backdrop"
        aria-label="關閉詳情"
        onClick={onClose}
      />
    </div>
  )
}
