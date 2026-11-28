/**
 * 簡易版「時光機」外殼：三屏（選國家 → 選時代 → 時光機）。
 *
 * 舊時代 App（`children`）原封不動放在時光機的地圖插槽內：年份橋要寫它的
 * 滑桿，地圖也直接沿用。舊頁頭、時代列、滑桿、底欄只由 `kid.css` 作視覺
 * 隱藏並在此設 `inert`（不能 `display:none`：滑桿要留在 DOM 給年份橋寫）。
 * 有故事資料的時代另把舊側欄藏起，由故事卡與人物格取代；未接上的時代
 * （`data-kid-legacy`）保留舊側欄，由 `kid.css` 套大字皮。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useTopic } from '../state/TopicContext'
import { Breadcrumb } from './Breadcrumb'
import { EraRiver } from './EraRiver'
import { FirstVisit } from './FirstVisit'
import { KidHome } from './KidHome'
import { KidSettings } from './KidSettings'
import { KidTabs } from './KidTabs'
import { NavCorner } from './NavCorner'
import { PeopleGrid } from './PeopleGrid'
import { StoryCard } from './StoryCard'
import { TimeDock } from './TimeDock'
import type { KidScreen, KidTab } from './types'
import { applyUiMode } from './uiMode'
import { hasKidStories } from './useKidStories'
import './kid.css'

/** 視覺隱藏且不可操作的舊介面（與 `kid.css` 的 chrome-hidden 規則同一份清單）。 */
const HIDDEN_CHROME = [
  '.app-header',
  '.era-bar',
  '.year-scrubber',
  '.bottom-bar',
  '.map-layer-bar',
]

const STEP: Record<KidScreen, 1 | 2 | 3> = { home: 1, era: 2, machine: 3 }

function useInertChrome() {
  useEffect(() => {
    const mark = () => {
      for (const el of document.querySelectorAll(HIDDEN_CHROME.join(','))) {
        if (!el.hasAttribute('inert')) el.setAttribute('inert', '')
      }
    }
    mark()
    const obs = new MutationObserver(mark)
    obs.observe(document.body, { childList: true, subtree: true })
    return () => {
      obs.disconnect()
      for (const el of document.querySelectorAll(HIDDEN_CHROME.join(','))) {
        el.removeAttribute('inert')
      }
    }
  }, [])
}

export function KidShell({ children }: { children: ReactNode }) {
  const { activeEra } = useTopic()
  const [screen, setScreen] = useState<KidScreen>('home')
  const [tab, setTab] = useState<KidTab>('story')
  const [picked, setPicked] = useState(false)
  const stories = hasKidStories(activeEra)

  useEffect(() => {
    applyUiMode('kid')
    return () => applyUiMode('classic')
  }, [])
  useInertChrome()

  const go = (next: KidScreen) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }
  const back = () => go(screen === 'machine' ? 'era' : 'home')

  return (
    <div
      className="kid-shell"
      data-kid-screen={screen}
      data-kid-tab={tab}
      data-kid-map-full={screen === 'machine' && tab === 'map' ? '' : undefined}
      data-kid-legacy={stories ? undefined : ''}
    >
      <header className="kid-top">
        <NavCorner
          showBack={screen !== 'home'}
          onHome={() => go('home')}
          onBack={back}
        />
        <Breadcrumb step={STEP[screen]} />
        <KidSettings />
      </header>

      {screen === 'home' ? (
        <>
          <FirstVisit dismissed={picked} />
          <KidHome
            onPick={() => {
              setPicked(true)
              go('era')
            }}
          />
        </>
      ) : null}

      {screen === 'era' ? <EraRiver onPick={() => go('machine')} /> : null}

      {screen === 'machine' ? (
        <main className="kid-machine">
          <div className="kid-machine__map">{children}</div>
          <KidTabs value={tab} onChange={setTab} />
          <section className="kid-machine__panel">
            {stories && tab === 'story' ? <StoryCard /> : null}
            {stories && tab === 'people' ? <PeopleGrid /> : null}
          </section>
          <TimeDock />
        </main>
      ) : null}
    </div>
  )
}
