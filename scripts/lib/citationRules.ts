/**
 * 引用規則（可測）——從 citation-triage / fix-bare-chapters 抽出來。
 *
 * 為什麼抽出來：今天這支工具在試印階段暴露了**三條我自己寫錯的規則**，
 * 只因為我逐行看輸出才發現。抽成純函數就能用測試釘住，
 * 下一輪不會再把同一個規則寫錯第四次。
 *
 * 三條被釘住的錯誤（對應下方測試）：
 * 1. 補主書時把「書名＋卷部」當前綴 → 造出《晉書·武帝紀·食貨志》
 * 2. 結尾是「書」的**書名**被當成篇名 → 差點造出《舊唐書·則天皇后紀·新唐書》
 * 3. 注裡另引的書（裴注引《雲別傳》）被當成本書篇章 → 會造出《三國志·雲別傳》
 */
import { SOURCE_COVERAGE } from '../sourceCoverage.ts'

const CITE_LINE = /^\s*(source|outcomeSource|causeSource|courseSource|readingsSource|classicSource|mapSource|eventSource)\s*:/
const TITLE = /《([^》]+)》/g
const BARE_SUFFIX = /^(.{2,10}?)(傳|紀|世家|載記|志|表|書|記|論|賦|序)$/
// 明顯是獨立著作，不是篇名
const STANDALONE = /^(尚書|論語|孟子|荀子|韓非子|莊子|墨子|詩經|國語|戰國策|史記|漢書|後漢書|唐書|舊唐書|新唐書|隋書|周禮|禮記|易經|春秋|左傳|通鑑|資治通鑑|水經注|夢溪筆談|太平御覽|冊府元龜|永樂大典|四庫全書|說文解字|爾雅|齊民要術|天工開物|農政全書|武經總要|徐霞客遊記|洛陽伽藍記|世說新語|顏氏家訓|史通|舊五代史|新五代史|宋史|遼史|金史|元史|明史|清史稿|吾妻鏡|平家物語|信長公記|太閤記|日本書紀|古事記|源氏物語|徒然草|續日本紀|日本後紀|續日本後紀|日本三代實錄|日本紀略|山槐記|梅松論|増鏡|愚管抄|太平記|花営三代記|花營三代記|高麗史|明太祖實錄|明太宗實錄|明實錄|清實錄)$/

/** 三國模組裡《魏書·…》是《三國志·魏書》的簡稱，不是北魏《魏書》。 */
export function resolveSource(source: string, file: string): string {
  if (file.includes('/data/timelineDetails') && /^《(魏書|蜀書|吳書)[·》]/.test(source)) return '《三國志》'
  return source
}

export interface LineAnalysis {
  /** 建議補成的全稱 */
  applied: { bare: string; to: string }[]
  /** 跳過的原因（不猜） */
  skipped: { bare: string; why: string }[]
  isCitationLine: boolean
}

/**
 * 分析一行引用欄：裸篇名要補哪個主書，或為什麼不能補。
 * 保守是重點：**判不了就跳過**，補一個錯的主書比留空更糟。
 */
export function analyzeCitationLine(line: string): LineAnalysis {
  const out: LineAnalysis = { applied: [], skipped: [], isCitationLine: CITE_LINE.test(line) }
  if (!out.isCitationLine) return out
  const titles = [...line.matchAll(TITLE)].map((m) => m[1])
  const qualified = titles.filter((t) => t.includes('·'))
  if (!qualified.length) return out
  const books = new Set(qualified.map((t) => t.split('·')[0]))
  const isBare = (t: string) => !t.includes('·') && BARE_SUFFIX.test(t) && !STANDALONE.test(t) && !SOURCE_COVERAGE[`《${t}》`]
  if (books.size > 1) {
    for (const t of titles) if (isBare(t)) out.skipped.push({ bare: `《${t}》`, why: `同字串有 ${books.size} 種主書，無法判斷` })
    return out
  }
  // 只補「書名」第一段。卷部不能沿用兄弟條目：《晉書·武帝紀》旁邊的《食貨志》
  // 屬於晉書，但它的卷部不是武帝紀。
  const book = [...books][0]
  for (const t of titles) {
    if (!isBare(t)) {
      if (!t.includes('·') && BARE_SUFFIX.test(t)) out.skipped.push({ bare: `《${t}》`, why: '本身是著作（在年代表或独立名單中），不是篇名' })
      continue
    }
    const idx = line.indexOf(`《${t}》`)
    // 「裴注引《雲別傳》」是注裡另引的書，不是本書篇章
    if (idx > 0 && /注引|裴注|原引|轉引|引$/.test(line.slice(Math.max(0, idx - 8), idx))) {
      out.skipped.push({ bare: `《${t}》`, why: '前面是「注引／引」，屬注裡另引之書' })
      continue
    }
    // 作者已經標明出處的，不要用「同一字串的另一個全稱」去覆蓋它。
    // 例：『露梁海戰另見《李舜臣傳》（朝鮮方史料）』——括號已說明它是朝鮮方史料，
    // 補成《明史·李舜臣傳》直接與原註矛盾（李舜臣傳在《高麗史》，不在《明史》）。
    const after = line.slice(idx + t.length + 2, idx + t.length + 2 + 16)
    if (/^（[^）]{1,14}）/.test(after)) {
      out.skipped.push({ bare: `《${t}》`, why: `緊接的括號已標明出處（${after.match(/^（[^）]{1,14}）/)?.[0]}），不覆蓋既有標註` })
      continue
    }
    out.applied.push({ bare: `《${t}》`, to: `《${book}·${t}》` })
  }
  return out
}
