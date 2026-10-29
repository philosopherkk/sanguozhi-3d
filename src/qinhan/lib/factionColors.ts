import type { QinHanFactionId } from '../types'

const COLORS: Record<QinHanFactionId, string> = {
  秦: '#c45c6a',
  漢: '#a63d3d',
  西楚: '#2f6f4e',
  張楚: '#d4a017',
  齊: '#4f86c6',
  趙: '#6a8cbf',
  燕: '#9a8ec4',
  魏: '#e09a2b',
  新: '#6b5b4a',
  吳楚: '#5eaea3',
  黃巾: '#e0c35a',
}

const NAMES: Record<QinHanFactionId, string> = {
  秦: '秦',
  漢: '漢',
  西楚: '西楚',
  張楚: '張楚',
  齊: '齊',
  趙: '趙',
  燕: '燕',
  魏: '魏',
  新: '新',
  吳楚: '吳楚',
  黃巾: '黃巾',
}

export const QINHAN_FACTION_ORDER: QinHanFactionId[] = [
  '秦',
  '漢',
  '西楚',
  '張楚',
  '齊',
  '趙',
  '燕',
  '魏',
  '新',
  '吳楚',
  '黃巾',
]

export function qinHanFactionColor(id: string): string {
  return COLORS[id as QinHanFactionId] ?? '#8a8478'
}

export function qinHanFactionName(id: string): string {
  return NAMES[id as QinHanFactionId] ?? id
}
