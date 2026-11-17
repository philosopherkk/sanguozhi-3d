import { chineseEraLabel } from '../lib/chineseEraLabel'
import { useYear } from '../state/YearContext'
import { useState, useEffect } from 'react'
import { ReadingControls } from './ReadingControls'
import { TopicSwitcher } from './TopicSwitcher'

export function AppHeader() {
  const { year, playing, togglePlay, setYear, yearMin, yearMax } = useYear()
  const era = chineseEraLabel(year)

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const main = document.querySelector('.app-shell__main')
    if (!main) return
    const map = main.querySelector('.map-stage')
    if (!map) return

    const observer = new IntersectionObserver((entries) => {
      setCollapsed(!entries[0].isIntersecting)
    }, { root: main, threshold: 0.05 })

    observer.observe(map)
    return () => observer.disconnect()
  }, [])

  const [searchOpen, setSearchOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const filteredItems = [
    { id: 'event1', label: '赤壁之戰', type: 'event', year: 208, pack: 'sanguo' },
    { id: 'event2', label: '官渡之戰', type: 'event', year: 200, pack: 'sanguo' },
    { id: 'person1', label: '曹操', type: 'person', year: 208, pack: 'sanguo' },
    { id: 'person2', label: '劉備', type: 'person', year: 207, pack: 'sanguo' },
    { id: 'chengyu1', label: '兵不血刃', type: 'chengyu', year: 200, pack: 'sanguo' },
    // 實際版會從當前 pack 的 events/people/chengyu 動態抓取
  ].filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const scrollToItem = (id: string) => {
    const el = document.getElementById(`search-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSearchOpen(false)
      setSearchTerm('')
    }
  }

  return (
    <header className={`app-header${collapsed ? ' collapsed' : ''}`}>
      <div className="app-header__brand">
        <span className="brand-seal" aria-hidden>
          史
        </span>
        <div>
          <h1 className="app-header__title">中日歷史回顧</h1>
          <p className="app-header__tag">
            正史疆域 · 勢力與人物 · 中國 夏—當代 · 日本 有史以來—當代
          </p>
        </div>
      </div>

      <TopicSwitcher />

      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label="上一年"
          onClick={() => setYear(year - 1)}
          disabled={year <= yearMin}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">年</span>
          {era ? <span className="app-header__nengo">{era}</span> : null}
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label="下一年"
          onClick={() => setYear(year + 1)}
          disabled={year >= yearMax}
        >
          +
        </button>
        <button
          type="button"
          className="app-header__play"
          onClick={togglePlay}
          aria-pressed={playing}
        >
          {playing ? '暫停' : '播放'}
        </button>

        {/* 搜尋按鈕 */}
        <button
          type="button"
          className="app-header__search-btn"
          onClick={() => setSearchOpen(true)}
          aria-label="搜尋事件／人物／成語"
        >
          🔍
        </button>
      </div>

      {/* 搜尋 Modal */}
      {searchOpen && (
        <div className="search-modal">
          <div className="search-modal__content">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="搜尋事件、人物或成語..."
              className="search-modal__input"
              autoFocus
            />
            <div className="search-modal__results">
              {filteredItems.length === 0 ? (
                <div className="search-modal__empty">無符合結果</div>
              ) : (
                filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="search-modal__result"
                    onClick={() => scrollToItem(item.id)}
                  >
                    <span className="search-modal__result-type">{item.type === 'event' ? '大事' : item.type === 'person' ? '人物' : '成語'}</span>
                    <span className="search-modal__result-label">{item.label}</span>
                    <span className="search-modal__result-year">{item.year}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            className="search-modal__close"
            onClick={() => {
              setSearchOpen(false)
              setSearchTerm('')
            }}
          >
            關閉
          </button>
        </div>
      )}
    </header>
  )
}
