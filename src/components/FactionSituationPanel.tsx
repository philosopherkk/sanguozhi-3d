import type { Fact, FactionYearView } from '../lib/factionYearView'

function FactBlock({ label, fact }: { label: string; fact: Fact }) {
  return (
    <section className="faction-situation__block">
      <h4>{label}</h4>
      <p>
        {fact.disputed ? '〔約數〕' : ''}
        {fact.text}
      </p>
      <cite>{fact.source}</cite>
    </section>
  )
}

export function FactionSituationPanel({
  name,
  yearLabel,
  color,
  view,
  onClose,
}: {
  name: string
  yearLabel: string
  color: string
  view: FactionYearView
  onClose: () => void
}) {
  return (
    <article className="faction-situation" aria-label={`${name} ${yearLabel} 詳情`}>
      <header className="faction-situation__head">
        <span className="faction-situation__swatch" style={{ background: color }} />
        <h3>
          {name}
          <small>{yearLabel}</small>
        </h3>
        <button type="button" onClick={onClose}>
          關閉
        </button>
      </header>
      {view.eraIntro ? <FactBlock label="時代簡介" fact={view.eraIntro} /> : null}
      <FactBlock label="人口" fact={view.population} />
      <FactBlock label="戰力" fact={view.military} />
      <FactBlock label="糧食" fact={view.grain} />
      <FactBlock label="本年政治" fact={view.politics} />
      <FactBlock label="本年經濟" fact={view.economy} />
    </article>
  )
}
