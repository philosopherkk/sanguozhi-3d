#!/usr/bin/env python3
"""行軍線端點斷言：把「這條線的起訖點應該落在某個今地名」變成可執行檢查。

audit:map 只判海陸（點落在陸上還是海上），判不出「一條畫得整整齊齊、其實整條偏了
三十公里」的線。本腳本補的就是這一段：

  · 日本戰區（sengoku／bakumatsu／heian／japanEras 各 pack）的 points 是畫布像素，
    先按日本戰區的等距圓柱投影反算回經緯度；
  · 亞洲戰區（modernJapanPack）直接寫經緯度，讀出來即用；
  · 再逐一與本檔 ASSERTS 裡的今地名座標比距離，超出容差即失敗。

今地名座標取現代都市與戰場之通行定位；容差依「該地名在圖上可分辨的程度」給：
市街與海灣口 12–20 km，廣域戰場（河川、山地）放 25–30 km。容差不是一律放寬——
白村江、弘安之役這類端點即宣稱本身，差六十公里就是畫錯。

用法：python3 scripts/check_route_landmarks.py
"""
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 日本戰區畫布與投影邊界一律從現行資料檔讀，不在這裡另抄常數（同 audit_map_accuracy.mjs 口徑）。
_regions = (ROOT / "src" / "sengoku" / "data" / "regions.ts").read_text(encoding="utf-8")
_borders = (ROOT / "scripts" / "tighten_land_borders.py").read_text(encoding="utf-8")
JP_W = int(re.search(r"SENGOKU_MAP_W\s*=\s*(\d+)", _regions).group(1))
JP_H = int(re.search(r"SENGOKU_MAP_H\s*=\s*(\d+)", _regions).group(1))
JP_N, JP_S, JP_WEST, JP_E = map(
    float,
    re.search(
        r"JP_N,\s*JP_S,\s*JP_W,\s*JP_E\s*=\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)", _borders
    ).groups(),
)
if not all([JP_W, JP_H, JP_N, JP_S, JP_WEST, JP_E]):
    sys.exit("check_route_landmarks — 讀不到日本戰區畫布或投影邊界，拒絕執行")


def px_to_lonlat(x, y):
    return (JP_WEST + (x / JP_W) * (JP_E - JP_WEST), JP_N - (y / JP_H) * (JP_N - JP_S))


def dist_km(a, b):
    """兩點經緯度之大圓距離（km）。"""
    la1, lo1 = math.radians(a[1]), math.radians(a[0])
    la2, lo2 = math.radians(b[1]), math.radians(b[0])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(min(1.0, math.sqrt(h)))


PIXEL_FILES = [
    "src/sengoku/data/marchRoutes.ts",
    "src/bakumatsu/data/marchRoutes.ts",
    "src/heian/data/marchRoutes.ts",
    "src/japanEras/packs/kofunPack.ts",
    "src/japanEras/packs/asukaPack.ts",
    "src/japanEras/packs/naraPack.ts",
    "src/japanEras/packs/kamakuraPack.ts",
    "src/japanEras/packs/muromachiPack.ts",
    "src/japanEras/packs/edoPack.ts",
    "src/japanEras/packs/azuchiPack.ts",
]
LONLAT_FILES = ["src/japanEras/packs/modernJapanPack.ts"]

routes = {}  # id -> {name, year, sea, pts:[(lon,lat)]}


def add(rid, name, year, sea, pts):
    routes[rid] = {"name": name, "year": year, "sea": sea, "pts": pts}


for rel in PIXEL_FILES:
    text = (ROOT / rel).read_text(encoding="utf-8")
    for m in re.finditer(r"\{[^{}]*?points\s*:\s*\[[^\]]*\][^{}]*?\}", text, re.S):
        body = m.group(0)
        rid = re.search(r"\bid:\s*'([^']+)'", body)
        pts = re.findall(r"\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]", body)
        if not rid or len(pts) < 2:
            continue
        add(
            rid.group(1),
            (re.search(r"\bname:\s*'([^']*)'", body) or [None, ""])[1],
            (re.search(r"\byear:\s*(\d+)", body) or [None, ""])[1],
            bool(re.search(r"kind:\s*'sea'", body)),
            [px_to_lonlat(float(x), float(y)) for x, y in pts],
        )

for rel in LONLAT_FILES:
    text = (ROOT / rel).read_text(encoding="utf-8")
    for m in re.finditer(r"\broute\(\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*(\d+),", text):
        open_i = text.index("(", m.start())
        depth, close = 0, -1
        for i in range(open_i, len(text)):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
                if depth == 0:
                    close = i
                    break
        call = text[open_i : close + 1] if close > open_i else ""
        arr = call.rfind("[[")
        pts = re.findall(r"\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]", call[arr:]) if arr >= 0 else []
        if len(pts) >= 2:
            add(m.group(1), m.group(2), m.group(3), False, [tuple(map(float, p)) for p in pts])
# (路線 id, 端點, 宣稱之地名, 今地名經緯度, 容差 km, 依據)
ASSERTS = [
    # 元寇・白村江・朝鮮出兵——排程指定之入侵／反擊路線，優先核
    ("kam-bunnei", "start", "合浦—巨濟外海（元麗聯軍出航方向）", (128.30, 34.60), 40,
     "《高麗史》〈忠烈王世家〉忠烈王三十八年條：東路軍自慶尚道沿海出航，經巨濟北上。合浦故地有異說（今慶尚南道南海郡或巨濟島），故容差放寬至四十公里以容異說；但釜山浦一帶距此約九十公里，不在可容範圍"),
    ("kam-bunnei", "end", "博多灣口海面", (130.33, 33.68), 20,
     "《八幡愚童訓》（軍記文學）與《元史》〈日本傳〉：上陸戰鬥在博多灣岸，終點取灣口海面不入陸"),
    ("kam-koan", "start", "合浦—巨濟外海（東路軍出航方向）", (128.30, 34.60), 40,
     "《元史》〈日本傳〉至元十八年：東路軍自慶尚沿海出航，後與江南軍合於平戶一帶；口徑同「文永之役」一條"),
    ("kam-koan", "end", "平戶—鷹島海域", (129.66, 33.33), 20,
     "《元史》〈日本傳〉；鷹島海底遺跡在今平戶市鷹島町一帶（129.55—129.72E,33.28—33.37N）"),
    ("asuka-hakusukinoe", "end", "白村江口（今錦江河口）", (126.70, 36.00), 25,
     "《日本書紀》天智二年條；《舊唐書》。白村江即今錦江，泗沘即今扶余，海口在群山—扶余一帶"),
    ("korea", "end", "名護屋（肥前北岸）", (130.03, 33.50), 15,
     "《言経卿記》；文祿之役名護屋築城・出港地在今唐津市名城"),
    ("korea-sea", "end", "釜山浦", (129.04, 35.07), 15,
     "『朝鮮王朝實錄』宣祖實錄二十五年條：倭軍以釜山浦為上陸口"),
    ("korea-1597", "start", "博多灣口海面", (130.33, 33.68), 20,
     "本條名稱「博多→對馬→釜山浦」；博多＝今福岡市博多區，本線起於其灣口海面"),
    ("korea-1597", "end", "釜山浦外海", (129.04, 35.07), 15,
     "『朝鮮王朝實錄』宣祖實錄三十年條：慶長之役再自釜山浦上陸"),
    ("korea-1597-land", "end", "蔚山", (129.31, 35.55), 15,
     "《明史·朝鮮傳》；蔚山之戰（1597年12月）在今蔚山中區一帶"),
    # 日本本土會戰：起點＝出兵地，終點＝戰場
    ("kawagoe", "start", "小田原", (139.15, 35.25), 15, "北條氏本城在今神奈川縣小田原市"),
    ("kawagoe", "end", "川越", (139.48, 35.93), 12, "河越城在今埼玉縣川越市"),
    ("itsukushima", "end", "嚴島", (132.31, 34.30), 12, "嚴島（安藝野里）在今廣島縣廿日市市"),
    ("okinawajima", "start", "駿府（今川氏本據）", (138.38, 34.98), 15, "今川氏館在今靜岡市駿府"),
    ("okinawajima", "end", "桶狹間", (137.03, 35.05), 12, "桶狹間口在今愛知縣日進市·愛西市界"),
    ("kawanakajima", "start", "甲府（武田氏本據）", (138.57, 35.66), 15, "躑躅崎館在今甲府市"),
    ("kawanakajima", "end", "川中島", (138.17, 36.65), 15, "川中島在今長野市長野市北"),
    ("anegawa", "start", "岐阜", (136.76, 35.40), 12, "織田自岐阜出兵"),
    ("anegawa", "end", "姉川", (136.30, 35.38), 12, "姉川之戰在今滋賀縣長濱市—米原市間"),
    ("mikatagahara", "end", "三方原", (137.70, 34.79), 12, "三方原台地在今濱松市北"),
    ("nagashino", "end", "長篠（設樂原）", (137.51, 34.92), 12, "設樂原在今愛知縣新城市"),
    ("sekigahara", "start", "江戶", (139.75, 35.68), 12, "德川軍自江戶西上"),
    ("sekigahara", "end", "關原", (136.47, 35.38), 12, "關原在今岐阜縣關原町"),
    ("osaka-march", "end", "大坂", (135.52, 34.68), 12, "大坂城在今大阪市中央區"),
    ("ishibashi", "start", "伊豆（三島一帶）", (138.91, 35.00), 25,
     "《吾妻鏡》治承四年條：賴朝起兵於伊豆，石橋山在今伊豆之國市"),
    ("fuji", "start", "富士川", (138.62, 35.13), 20, "富士川之戰在今山梨縣—靜岡縣間富士川下游"),
    ("ichinotani", "end", "一之谷", (135.17, 34.64), 15, "一之谷在今神戶市須磨—兵庫區海岸"),
    ("yashima", "end", "屋島", (134.11, 34.40), 15, "屋島在今香川縣高松市東"),
    ("dannoura-sea", "end", "壇之浦", (130.96, 33.95), 12, "壇之浦在今下關市赤間關海峽"),
    ("toba-satcho", "end", "鳥羽·伏見", (135.77, 34.95), 12, "鳥羽伏見之戰在今京都市南—伏見區"),
    ("hakodate-sea", "end", "五稜郭（箱館）", (140.71, 41.79), 15, "五稜郭在今北海道函館市"),
    ("perry-1853", "end", "浦賀", (139.72, 35.22), 12, "培理艦隊停泊之浦賀在今橫須賀市"),
    # 飛鳥—奈良（本輪核出之節點偏移）
    ("asuka-isshi", "end", "難波（長樂宮）", (135.49, 34.70), 15, "《日本書紀》：乙巳之變後孝德天皇都難波長樂宮"),
    ("asuka-jinshin", "start", "吉野", (135.90, 34.43), 20, "《日本書紀》：大海人皇子自吉野起兵"),
    ("asuka-jinshin", "end", "飛鳥", (135.82, 34.46), 15, "《日本書紀》：大海人皇子還自飛鳥御田原宮"),
    ("nara-heijo", "start", "藤原京", (135.80, 34.55), 15, "《續日本紀》景龍四年條：自藤原京（今奈良縣明日香村）遷平城京"),
    ("nara-heijo", "end", "平城京", (135.80, 34.69), 15, "平城宮遺跡在今奈良市二條大路"),
    # 亞洲戰區（經緯度直寫）：入侵／反擊與主要海戰
    ("mj-1894-corea", "end", "義州（今新義州）", (124.40, 40.02), 20,
     "陸軍參謀本部『明治二十七八年日清戰史』：平壤陷落後第5師団進抵鴨綠江"),
    ("mj-1894-navy", "end", "大東溝外海", (124.12, 39.78), 15,
     "英國海軍學會會刊（1895年7月號）所錄戰報：北洋艦隊碇泊地北緯39°47′／東經124°07′"),
    ("mj-1895-weihaiwei", "end", "威海衛", (122.10, 37.50), 15,
     "『明治二十七八年日清戰史』：1895年2月2日占威海衛"),
    ("mj-1904-liadong", "end", "旅順", (121.27, 38.90), 15, "『明治三十七八年戰史』：第3軍攻旅順要塞"),
    ("mj-1914-qingdao", "end", "青島", (120.38, 36.07), 15, "日英同盟側攻佔德屬青島"),
    ("mj-1937-north", "end", "太原", (112.55, 37.87), 15, "『戰史叢書』北支方面：1937年11月占太原"),
    ("mj-1937-shanghai-nanjing", "end", "南京", (118.80, 32.06), 15, "『戰史叢書』中支方面：12月13日入南京"),
    ("mj-1942-midway", "end", "中途島", (182.63, 28.21), 20,
     "『戰史叢書』ミッドウェー海戰；中途島＝西經177°22′，跨日期變更線作東經182°38′"),
    ("mj-1944-leyte-gulf", "start", "布良灣一帶（ブリンダウン錨地方向）", (125.60, 12.50), 40,
     "『戰史叢書』レイテ海戰：志摩艦隊等之出擊錨地，在今菲律賓薩馬爾島東岸（125.68E,12.52N）"),
    ("mj-1945-okinawa", "end", "讀谷·沖繩本島西方海面", (127.70, 26.40), 20, "『戰史叢書』沖縄方面：1945年4月1日上陸"),
    ("mj-1945-yamato", "end", "坊ノ岬沖（大和沈沒位置）", (128.07, 30.72), 15,
     "防衛研究所『戰史叢書』海軍篇；沈沒位置北緯30°43′／東經128°04′"),
    # 本輪第二批修正（吉野、畿內起點）
    ("muro-go-daigo", "end", "吉野", (135.90, 34.43), 20,
     "『太平記』『增鏡』（皆軍記文學）：建武政權崩潰，後醍醐天皇入吉野；吉野宮今奈良縣吉野郡吉野町"),
    ("kofun-kinki-expand", "start", "奈良盆地（纏向遺跡一帶）", (135.83, 34.55), 20,
     "纏向遺跡在今奈良縣櫻井市；四世紀大和政權之中心地帶，非山城國"),
    ("kofun-kinki-west", "start", "奈良盆地（纏向遺跡一帶）", (135.83, 34.55), 20, "同上"),
]

# ---------------------------------------------------------------- 執行
missing = [a for a in ASSERTS if a[0] not in routes]
for rid, *_ in missing:
    print(f"FAIL {rid}: 找不到該路線（斷言表與掃描範圍對不上，不接受默默跳過）")
if missing:
    sys.exit(f"check_route_landmarks — 斷言表有 {len(missing)} 條路線找不到，拒絕執行")

bad = 0
for rid, which, place, want, tol, basis in ASSERTS:
    r = routes[rid]
    pt = r["pts"][0] if which == "start" else r["pts"][-1]
    d = dist_km(pt, want)
    ok = d <= tol
    bad += 0 if ok else 1
    print(
        f"{'OK  ' if ok else 'FAIL'} {rid}{'（海）' if r['sea'] else ''} {which}＝{place}（{r['year']}）: "
        f"實測 {pt[0]:.2f}E,{pt[1]:.2f}N｜宣稱 {want[0]:.2f}E,{want[1]:.2f}N｜差 {d:.1f} km（容差 {tol} km）"
    )

print(f"check_route_landmarks — {len(ASSERTS)} 條端點斷言（在冊路線 {len(routes)} 條），失敗 {bad} 條")
sys.exit(1 if bad else 0)

