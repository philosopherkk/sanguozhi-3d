import { TRACED_DOMAINS } from '../sengoku/data/tracedDomains'
import type { DeepDiveDomain } from './deepDiveTypes'

/** 借用戰國底圖區塊。標名依時代改，不是元龜大名。 */
const PLACE: Record<string, string> = {
  d0: '會津',
  d1: '甲斐・駿河',
  d2: '攝津',
  d3: '薩摩',
  d4: '陸奧北',
  d5: '陸奧南',
  d6: '山陽西',
  d7: '關東',
  d8: '豐後',
  d9: '近江',
  d10: '三河',
  d11: '越後',
  d12: '出雲',
  d13: '土佐',
  d14: '尾張',
  d15: '出羽',
  d16: '越前',
  d17: '肥前',
  d18: '奧羽',
  d19: '信濃',
  d20: '常陸',
  d21: '丹波・播磨',
  d22: '肥前西',
  d23: '讚岐・伊予',
  d24: '肥後',
  d25: '紀伊',
  d26: '安房',
  d27: '大隅',
}

export const JP_DOMAINS: DeepDiveDomain[] = TRACED_DOMAINS.map((d) => ({
  id: d.id,
  name: PLACE[d.id] ?? d.id,
  ring: d.ring,
  extraRings: d.extraRings,
}))

export const D = {
  west: ['d6', 'd12'],
  kinai: ['d21', 'd2', 'd25', 'd9'],
  yamato: ['d25', 'd2', 'd9'],
  tokai: ['d14', 'd10', 'd1'],
  kanto: ['d7', 'd20', 'd26'],
  shinano: ['d19'],
  echigo: ['d11', 'd16'],
  shikoku: ['d23', 'd13'],
  kyushu: ['d3', 'd8', 'd17', 'd22', 'd24', 'd27'],
  ou: ['d0', 'd4', 'd5', 'd15', 'd18'],
} as const

export function paintDomains(
  groups: [readonly string[], string][],
  fallback?: string,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (fallback) {
    for (const d of JP_DOMAINS) out[d.id] = fallback
  }
  for (const [ids, faction] of groups) {
    for (const id of ids) out[id] = faction
  }
  return out
}

export function resolveKeyYear(year: number, keyYears: number[]): number {
  let best = keyYears[0]
  for (const y of keyYears) {
    if (y <= year) best = y
    else break
  }
  return best
}

export function factionCounts(
  control: Record<string, string>,
): { faction: string; n: number }[] {
  const counts = new Map<string, number>()
  for (const f of Object.values(control)) {
    counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([faction, n]) => ({ faction, n }))
    .sort((a, b) => b.n - a.n)
}
