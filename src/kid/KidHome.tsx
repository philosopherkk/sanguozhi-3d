/**
 * 第①屏：選國家（6 張大卡）。
 * 規格見 docs/plans/2026-11-28/ui.md「home」行
 * （驗收：node scripts/audit_kid_ui.mjs --require=home）。
 */
import { PersonPortrait } from '../components/PersonPortrait'
import { TOPIC_META, useTopic } from '../state/TopicContext'
import { S, TOPIC_FACE } from './strings'

export interface KidHomeProps {
  /** 選好國家之後呼叫，外殼轉去第②屏 */
  onPick: () => void
}

export function KidHome(props: KidHomeProps) {
  const { setTopic } = useTopic()
  return (
    <section className="kid-home">
      <h1 className="kid-title">{S.pickCountry}</h1>
      <div className="kid-home__grid">
        {TOPIC_META.map((t) => (
          <button
            key={t.id}
            type="button"
            data-kid="topic"
            data-topic={t.id}
            onClick={() => {
              setTopic(t.id)
              props.onPick()
            }}
          >
            <PersonPortrait size="lg" src={TOPIC_FACE[t.id]} name={t.label} />
            <span className="kid-home__name">{t.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
