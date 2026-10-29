import { TOPIC_META, useTopic } from '../state/TopicContext'

export function TopicSwitcher() {
  const { topic, setTopic } = useTopic()

  return (
    <nav className="topic-switch" aria-label="專題切換">
      {TOPIC_META.map((t) => {
        const active = topic === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
            title={t.range}
            onClick={() => setTopic(t.id)}
          >
            <span className="topic-switch__label">{t.label}</span>
            <span className="topic-switch__range">{t.range}</span>
          </button>
        )
      })}
    </nav>
  )
}
