import { HISTORICAL_BASEMAPS } from '../../data/historicalBasemaps'
import { CHINA_ERA_BANDS } from '../data/eras'
import { formatChinaYear } from '../lib/formatYear'
import { useChinaYear } from '../state/ChinaYearContext'

const BASEMAP = HISTORICAL_BASEMAPS[0]

/** Schematic era ribbon — not a geographic province map. */
export function ChinaEraMap() {
  const { year } = useChinaYear()
  const active = CHINA_ERA_BANDS.find((b) => year >= b.from && year <= b.to)

  return (
    <section className="map-stage era-map" aria-label="時代示意">
      <div className="map-stage__canvas era-map__canvas">
        <img
          className="era-map__photo"
          src={BASEMAP.src}
          alt=""
          draggable={false}
        />
        <div className="era-map__hero">
          <p className="era-map__kicker">時代綱要</p>
          <h2 className="era-map__title">{active?.label ?? '—'}</h2>
          <p className="era-map__year">{formatChinaYear(year)} 年</p>
          <p className="era-map__note">
            底圖是現代東亞地勢，各時代共用，不是該朝疆域。郡國色塊只在春秋戰國與三國。
          </p>
        </div>

        <ol className="era-map__bands" aria-label="時代色帶">
          {CHINA_ERA_BANDS.map((b) => {
            const on = year >= b.from && year <= b.to
            return (
              <li
                key={b.id}
                className={on ? 'era-map__band is-active' : 'era-map__band'}
                style={{
                  ['--band-color' as string]: b.color,
                  flexGrow: Math.max(1, Math.round((b.to - b.from) / 120)),
                }}
              >
                <span className="era-map__band-label">{b.label}</span>
                <span className="era-map__band-range">
                  {formatChinaYear(b.from)}–{formatChinaYear(b.to)}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="era-map__credit">
          底圖：
          <a href={BASEMAP.commonsUrl} target="_blank" rel="noreferrer">
            {BASEMAP.credit}
          </a>
          （{BASEMAP.license}）
        </p>
      </div>
    </section>
  )
}
