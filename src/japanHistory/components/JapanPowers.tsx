import { useState } from 'react'
import { useJapanYear } from '../state/JapanYearContext'

interface LaterPower {
  id: string
  name: string
  color: string
  from: number
  to: number
  eraIntro: string
  source: string
}

const POWERS: LaterPower[] = [
  {
    id: 'bakufu',
    name: '德川幕府',
    color: '#1E3A8A',
    from: 1603,
    to: 1867,
    eraIntro:
      '江戶幕府由家康在1603年開府，1615年大坂之陣以後進入幕藩體制。幕末從1853年黑船起，將軍仍在江戶，但條約已經不是將軍一個人能簽。1867年大政奉還，1868年政權實際結束。家康本人在1616年去世，不能把他寫進幕末的戰場。',
    source: '日本近世史通說',
  },
  {
    id: 'matsumae',
    name: '松前氏',
    color: '#2a4a5a',
    from: 1604,
    to: 1868,
    eraIntro:
      '1604年家康以黑印把蝦夷地交易交給松前慶廣，範圍在渡島南部。此後松前藩一直是這個交易藩，不是統治整個北海道的政府。1869年明治政府設開拓使，才把蝦夷地改稱北海道。通俗說的「家康征服北海道」超過了黑印狀的記載。',
    source: '日本近世史通說',
  },
  {
    id: 'satsuma-ryukyu',
    name: '薩摩與琉球',
    color: '#B85C38',
    from: 1609,
    to: 1878,
    eraIntro:
      '1609年島津家久奉幕府許可出兵琉球。琉球國王仍在，同時向薩摩與清朝朝貢。家康許可這次出兵，沒有率軍進入沖繩。這個雙重地位維持到1879年琉球處分。在那之前，琉球不是薩摩的一郡，也不是幕府直領。',
    source: '日本近世史通說',
  },
  {
    id: 'meiji',
    name: '明治政府',
    color: '#4a5a8a',
    from: 1868,
    to: 1911,
    eraIntro:
      '1868年以後的新政府結束幕府。1869年設開拓使，把蝦夷地改成北海道的行政。1879年廢琉球藩，設沖繩縣。這兩步都是明治政府做的，不是家康的征服。幕末的戊辰戰爭細節在「幕末」那一節。',
    source: '日本近代史通說',
  },
  {
    id: 'showa',
    name: '昭和日本',
    color: '#3a4a5a',
    from: 1926,
    to: 1946,
    eraIntro:
      '昭和前期的日本是近代帝國，不是幕藩。1931年以後對中國用兵，1941年太平洋戰爭，1945年接受投降。這個時代的勢力是國家，不是德川氏或薩摩藩。沖繩在戰後由美國管理，要到1972年才歸還施政權。',
    source: '日本現代史通說',
  },
  {
    id: 'now',
    name: '當代日本',
    color: '#5a4a6a',
    from: 1947,
    to: 2026,
    eraIntro:
      '1947年憲法以後是國民主權的國家，不再有征夷大將軍，也沒有藩。1972年沖繩施政權歸還。本頁只作時間定位，不把當代的行政區畫成江戶時代的藩領。',
    source: '日本現代史通說',
  },
]

export function JapanPowers() {
  const { year } = useJapanYear()
  const [openId, setOpenId] = useState<string | null>(null)
  const list = POWERS.filter((p) => year >= p.from && year <= p.to)
  const open = list.find((p) => p.id === openId) ?? null

  return (
    <section className="panel panel--dock" aria-labelledby="jp-powers">
      <header className="panel-header">
        <h2 id="jp-powers">勢力</h2>
        <p className="panel-sub">點名稱看該時代簡介 · {year} 年</p>
      </header>
      <ul className="power-board__list">
        {list.map((p) => {
          const active = open?.id === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                className={
                  active
                    ? 'power-board__row power-board__row--btn is-active'
                    : 'power-board__row power-board__row--btn'
                }
                aria-pressed={active}
                onClick={() => setOpenId(active ? null : p.id)}
              >
                <i style={{ background: p.color }} />
                <span>
                  {p.name}
                  <small className="era-dock-leader">
                    {' '}
                    · {p.from}–{p.to}
                  </small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {open ? (
        <article className="faction-situation" aria-label={`${open.name} 時代簡介`}>
          <header className="faction-situation__head">
            <span className="faction-situation__swatch" style={{ background: open.color }} />
            <h3>
              {open.name}
              <small>時代簡介</small>
            </h3>
            <button type="button" onClick={() => setOpenId(null)}>
              關閉
            </button>
          </header>
          <section className="faction-situation__block">
            <h4>時代簡介</h4>
            <p>{open.eraIntro}</p>
            <cite>{open.source}</cite>
          </section>
        </article>
      ) : null}
    </section>
  )
}
