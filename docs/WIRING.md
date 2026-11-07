# 掛載稽核（wiring）

路由裡會出現的 app：AsukaApp、AzuchiApp、BakumatsuApp、EdoJapan、HeianApp、ImperialApp、JapanHistoryApp、JinApp、KamakuraApp、KofunApp、LiaoSongApp、MinguoApp、ModernJapan、MuromachiApp、NanbeiApp、NaraApp、PrcApp、QinHanApp、SanguozhiApp、SengokuApp、SuiApp、TangApp、WudaiApp、YuanMingQingApp、ZhouApp

掃描的 app 殼層：16 個；公認未掛路由：0 個

## fail

- **app-no-chengyu** · `src/bakumatsu/BakumatsuApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-unrouted** · `src/chinaHistory/ChinaHistoryApp.tsx` — ChinaHistoryApp 匯出了但從 router 到不了它；掛在它下面的任何面板都不會出現。要嘛掛路由，要嘛刪掉，要嘛在 UNROUTED_APPS 寫理由。
- **app-no-chengyu** · `src/heian/HeianApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-no-chengyu** · `src/imperial/ImperialApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-no-chengyu** · `src/japanEras/DeepDiveApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-no-chengyu** · `src/qinhan/QinHanApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-no-chengyu** · `src/sengoku/SengokuApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）
- **app-no-chengyu** · `src/zhou/ZhouApp.tsx` — AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）

## warn

_（無）_

---

稽核腳本：`scripts/audit-wiring.ts`。成語面板曾因掛在未掛路由的 app 而全站看不見，
這份稽核就是為了讓那種形狀的 bug 無法通過 CI。
