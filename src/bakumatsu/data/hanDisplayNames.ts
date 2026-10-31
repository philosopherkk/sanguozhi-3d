/**
 * CODH 藩 catalog 略稱（新字／簡化字）→ UI 繁體顯示。
 * 不改 hanId 或 mesh.name 來源欄位。
 */
export const HAN_DISPLAY_NAME_ZH: Record<string, string> = {
  H031: '會津',
  H050: '米澤',
  H053: '水戶',
  H251: '彥根',
  H341: '廣島',
  H349: '德島',
  H384: '對馬',
}

export function hanDisplayNameZh(hanId: string, catalogName: string): string {
  return HAN_DISPLAY_NAME_ZH[hanId] ?? catalogName
}
