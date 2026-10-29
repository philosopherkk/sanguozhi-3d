import type { MarchRoute } from '../../data/marchRoutes'
import type { FactionRange } from '../../geo/eraCover'
import { routesForMonth } from '../../lib/monthZoom'
import type { ZhouFactionId } from '../types'
import { rangesFromHold } from './territoryControl'

/**
 * 戰國尾逐段。不是前284至前221的每一個月。
 * 長平「九月」見《史記·白起王翦列傳》。
 * 其餘月份史書多只記年，標月只為把先後排開，disputed。
 * 色塊用本時代的環，不用三國州界。
 */

export const LATE_FROM = -284
export const LATE_TO = -221

export interface LateStage {
  id: string
  year: number
  month: number
  label: string
  routeId: string | null
  source: string
  monthDisputed: boolean
  note: string
  ranges: FactionRange[]
}

const MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

export function formatZhouMonth(month: number): string {
  return `${MONTHS[month - 1] ?? String(month)}月`
}

type Hold = Partial<Record<string, ZhouFactionId>>

function paint(base: Hold, next: Hold): Hold {
  return { ...base, ...next }
}

/** 前284年樂毅入齊之前：巴蜀、漢中已入秦，郢仍在楚，齊仍在山東。 */
const beforeYueYi: Hold = {
  ln: '燕',
  yan_early: '燕',
  zhao_handan: '趙',
  shanxi_n: '趙',
  qi_west: '田齊',
  qi_east: '田齊',
  wei_daliang: '魏',
  wei_hedong: '魏',
  han_state: '韓',
  zhou_luoyi: '周',
  qin_guanzhong: '秦',
  hanzhong: '秦',
  sichuan: '秦',
  hubei: '楚',
  hunan: '楚',
  wu_delta: '楚',
  yue_zhe: '楚',
}

interface Draft {
  id: string
  year: number
  month: number
  label: string
  routeId: string | null
  source: string
  monthDisputed: boolean
  note: string
  patch: Hold
}

const DRAFTS: Draft[] = [
  {
    id: 'yueyi',
    year: -284,
    month: 4,
    label: '樂毅入齊',
    routeId: 'yueyi',
    source: '《史記·樂毅列傳》；《資治通鑑》卷四',
    monthDisputed: true,
    note: '下齊七十餘城。莒、即墨畫在半島東端，不跟著臨淄改色。史無月份，四月只標次序。',
    patch: { qi_west: '燕' },
  },
  {
    id: 'tiandan',
    year: -279,
    month: 8,
    label: '田單復齊',
    routeId: 'tiandan',
    source: '《史記·田單列傳》',
    monthDisputed: true,
    note: '齊復國，臨淄一帶改回田齊。史無月份，八月只標在樂毅之後、拔郢之前。',
    patch: { qi_west: '田齊' },
  },
  {
    id: 'baying',
    year: -278,
    month: 10,
    label: '白起拔郢',
    routeId: 'baying',
    source: '《史記·白起王翦列傳》《楚世家》',
    monthDisputed: true,
    note: '郢入秦，楚留在湖南與江東。江漢這塊改秦，不是整片揚州。史無月份。',
    patch: { hubei: '秦' },
  },
  {
    id: 'yanyu',
    year: -269,
    month: 6,
    label: '閼與',
    routeId: 'yanyu',
    source: '《史記·廉頗藺相如列傳》',
    monthDisputed: true,
    note: '趙奢解閼與。上黨仍在趙韓之間，色塊不改。史無月份。',
    patch: {},
  },
  {
    id: 'changping',
    year: -260,
    month: 9,
    label: '長平',
    routeId: 'changping',
    source: '《史記·白起王翦列傳》「至九月」；《資治通鑑》卷五',
    monthDisputed: false,
    note: '九月趙軍食絕。邯鄲未下，趙的色塊仍在。九月見列傳。',
    patch: {},
  },
  {
    id: 'handan',
    year: -257,
    month: 12,
    label: '邯鄲解圍',
    routeId: 'handan-relief',
    source: '《史記·魏公子列傳》《平原君虞卿列傳》',
    monthDisputed: true,
    note: '魏、楚救趙，秦解去。邯鄲仍趙。史無月份，十二月只標圍解之年的末段。',
    patch: {},
  },
  {
    id: 'xizhou',
    year: -256,
    month: 8,
    label: '西周亡',
    routeId: null,
    source: '《史記·周本紀》',
    monthDisputed: true,
    note: '西周君獻地。洛邑仍先標周，要到東周亡才改秦。史無月份。',
    patch: {},
  },
  {
    id: 'dongzhou',
    year: -249,
    month: 1,
    label: '東周亡',
    routeId: 'dongzhou',
    source: '《史記·周本紀》；《資治通鑑》卷五',
    monthDisputed: true,
    note: '莊襄王元年呂不韋滅東周。洛邑改秦，不是整片河南。元年近歲首，仍非紀傳明載之月。',
    patch: { zhou_luoyi: '秦' },
  },
  {
    id: 'qin-han',
    year: -230,
    month: 3,
    label: '滅韓',
    routeId: 'qin-han',
    source: '《史記·秦始皇本紀》十七年',
    monthDisputed: true,
    note: '內史騰得韓王安，韓地入秦。本紀無月。',
    patch: { han_state: '秦' },
  },
  {
    id: 'qin-zhao',
    year: -228,
    month: 10,
    label: '入邯鄲',
    routeId: 'qin-zhao',
    source: '《史記·秦始皇本紀》十九年；《王翦列傳》',
    monthDisputed: true,
    note: '秦得趙王遷。公子嘉自立為代王，所以晉北仍標趙，邯鄲改秦。本紀無月。',
    patch: { zhao_handan: '秦' },
  },
  {
    id: 'qin-yan',
    year: -226,
    month: 10,
    label: '拔燕薊',
    routeId: 'qin-yan',
    source: '《史記·秦始皇本紀》二十一年',
    monthDisputed: true,
    note: '取薊城，燕王喜走遼東。薊改秦，遼東仍燕。本紀無月。',
    patch: { yan_early: '秦' },
  },
  {
    id: 'qin-wei',
    year: -225,
    month: 6,
    label: '灌大梁',
    routeId: 'qin-wei',
    source: '《史記·秦始皇本紀》二十二年',
    monthDisputed: true,
    note: '王賁引河溝灌大梁，魏王降。大梁與河東改秦。本紀無月。',
    patch: { wei_daliang: '秦', wei_hedong: '秦' },
  },
  {
    id: 'qin-chu',
    year: -223,
    month: 11,
    label: '滅楚',
    routeId: 'qin-chu',
    source: '《史記·秦始皇本紀》二十三至二十四年；《王翦列傳》',
    monthDisputed: true,
    note: '王翦破楚。湖南與江東改秦。本紀無月。嶺南仍不畫。',
    patch: { hunan: '秦', wu_delta: '秦', yue_zhe: '秦' },
  },
  {
    id: 'qin-liaodong',
    year: -222,
    month: 3,
    label: '收遼東',
    routeId: 'qin-liaodong',
    source: '《史記·秦始皇本紀》二十五年',
    monthDisputed: true,
    note: '王賁攻遼東，得燕王喜。遼東改秦。代仍在。本紀只說此年先燕後代，三月只標先後。',
    patch: { ln: '秦' },
  },
  {
    id: 'qin-dai',
    year: -222,
    month: 9,
    label: '收代',
    routeId: 'qin-dai',
    source: '《史記·秦始皇本紀》二十五年「還攻代」',
    monthDisputed: true,
    note: '虜代王嘉。晉北改秦。九月只標在遼東之後，本紀無月。',
    patch: { shanxi_n: '秦' },
  },
  {
    id: 'qin-qi',
    year: -221,
    month: 10,
    label: '滅齊',
    routeId: 'qin-qi',
    source: '《史記·秦始皇本紀》二十六年',
    monthDisputed: true,
    note: '王賁自燕南攻齊，得齊王建。山東改秦。河西與嶺南不著色。本紀無月。',
    patch: { qi_west: '秦', qi_east: '秦' },
  },
]

function buildStages(): LateStage[] {
  let current: Hold = { ...beforeYueYi }
  return DRAFTS.map((draft) => {
    current = paint(current, draft.patch)
    return {
      id: draft.id,
      year: draft.year,
      month: draft.month,
      label: draft.label,
      routeId: draft.routeId,
      source: draft.source,
      monthDisputed: draft.monthDisputed,
      note: draft.note,
      ranges: rangesFromHold(current),
    }
  })
}

export const LATE_STAGES: LateStage[] = buildStages()

export function lateStageIndex(year: number, month: number | null): number {
  if (month != null) {
    const exact = LATE_STAGES.findIndex(
      (stage) => stage.year === year && stage.month === month,
    )
    if (exact >= 0) return exact
  }
  let index = 0
  LATE_STAGES.forEach((stage, i) => {
    if (stage.year < year || (stage.year === year && month == null)) index = i
  })
  return index
}

export function lateStageAt(year: number, month: number | null): LateStage | null {
  if (year < LATE_FROM || year > LATE_TO) return null
  return LATE_STAGES[lateStageIndex(year, month)] ?? null
}

export function firstStageInYear(year: number): LateStage | undefined {
  return LATE_STAGES.find((stage) => stage.year === year)
}

export function shiftLateStage(
  year: number,
  month: number | null,
  dir: -1 | 1,
): { year: number; month: number } | null {
  const index = lateStageIndex(year, month)
  const next = LATE_STAGES[index + dir]
  if (!next) return null
  if (dir < 0 && year === LATE_STAGES[0].year && month === LATE_STAGES[0].month) {
    return null
  }
  return { year: next.year, month: next.month }
}

export function zhouRoutesForView(
  routes: MarchRoute[],
  year: number,
  month: number | null,
): MarchRoute[] {
  return routesForMonth(routes, year, month)
}
