import type { ZhouFactionId } from '../types'

const COLORS: Record<ZhouFactionId, string> = {
  夏: '#c4b49a',
  商: '#a67c52',
  周: '#e6d3a3',
  齊: '#7ea0c4',
  晉: '#c4784a',
  秦: '#c45c6a',
  楚: '#e08a3c',
  吳: '#5eaea3',
  越: '#6aaa6a',
  燕: '#9a8ec4',
  趙: '#6a8cbf',
  魏: '#e09a2b',
  韓: '#8a9a6a',
  田齊: '#4f86c6',
}

const NAMES: Record<ZhouFactionId, string> = {
  夏: '夏',
  商: '商',
  周: '周',
  齊: '齊',
  晉: '晉',
  秦: '秦',
  楚: '楚',
  吳: '吳',
  越: '越',
  燕: '燕',
  趙: '趙',
  魏: '魏',
  韓: '韓',
  田齊: '田齊',
}

export const ZHOU_FACTION_ORDER: ZhouFactionId[] = [
  '夏',
  '商',
  '周',
  '齊',
  '晉',
  '秦',
  '楚',
  '吳',
  '越',
  '燕',
  '趙',
  '魏',
  '韓',
  '田齊',
]

export function zhouFactionColor(id: string): string {
  return COLORS[id as ZhouFactionId] ?? '#8a8478'
}

export function zhouFactionName(id: string): string {
  return NAMES[id as ZhouFactionId] ?? id
}
