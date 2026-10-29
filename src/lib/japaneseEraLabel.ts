/**
 * Japanese nengō labels for the Sengoku window (approx.).
 * UI hint only; exact day-level transitions omitted.
 */

interface NengoSpan {
  from: number
  to: number
  label: string
}

const SPANS: NengoSpan[] = [
  { from: 1467, to: 1468, label: '應仁' },
  { from: 1469, to: 1486, label: '文明' },
  { from: 1487, to: 1488, label: '長享' },
  { from: 1489, to: 1491, label: '延德' },
  { from: 1492, to: 1500, label: '明應' },
  { from: 1501, to: 1520, label: '文龜／永正' },
  { from: 1521, to: 1527, label: '大永' },
  { from: 1528, to: 1531, label: '享祿' },
  { from: 1532, to: 1554, label: '天文' },
  { from: 1555, to: 1557, label: '弘治' },
  { from: 1558, to: 1569, label: '永祿' },
  { from: 1570, to: 1572, label: '元龜' },
  { from: 1573, to: 1591, label: '天正' },
  { from: 1592, to: 1595, label: '文祿' },
  { from: 1596, to: 1614, label: '慶長' },
  { from: 1615, to: 1615, label: '元和' },
]

export function japaneseEraLabel(year: number): string | null {
  const span = SPANS.find((s) => year >= s.from && year <= s.to)
  if (!span) return null
  if (year === 1560) return '永祿三年'
  if (year === 1573) return '天正元年'
  if (year === 1582) return '天正十年'
  if (year === 1600) return '慶長五年'
  if (year === 1603) return '慶長八年'
  if (year === 1615) return '元和元年'
  return span.label
}
