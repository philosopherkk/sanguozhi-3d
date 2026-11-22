/**
 * 窄屏由整份文件捲動（html 不再 overflow:hidden），桌面與平板仍由主區自己捲。
 * 各處要捲動頁面時先問這裡，避免寫死哪一個容器。
 */
export function usesDocumentScroll(): boolean {
  return getComputedStyle(document.documentElement).overflowY !== 'hidden'
}
