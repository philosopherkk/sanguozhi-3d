import { useEffect, useState } from 'react'
import {
  FACTION_ARTICLES,
  grokipediaPageUrl,
} from '../data/factionArticles'
import { PERSON_PROFILES, personSummary } from '../data/personProfiles'
import { factionColor, factionName } from '../lib/factionColors'
import {
  loadFactionInlineArticle,
  loadPersonInlineArticle,
  type InlineArticle,
} from '../lib/fetchArticle'
import { usePersistedOpen } from '../lib/usePersistedOpen'
import { useSelection } from '../state/SelectionContext'

export function ArticlePanel() {
  const { article, closeArticle } = useSelection()
  const [data, setData] = useState<InlineArticle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bodyOpen, setBodyOpen] = usePersistedOpen('article-body', false)

  useEffect(() => {
    if (!article) {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        if (article.kind === 'faction') {
          const ref = FACTION_ARTICLES[article.faction]
          const loaded = await loadFactionInlineArticle({
            grokipediaSlug: ref?.grokipediaSlug ?? 'Three_Kingdoms',
            zhwikiTitle: ref?.zhwikiTitle ?? '三國',
            fallbackTitle: ref?.title ?? factionName(article.faction),
            fallbackBlurb: ref?.blurb ?? factionName(article.faction),
          })
          if (!cancelled) setData(loaded)
        } else {
          const p = article.person
          const loaded = await loadPersonInlineArticle({
            name: p.name,
            grokipediaUrl: p.grokipedia_url,
            zhwikiUrl: p.zhwiki_url,
            localNote: p.note ?? `${p.name}${p.字 ? `（字${p.字}）` : ''}。出典：${p.source}`,
          })
          if (!cancelled) setData(loaded)
        }
      } catch {
        if (!cancelled) setError('載入介紹失敗。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [article])

  if (!article) return null

  const heading =
    article.kind === 'faction'
      ? factionName(article.faction)
      : article.person.name
  const accent =
    article.kind === 'faction'
      ? factionColor(article.faction)
      : 'var(--accent)'

  const grokUrl =
    article.kind === 'faction'
      ? grokipediaPageUrl(
          FACTION_ARTICLES[article.faction]?.grokipediaSlug ?? 'Three_Kingdoms',
        )
      : article.person.grokipedia_url
  const wikiUrl =
    article.kind === 'faction'
      ? `https://zh.wikipedia.org/zh-tw/${encodeURIComponent(
          FACTION_ARTICLES[article.faction]?.zhwikiTitle ?? '三國',
        )}`
      : article.person.zhwiki_url

  return (
    <section className="article-panel" aria-label="百科介紹" aria-live="polite">
      <header className="article-panel__head">
        <h2 className="article-panel__title" style={{ borderColor: accent }}>
          {heading}
        </h2>
        <div className="article-panel__actions">
          <button
            type="button"
            className="article-panel__collapse"
            aria-expanded={bodyOpen}
            onClick={() => setBodyOpen((value) => !value)}
          >
            {bodyOpen ? '收起內文' : '展開內文'}
          </button>
          <button type="button" className="article-panel__close" onClick={closeArticle}>
            關閉
          </button>
        </div>
      </header>

      {bodyOpen ? (
        <>
          {loading ? <p className="article-panel__status">載入介紹中…</p> : null}
          {error ? (
            <p className="article-panel__status article-panel__status--err">{error}</p>
          ) : null}

          {article.kind === 'person' ? (
            <div className="article-panel__body article-panel__body--local">
              <p className="article-panel__source">本站正史提要</p>
              <p>{personSummary(article.person.id, article.person.source)}</p>
              {(() => {
                const prof = PERSON_PROFILES[article.person.id]
                if (!prof?.source) return null
                return <p className="person-source">出典：{prof.source}</p>
              })()}
            </div>
          ) : null}

          {article.kind === 'faction' ? (
            <div className="article-panel__body article-panel__body--local">
              <p>{FACTION_ARTICLES[article.faction]?.blurb}</p>
              {FACTION_ARTICLES[article.faction]?.source ? (
                <p className="person-source">
                  出典：{FACTION_ARTICLES[article.faction]?.source}
                </p>
              ) : null}
              {FACTION_ARTICLES[article.faction]?.disputed ? (
                <p className="person-note">
                  存疑
                  {FACTION_ARTICLES[article.faction]?.note
                    ? `：${FACTION_ARTICLES[article.faction]?.note}`
                    : ''}
                </p>
              ) : null}
            </div>
          ) : null}

          {data && !loading ? (
            <>
              <p className="article-panel__source">{data.sourceLabel}</p>
              <div className="article-panel__body">
                <p>{data.extract}</p>
              </div>
              {data.note ? <p className="article-panel__note">{data.note}</p> : null}
            </>
          ) : null}

          <div className="article-panel__links">
            {grokUrl ? (
              <a href={grokUrl} target="_blank" rel="noreferrer">
                開啟 Grok 百科
              </a>
            ) : null}
            <a href={wikiUrl} target="_blank" rel="noreferrer">
              開啟維基百科
            </a>
          </div>
        </>
      ) : (
        <p className="article-panel__status">內文已收合 · 按「展開內文」閱讀</p>
      )}
    </section>
  )
}
