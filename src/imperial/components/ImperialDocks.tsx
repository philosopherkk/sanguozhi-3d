import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { FactionSituationPanel } from '../../components/FactionSituationPanel'
import { MapRouteLegend } from '../../components/map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR } from '../../components/map/RouteOverlay'
import { controlToExtensions, extensionAreaStats } from '../../lib/eraShapes'
import { withLandlessFactions } from '../../lib/factionRows'
import type { FactionYearView } from '../../lib/factionYearView'
import { imperialFactionColor, imperialFactionName } from '../lib/factionColor'
import {
  activeExtensions,
  resolveImperialLeaders,
} from '../lib/resolveSnapshot'
import { useImperialSelection } from '../state/ImperialSelectionContext'
import { useImperialYear } from '../state/ImperialYearContext'
import { usePersistedOpenResponsive } from '../../lib/usePersistedOpen'

function useDockDrag() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  )
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current
    if (!start) return
    setOffset({
      x: start.ox + event.clientX - start.x,
      y: start.oy + event.clientY - start.y,
    })
  }
  const onPointerUp = () => {
    drag.current = null
  }
  return { offset, onPointerDown, onPointerMove, onPointerUp }
}

function Dock({
  side,
  title,
  storageKey,
  defaultOpenDesktop,
  defaultOpenMobile,
  children,
}: {
  side: 'left' | 'right'
  title: string
  /** 收合與否記入 localStorage；各時代分開記，互不覆蓋。 */
  storageKey: string
  /** 桌面與窄螢幕的初始值；使用者開關過一次之後即以他的選擇為準。 */
  defaultOpenDesktop: boolean
  defaultOpenMobile: boolean
  children: ReactNode
}) {
  const [open, setOpen] = usePersistedOpenResponsive(storageKey, {
    desktop: defaultOpenDesktop,
    mobile: defaultOpenMobile,
  })
  const { offset, onPointerDown, onPointerMove, onPointerUp } = useDockDrag()
  return (
    <aside
      className={`zhou-dock zhou-dock--${side}${open ? '' : ' is-collapsed'}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <header
        className="zhou-dock__bar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <strong>{title}</strong>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '收起' : '展開'}
        </button>
      </header>
      {open ? <div className="zhou-dock__body">{children}</div> : null}
    </aside>
  )
}

export function ImperialRouteDock() {
  const { pack, year } = useImperialYear()
  return (
    <Dock
      side="left"
      title="行軍路線"
      storageKey="imperial-dock-routes"
      defaultOpenDesktop={false}
      defaultOpenMobile={false}
    >
      <MapRouteLegend
        routes={pack.routes}
        year={year}
        visibleYears={MARCH_ROUTE_SAME_YEAR}
      />
      <p className="route-legend__foot">
        只顯示該年的行軍，不向後延伸。拖標題可移動。
      </p>
    </Dock>
  )
}

export function ImperialTerritoryDock() {
  const { pack, year, territoryYear, snapshot } = useImperialYear()
  const { selectedFaction, selectFaction } = useImperialSelection()
  const leaders = resolveImperialLeaders(pack, year)

  // 勢力範圍面板是超集：登記了存續年份（activeFrom／activeTo）的勢力，
  // 若是年在任而該快照無一區，補「無區」行，不使地圖上無色塊即等於抹掉。
  // 未登記存續年份的勢力不補（無從判斷存續），其餘九包面板照舊。
  const rows = useMemo(() => {
    const held = extensionAreaStats([
      ...activeExtensions(pack, snapshot, year),
      ...controlToExtensions(snapshot.control),
    ]).map((row) => ({
      faction: row.faction,
      n: row.pieceCount,
      percent: row.percent,
    }))
    const bounded = pack.factions
      .filter((f) => f.activeFrom != null || f.activeTo != null)
      .map((f) => ({
        id: f.id,
        activeFrom: f.activeFrom ?? Number.NEGATIVE_INFINITY,
        activeTo: f.activeTo ?? Number.POSITIVE_INFINITY,
      }))
    const landless = withLandlessFactions(
      held.map(({ faction, n }) => ({ faction, n })),
      bounded,
      year,
    ).filter(({ faction }) => !held.some((r) => r.faction === faction))
    return landless.length
      ? [
          ...held,
          ...landless.map(({ faction }) => ({
            faction,
            n: 0,
            percent: 0,
          })),
        ]
      : held
  }, [snapshot, pack, year])

  const view: FactionYearView | null = useMemo(() => {
    if (!selectedFaction) return null
    const profile = pack.profiles[selectedFaction]
    const notes = pack.events.filter(
      (e) => e.year === year && e.factions.includes(selectedFaction),
    )
    const noteSources = notes.map((n) => n.source).join('；')
    const source =
      profile?.source != null
        ? profile.source
        : noteSources.length > 0
          ? noteSources
          : '地圖圖例'
    const disputed = profile?.disputed
    const base = (text: string) => ({ text, source, disputed })
    if (!profile) {
      return {
        eraIntro: {
          text: `${pack.title}（${pack.tag}）。這是該時代的勢力，不是東漢三國的州郡。`,
          source,
          disputed: true,
        },
        population: base('本年沒有登錄人口專條。'),
        military: base('本年沒有登錄戰力專條。'),
        grain: base('本年沒有登錄糧食專條。'),
        politics:
          notes.length > 0
            ? {
                text: notes.map((n) => `${n.title}：${n.desc}`).join(' '),
                source: notes.map((n) => n.source).join('；'),
              }
            : base('本年沒有登錄政治專條。'),
        economy: base('本年沒有登錄經濟專條。'),
      }
    }
    return {
      eraIntro: {
        text:
          (profile.eraIntro ??
            `${pack.title}（${pack.tag}）。這是該時代的勢力，著色用的是這個時代的示意範圍，不是東漢三國的州界。`) +
          (profile.note ? `有疑之處：${profile.note}` : ''),
        source: profile.source,
        disputed: true,
      },
      population: base(profile.population),
      military: base(profile.military),
      grain: base(profile.economy.includes('斛') || profile.economy.includes('租')
        ? profile.economy
        : `糧餉與財政：${profile.economy}`),
      politics:
        notes.length > 0
          ? {
              text: `${notes.map((n) => `${n.title}：${n.desc}`).join(' ')}（常制：${profile.politics}）`,
              source: [...notes.map((n) => n.source), profile.source].join('；'),
            }
          : base(profile.politics),
      economy: base(profile.economy),
    }
  }, [selectedFaction, pack, year])

  return (
    <Dock
      side="right"
      title="勢力範圍"
      storageKey="imperial-dock-territory"
      defaultOpenDesktop={true}
      defaultOpenMobile={false}
    >
      <div className="power-board">
        <p className="power-board__title">
          勢力疆域（{territoryYear} 快照）· 點選看人口、戰力、經濟
        </p>
        {selectedFaction && view ? (
          <FactionSituationPanel
            name={imperialFactionName(pack, selectedFaction)}
            yearLabel={`${year} 年`}
            color={imperialFactionColor(pack, selectedFaction)}
            view={view}
            onClose={() => selectFaction(null)}
          />
        ) : null}
        <p className="power-board__sub">
          百分比按本時代的示意塊面積，不是東漢州格，也不是縣界。
        </p>
        <ul className="power-board__list">
          {rows.map(({ faction, n, percent }) => {
            const active = selectedFaction === faction
            const lead = leaders.find((l) => l.faction === faction)
            return (
              <li key={faction}>
                <button
                  type="button"
                  className={
                    active
                      ? 'power-board__row power-board__row--btn is-active'
                      : 'power-board__row power-board__row--btn'
                  }
                  aria-pressed={active}
                  onClick={() => selectFaction(active ? null : faction)}
                >
                  <i
                    style={{
                      background: imperialFactionColor(pack, faction),
                    }}
                  />
                  <span>
                    {imperialFactionName(pack, faction)}
                    {lead ? (
                      <small className="era-dock-leader">
                        {' '}
                        · {lead.name}（{lead.role}）
                      </small>
                    ) : null}
                  </span>
                  <em>
                    {percent > 0
                      ? `${percent.toFixed(0)}% · ${n} 塊`
                      : n === 0
                        ? '無區'
                        : `${n} 塊`}
                  </em>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Dock>
  )
}
