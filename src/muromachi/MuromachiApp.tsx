import { DeepDiveApp } from '../japanEras/DeepDiveApp'
import { MUROMACHI_PACK } from '../japanEras/packs/muromachiPack'

/** 室町。用戶「失丁」按更正理解為此時代。 */
export function MuromachiApp() {
  return <DeepDiveApp pack={MUROMACHI_PACK} />
}
