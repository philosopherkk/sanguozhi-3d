import { DeepDiveApp } from '../japanEras/DeepDiveApp'
import { AZUCHI_PACK } from '../japanEras/packs/azuchiPack'

/** 安土桃山（織豐～大坂）。「失丁」已更正為室町專題。 */
export function AzuchiApp() {
  return <DeepDiveApp pack={AZUCHI_PACK} />
}
