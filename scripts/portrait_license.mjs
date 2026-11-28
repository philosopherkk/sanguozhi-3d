/**
 * 頭像授權的判定口徑（唯一一份）。
 *
 * 2026-11-28 使用者裁定：除 Public domain／CC0 之外，亦准 CC BY／CC BY-SA，
 * 但必須署名（作者＋來源網址）並在站上列出來。NC（非商業）與 ND（禁止改作）
 * 一律不准——本站的頭像是依原圖改畫的衍生作，ND 圖法律上不能改，
 * NC 圖用於帶廣告的站臺亦有風險，兩者都不值得為省一張圖去賭。
 *
 * 為什麼另立一檔：閘門（audit-portraits.mjs）、清單產生器（portrait_credits.mjs）
 * 同盤點工具（portrait_pd_inventory.py）都要判同一件事。JS 兩支共用本檔；
 * Python 那支只能抄一份，故另有 `python3 scripts/portrait_pd_inventory.py --classify '<授權>'`
 * 的逐字對照，由 `node scripts/portrait_credits.mjs --selftest` 驗兩邊口徑有冇分岔。
 */

const PD_LIKE = /^(public domain|pd[-\w.]*|cc0|cc-pd|public-domain)$/i
/** 自己畫的（依參考照片改畫）：不欠第三方署名，但仍要寫明，免得日後被當「查無授權」。 */
const OWN_WORK = /^(內部生成|本專案生成)$/
/** CC BY 與 CC BY-SA，可帶版本號；NC／ND 會被擋掉（`by` 之後只准 `sa` 或版本號）。 */
const BY_OK = /^cc[- ]by([- ]sa)?([-. ][0-9.]+)?$/i

const ALLOWED_TEXT =
  '只准 Public domain／PD-*／CC0／CC BY／CC BY-SA／內部生成；NC 非商業、ND 禁止改作一律不准'

/**
 * @returns {{ok: boolean, requiresAttribution: boolean, why?: string}}
 */
export function licenseCheck(license) {
  const l = String(license ?? '').trim()
  if (!l) return { ok: false, requiresAttribution: false, why: '缺少 license 欄位' }
  if (PD_LIKE.test(l) || OWN_WORK.test(l)) return { ok: true, requiresAttribution: false }
  if (BY_OK.test(l)) return { ok: true, requiresAttribution: true }
  return {
    ok: false,
    requiresAttribution: false,
    why: `授權「${l}」不在白名單（${ALLOWED_TEXT}）`,
  }
}

/**
 * 圖上可見的署名：站內唯一會顯示給讀者的欄位是 `basis`（圖鑑與頭像的
 * hover 提示「想像圖 · 考據：…」）。BY 系列因此要把作者與授權寫進 `basis`，
 * 唔准只寫喺 `attribution` 而讀者完全睇唔到。合格回 null，否則回問題字串。
 */
export function basisCreditIssue(row) {
  const author = String(row.attribution ?? '')
    .split('／')[0]
    .trim()
  const basis = String(row.basis ?? '')
  if (!author || author === '佚名') {
    return 'BY 系列的 basis 要寫得出作者'
  }
  if (!basis.includes(author)) {
    return `basis 未寫作者「${author}」（只寫喺 attribution 裡＝讀者睇唔到）`
  }
  if (!/CC\s?BY(-SA)?/i.test(basis)) {
    return 'basis 未寫授權名稱（例：CC BY-SA 4.0）'
  }
  return null
}

/**
 * 署名要同時看得到作者與可點的來源頁。
 * 只有授權名、只有一串 URL、或「佚名」兩字加網址，都不算合規。
 */
export function attributionOk(value) {
  const s = String(value ?? '').trim()
  if (s.length < 12) return false
  if (!/https?:\/\/\S+/.test(s)) return false
  return s.replace(/https?:\/\/\S+/g, '').trim().length >= 2
}

