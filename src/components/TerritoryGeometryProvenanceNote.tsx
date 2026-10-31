import type { TerritoryGeometryProvenance } from '../data/territory/provenance'
import { APPROX_LEGEND_ZH } from '../data/territory/provenance'

/** 將 CB-12 幾何出處濃縮為地圖圖例／註腳用書面語（zh-Hant）。 */
export function formatGeometryProvenance(
  provenance: TerritoryGeometryProvenance,
): string {
  const parts = [APPROX_LEGEND_ZH, provenance.source]
  if (provenance.note) parts.push(provenance.note)
  return parts.join(' ')
}

export function TerritoryGeometryProvenanceNote({
  provenance,
  className = 'territory-provenance-note',
}: {
  provenance: TerritoryGeometryProvenance
  className?: string
}) {
  return (
    <p className={className}>
      {formatGeometryProvenance(provenance)}
    </p>
  )
}
