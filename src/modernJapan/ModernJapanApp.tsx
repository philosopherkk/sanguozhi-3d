import { DeepDiveApp } from '../japanEras/DeepDiveApp'
import { MODERN_JAPAN_PACK } from '../japanEras/packs/modernJapanPack'

/** 明治至當代：以亞洲—太平洋戰區矢量底圖呈現版圖變化、入侵路線與事件脈絡。 */
export function ModernJapanApp() {
  return <DeepDiveApp pack={MODERN_JAPAN_PACK} />
}
