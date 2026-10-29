import { useMemo } from 'react'
import { FactionSituationPanel } from '../../components/FactionSituationPanel'
import { composeFactionYear, type YearNote } from '../../lib/factionYearView'
import { ZHOU_SITUATION } from '../data/factionSituation'
import { ZHOU_TIMELINE } from '../data/timeline'
import { zhouFactionColor, zhouFactionName } from '../lib/factionColors'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouSelection } from '../state/ZhouSelectionContext'
import { useZhouYear } from '../state/ZhouYearContext'

/** 點勢力色塊後，按所選年份顯示人口、軍事、經濟、政治與本年大事。 */
export function ZhouFactionCard() {
  const { year } = useZhouYear()
  const { selectedFaction, selectFaction } = useZhouSelection()

  const events = useMemo(() => {
    if (!selectedFaction) return []
    return ZHOU_TIMELINE.filter(
      (event) => event.year === year && event.factions.includes(selectedFaction),
    )
  }, [selectedFaction, year])

  const view = useMemo(() => {
    if (!selectedFaction) return null
    const notes: YearNote[] = events.map((event) => ({
      title: event.title,
      desc: event.desc,
      source: event.source,
    }))
    return composeFactionYear(ZHOU_SITUATION[selectedFaction], year, notes)
  }, [events, selectedFaction, year])

  if (!selectedFaction || !view) return null

  const name = zhouFactionName(selectedFaction)

  return (
    <div className="zhou-faction-card">
      <FactionSituationPanel
        name={name}
        yearLabel={`${formatZhouYear(year)} 年`}
        color={zhouFactionColor(selectedFaction)}
        view={view}
        onClose={() => selectFaction(null)}
      />
      <section className="zhou-faction-card__events" aria-label="本年大事">
        <h4>本年大事</h4>
        {events.length === 0 ? (
          <p>本年紀傳沒有專條把這股勢力寫成主角。人口、軍事、經濟、政治沿用該勢力的常制，不是這一年的新帳。</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                <span>{event.desc}</span>
                <cite>{event.source}</cite>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
