import { useEffect, useState } from 'react'

const FONT_STEPS = [87.5, 100, 112.5, 125, 137.5] as const
const FONT_KEY = 'timeline-font-step'
const THEME_KEY = 'timeline-theme'

type Theme = 'dark' | 'light'

function readStep(): number {
  try {
    const raw = localStorage.getItem(FONT_KEY)
    const n = raw ? Number(raw) : 1
    if (Number.isInteger(n) && n >= 0 && n < FONT_STEPS.length) return n
  } catch {
    /* 讀唔到就用預設字級 */
  }
  return 1
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function apply(step: number, theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.fontSize = `${FONT_STEPS[step]}%`
}

/** 年份標籤左方：調字級，以及白底黑字／黑底白字。 */
export function ReadingControls() {
  const [step, setStep] = useState(readStep)
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    apply(step, theme)
    try {
      localStorage.setItem(FONT_KEY, String(step))
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* 寫唔入仍然保持畫面 */
    }
  }, [step, theme])

  return (
    <div className="reading-controls" aria-label="字級與主題">
      <button
        type="button"
        aria-label="縮小字"
        disabled={step <= 0}
        onClick={() => setStep((n) => Math.max(0, n - 1))}
      >
        小
      </button>
      <button
        type="button"
        aria-label="放大字"
        disabled={step >= FONT_STEPS.length - 1}
        onClick={() => setStep((n) => Math.min(FONT_STEPS.length - 1, n + 1))}
      >
        大
      </button>
      <button
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      >
        {theme === 'dark' ? '白底' : '黑底'}
      </button>
    </div>
  )
}
