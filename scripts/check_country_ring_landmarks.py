#!/usr/bin/env python3
"""四國領域名色塊之地標斷言：把「這塊範圍該包含某今地名、不該吞掉鄰國核心」變成可執行檢查。

`audit:map` 對四國色塊只查結構（頂點數、`poly()` 寫法、出海與否），判不出
「一個封閉、漂亮、其實向東多畫了一度的多邊形」。本腳本補這一段，對象是
`src/geo/asiaCountryDomains.ts` 的 16 個領域名：

  · 從來源檔解析每個 domain 的經緯度頂點（`poly([[lon, lat], …])`）；
  · 逐點作 radiating（奇偶）判斷：該在範圍內的今地名必須在內，
    該在範圍外的必須在外，並回報該點到邊界的最短距離供判讀；
  · 「該在外」一類刻意挑鄰國首府／核心城市：色塊若把它們塗進自己的勢力範圍，
    等於在地圖上宣稱主權，這比少畫一塊更糟。

座標取現代都市之通行定位（精度到分），判準不靠容差：投影是等圓柱線性變換，
「點在多邊形內」與像素空間同結果，故一律嚴判，邊緣太近的點（< 10 km）視為
不穩，改寫斷言而不是放寬判準。

用法：python3 scripts/check_country_ring_landmarks.py
      python3 scripts/check_country_ring_landmarks.py --unasserted   列出尚無斷言的領域名
      python3 scripts/check_country_ring_landmarks.py --only=ko_north[,…]  只驗那幾個 domain；尚無斷言即未通過（plan 驗收用）
      python3 scripts/check_country_ring_landmarks.py --px <lon> <lat>     經緯度轉畫布像素
      python3 scripts/check_country_ring_landmarks.py --teeth       注入三種破壞，確認斷言真的咬得住
"""
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOMAINS_TS = ROOT / "src" / "geo" / "asiaCountryDomains.ts"
BASE_TS = ROOT / "src" / "geo" / "asiaWarBase.ts"

# 畫布與投影邊界一律從現行來源檔讀，不在這裡另抄常數（同 check_route_landmarks.py 口徑）。
_base = BASE_TS.read_text(encoding="utf-8")


def _const(name):
    m = re.search(rf"{name}\s*=\s*(-?[\d.]+)", _base)
    if not m:
        sys.exit(f"check_country_ring_landmarks — 讀不到 {name}，拒絕執行")
    return float(m.group(1))


ASIA_W = _const("ASIA_WAR_W")
ASIA_H = _const("ASIA_WAR_H")
LON0 = _const("ASIA_LON0")
LON1 = _const("ASIA_LON1")
LAT0 = _const("ASIA_LAT0")
LAT1 = _const("ASIA_LAT1")

ARRAYS = {
    "korea": "KOREA_DOMAINS",
    "thailand": "THAILAND_DOMAINS",
    "vietnam": "VIETNAM_DOMAINS",
    "malaysia": "MALAYSIA_DOMAINS",
}


def asia_px(lon, lat):
    """與 asiaWarBase.ts 的 asiaPx 同式（經線 seam 折回，等圓柱）。"""
    lo = LON0 + ((((lon - LON0) % 360) + 360) % 360)
    return [
        (lo - LON0) / (LON1 - LON0) * ASIA_W,
        (LAT1 - lat) / (LAT1 - LAT0) * ASIA_H,
    ]


def _seg_point_km(p, a, b):
    """點到線段之最短地面距離（在局部切平面算，誤差對本用途可忽略）。"""
    kx = math.cos(math.radians(p[1])) * 111.32
    ax, ay = p[0] * kx, p[1] * 110.57
    bx, by = a[0] * kx, a[1] * 110.57
    cx, cy = b[0] * kx, b[1] * 110.57
    vx, vy = cx - bx, cy - by
    wx, wy = ax - bx, ay - by
    len2 = vx * vx + vy * vy
    t = 0.0 if len2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / len2))
    return math.hypot(ax - (bx + t * vx), ay - (by + t * vy))


def point_in_ring(lonlat, ring):
    """radiating 奇偶法；邊界點視為在內（頂點正好壓線之示意多邊形常見）。"""
    x, y = lonlat
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xint = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x <= xint + 1e-12:
                inside = not inside
    return inside


def edge_margin_km(lonlat, ring):
    return min(_seg_point_km(lonlat, ring[i], ring[(i + 1) % len(ring)]) for i in range(len(ring)))


def load_domains(path=DOMAINS_TS):
    """來源檔 → {domain_id: {country, name, ring}}。一個 object 一個 object 拆，
    再把 id／name／poly 個別抓出——整段一條正則的寫法會被欄位間之註解或空行弄到
    靜靜少一個 domain。少一個就中止，不要假裝驗過了。"""
    src = path.read_text(encoding="utf-8")
    out = {}
    for country, arr in ARRAYS.items():
        head = f"{arr}: DeepDiveDomain[] = ["
        if head not in src:
            sys.exit(f"check_country_ring_landmarks — 讀不到 {arr}，來源檔結構已變")
        i = src.index(head) + len(head)
        body = src[i : src.index("\n]", i)]
        objs = [m for m in re.finditer(r"\{\s*\n", body)]
        if len(objs) < 3:
            sys.exit(f"check_country_ring_landmarks — {arr} 拆不到領域名 object，來源檔結構已變")
        for idx, m in enumerate(objs):
            start = m.end()
            end = objs[idx + 1].start() if idx + 1 < len(objs) else len(body)
            chunk = body[start:end]
            if re.search(r"\bd:\s*'", chunk) or re.search(r"\b(extra)?[Rr]ings?\s*:", chunk):
                sys.exit(
                    f"check_country_ring_landmarks — {arr} 有 domain 用 poly() 以外之幾何形式，"
                    "本腳本尚不支援，請先擴充再放行"
                )
            mid = re.search(r"\bid:\s*'([^']+)'", chunk)
            mname = re.search(r"\bname:\s*'([^']*)'", chunk)
            mpoly = re.search(r"\bpoly\(\[(.*?)\]\s*\)", chunk, re.S)
            if not (mid and mname and mpoly):
                sys.exit(f"check_country_ring_landmarks — {arr} 第 {idx + 1} 個 object 解析不到 id／name／poly")
            did = mid.group(1)
            pts = [tuple(map(float, xy)) for xy in re.findall(r"\[([-\d.]+),\s*([-\d.]+)\]", mpoly.group(1))]
            if len(pts) < 3:
                sys.exit(f"check_country_ring_landmarks — {did} 頂點不足三個，多邊形不成立")
            if did in out:
                sys.exit(f"check_country_ring_landmarks — domain id 重複：{did}")
            out[did] = {"country": country, "name": mname.group(1), "ring": pts}
        if len([d for d in out.values() if d["country"] == country]) != len(objs):
            sys.exit(f"check_country_ring_landmarks — {arr} 有 {len(objs)} 個 object 但只解析出部分，拒絕繼續")
    return out


# ---------------------------------------------------------------- 斷言
# 條目：(domain_id, 判準 in/out, 今地名, (經, 緯), 依據[, 離界下限 km])
# 「in」＝該地名在所繪範圍之內；「out」＝必須在外（多為鄰國首府或另一領域名之核心）。
# 離界下限預設十公里：點離邊界太近，斷言會因一次無傷大雅的挪動而翻，寧可重挑地名。
# 只有天然狹窄之海峽、渡口才另註較小之下限，並在依據裡寫明為什麼只能這麼小。
# 依據欄寫明為什麼這個點能當判準；改範圍必須同時改依據，不能只挪多邊形。
LANDMARKS = [
    # 朝鮮半島：由遼東到洛東江，五塊必須互斥
    ("ko_liaodong", "in", "遼陽（漢遼東郡襄平）", (123.18, 41.27),
     "今遼寧省遼陽市，漢遼東郡治襄平、公孫燕都襄平皆在此一帶"),
    ("ko_liaodong", "out", "平壤（大同江口）", (125.75, 39.02),
     "長安城、平壤屬大同江流域，是「北部（平壤・大同江）」之核心，不得塗進遼東"),
    ("ko_north", "in", "平壤（大同江口）", (125.75, 39.02),
     "今平壤市，長安城、安鶴宮、大同江核心"),
    ("ko_north", "out", "漢城（今首爾）", (126.98, 37.57),
     "漢江流域，百濟漢城、高句麗北遷後之南朝，屬「中部（漢江流域）」"),
    ("ko_central", "in", "漢城（今首爾）", (126.98, 37.57),
     "今首爾特別市，漢江下游，百濟初期都城"),
    ("ko_central", "out", "慶州（新羅金城）", (129.21, 35.85),
     "洛東江以東，新羅王京，屬「東南（洛東江・慶尚）」"),
    ("ko_southwest", "in", "泗沘（今扶余）", (127.30, 36.29),
     "今忠清南道扶余郡，百濟末都泗沘，錦江流域"),
    ("ko_southwest", "in", "全州", (127.15, 35.82),
     "今全羅北道全州市，錦江以南之平原，百濟之壁州、後百濟甄萱據錦州之地"),
    ("ko_southwest", "out", "慶州（新羅金城）", (129.21, 35.85),
     "今慶尚北道慶州市，洛東江以東，屬「東南（洛東江・慶尚）」"),
    ("ko_southeast", "in", "慶州（新羅金城）", (129.21, 35.85),
     "今慶尚北道慶州市，新羅九百年王京"),
    ("ko_southeast", "in", "大邱（伽耶・達伐）", (128.59, 35.86),
     "今大邱廣域市，大伽耶（達伐國）之地"),
    ("ko_southeast", "out", "全州", (127.15, 35.82),
     "錦江下游平原，屬「西南（錦江・全羅）」"),
    # 鴨綠江渡口與海東邑：邊界類工作單（map.md 批次）之驗收點，座標取條目代表點
    ("ko_north", "in", "義州（今新義州・鴨綠江渡口）", (124.40, 40.10),
     "en.wiki 〈Sinŭiju〉124.40E,40.10N，與遼東安東（今丹東）隔江相對；高麗—遼東陸路渡口，屬北部"),
    ("ko_liaodong", "out", "義州（今新義州・鴨綠江渡口）", (124.40, 40.10),
     "義州在鴨綠江南岸、半島一側；現繪 ko_liaodong 南緣 39.9—40.0 之直線把渡口整塊吞入遼東"),
    ("ko_southeast", "in", "蔚山", (129.32, 35.55),
     "en.wiki 〈Ulsan〉129.32E,35.55N，洛東江以東之海東邑，壬辰之役蔚山倭城之戰地"),
    # 泰國：四塊各自的核心城市，並把馬來世界與高棉排除在外
    ("th_north", "in", "清邁（蘭納）", (98.99, 18.79),
     "今清邁府治，蘭納王國孟賴城所在"),
    ("th_north", "out", "素可泰", (99.70, 17.00),
     "昭披耶河上游平原，素可泰王國都城，屬「昭披耶平原」"),
    ("th_central", "in", "素可泰", (99.70, 17.00),
     "今素可泰府，素可泰王國都城Ramkaeng），在蘭納以南"),
    ("th_central", "in", "大城（阿瑜陀耶）", (100.56, 14.35),
     "今大城府，1351 年起阿瑜陀耶王國都城"),
    ("th_central", "in", "曼谷（昭披耶河口）", (100.50, 13.75),
     "今泰國首都，吞武里、扎克里王朝都城，河口感"),
    ("th_central", "out", "呵叻", (102.10, 15.00),
     "呵叻高原西緣，屬「東北高原（呵叻）」"),
    ("th_central", "out", "那空師里那（洛坤）", (99.96, 9.58),
     "馬來半島北段，洛坤王國之地，屬「泰南地峽」"),
    ("th_isan", "in", "孔敬", (102.83, 16.43),
     "今孔敬府治，呵叻高原中心城"),
    ("th_isan", "in", "武里南", (103.20, 15.00),
     "今武里南府治，高棉文化圈之高原城（石萬吳寺在其東）"),
    ("th_isan", "out", "大城（阿瑜陀耶）", (100.56, 14.35),
     "昭披耶河平原，屬「昭披耶平原」"),
    ("th_south", "in", "那空師里那（洛坤）", (99.96, 9.58),
     "今那空師里那府治，室利佛逝與洛坤王國故地"),
    ("th_south", "in", "北大年", (101.30, 6.88),
     "今北大年府，馬來蘇丹國北大年，半島東岸"),
    ("th_south", "out", "新加坡（淡馬錫）", (103.82, 1.35),
     "海峽另一端，屬「淡馬錫／新加坡」，泰南色塊不得南及"),
    # 東南岸與寮國界線：邊界類工作單（map.md 批次）之驗收點，座標取條目代表點
    ("th_central", "in", "尖竹汶", (102.10, 12.61),
     "en.wiki 〈Chanthaburi〉102.10E,12.61N，暹羅東岸對柬埔寨、越南之港口"),
    ("th_central", "in", "羅勇", (101.28, 12.67),
     "en.wiki 〈Rayong〉101.28E,12.67N，暹灣東岸，吞武里—扎克里之海疆"),
    ("th_isan", "in", "廊開", (102.74, 17.87),
     "en.wiki 〈Nong Khai〉102.74E,17.87N，湄公河南岸之泰端渡口（北岸即寮國永珍）"),
    # 越南：三塊由紅河到湄公河，且不得吞下真臘、占城之外的鄰國都城
    ("vn_north", "in", "河內（昇龍）", (105.85, 21.03),
     "今越南首都，李朝 1010 年遷都昇龍"),
    ("vn_north", "in", "華閭（寧平）", (105.97, 20.25),
     "今寧平省，丁朝、前黎朝都城華閭"),
    ("vn_north", "out", "順化", (107.58, 16.47),
     "廣南—順化，阮氏廣南與阮朝都城，屬「中部海岸」"),
    ("vn_central", "in", "順化", (107.58, 16.47),
     "今承天順化省省城，廣南阮主與阮朝京都"),
    ("vn_central", "in", "茶岳（會安・占城）", (108.33, 15.88),
     "今廣南省會安一帶，占城奔闍槃與 17 世紀會安商港"),
    ("vn_central", "out", "河內（昇龍）", (105.85, 21.03),
     "紅河三角洲，屬「紅河三角洲（交趾・昇龍）」"),
    ("vn_south", "in", "嘉定（今胡志明市）", (106.63, 10.82),
     "今胡志明市第一郡一帶，阮主嘉定城、西貢港口"),
    ("vn_south", "in", "美湫（定祥）", (106.36, 10.36),
     "今前江省美湫市，湄公河三角洲水網城鎮"),
    ("vn_south", "out", "金邊（洛韋）", (104.92, 11.55),
     "今柬埔寨首都，17—19 世紀為真臘／柬埔寨王都，非越南嘉定、永鎮之地"),
    # 東北山區與南海岸：邊界類工作單（map.md 批次）之驗收點，座標取條目代表點
    ("vn_north", "in", "高平", (106.00, 22.67),
     "en.wiki 〈Cao Bằng〉106.00E,22.67N，廣源—高平之山地州，宋—黎、阮初之邊鎮；域名「紅河三角洲」過狹，連山州一併繪入時須同步改名，二者擇一"),
    ("vn_north", "in", "奠邊府", (103.03, 21.40),
     "en.wiki 〈Điện Biên Phủ〉103.03E,21.40N，洮江上游之山間盆地，阮朝西北邊鎮；域名「紅河三角洲」過狹，連山州一併繪入時須同步改名，二者擇一"),
    ("vn_central", "in", "歸仁", (109.23, 13.77),
     "en.wiki 〈Quy Nhơn〉109.23E,13.77N，占婆闍槃故地，西山阮氏發跡之港口"),
    ("vn_central", "in", "芽莊", (109.19, 12.24),
     "en.wiki 〈Nha Trang〉109.19E,12.24N，占婆 Kauthara 故地，17 世紀後廣南阮主之芽莊海口"),
    # 馬來西亞：半島、海峽、婆羅洲兩塊，並把文萊與鄰國首都排除
    ("my_peninsula", "in", "馬六甲", (102.25, 2.19),
     "今馬六甲州治，1400 年代馬六甲蘇丹國都城"),
    ("my_peninsula", "in", "吉隆坡（雪蘭莪）", (101.69, 3.14),
     "今馬來西亞聯邦首都，19 世紀雪蘭莪錫礦市鎮"),
    ("my_peninsula", "in", "亞羅士打（吉打）", (100.36, 6.12),
     "今吉打州治，吉打蘇丹國古都伊崗之近地"),
    ("my_peninsula", "out", "曼谷（昭披耶河口）", (100.50, 13.75),
     "昭披耶河平原，暹羅都城，不得塗入半島色塊"),
    # 東岸與婆羅洲：邊界類工作單（map.md 批次）之驗收點，座標取條目代表點
    ("my_peninsula", "in", "哥打巴魯（吉蘭丹）", (102.25, 6.13),
     "zh.wiki 〈哥打峇魯〉102.25E,6.13N，吉蘭丹蘇丹國都城，半島東北岸（曩為暹羅屬國而文化屬馬來世界）"),
    ("my_singapore", "in", "新加坡（淡馬錫）", (103.82, 1.35),
     "今新加坡共和國主城，14 世紀淡馬錫、1819 年萊佛士開埠"),
    ("my_singapore", "out", "新山（柔佛河口）", (103.76, 1.46),
     "en.wiki 〈Johor Bahru〉103.76E,1.46N，今柔佛州首府，1855 年起之柔佛都城（天敏港）；"
     "與淡馬錫隔柔佛海峽，海峽最狹處僅數百米，故本條只要求離界兩公里：色塊北緣須收在海峽之中，"
     "不得北移蓋住柔佛陸地", 2),
    ("my_sarawak", "in", "古晉", (110.35, 1.55),
     "今砂拉越州治，19 世紀白色王國（ Brooke ）首都"),
    ("my_sarawak", "out", "斯里巴加灣（文萊）", (114.95, 4.89),
     "今文萊達魯薩蘭國首都，獨立蘇丹國，不得塗進砂拉越"),
    ("my_sabah", "in", "亞庇（哥打京那巴魯）", (116.07, 5.98),
     "今沙巴州治，北婆羅洲公司時代之亞庇港"),
    ("my_sabah", "in", "山打根", (118.12, 5.84),
     "今沙巴山打根，19 世紀英屬北婆羅洲總督駐地"),
    ("my_sabah", "out", "古晉", (110.35, 1.55),
     "砂拉越州治，屬「砂拉越（婆羅洲西岸）」"),
]


def run(domains, asserts):
    """跑全部斷言，回傳 (失敗清單, 通過數, 未斷言之 domain)。"""
    fails = []
    passed = 0
    for row in asserts:
        did, want, place, pt, basis = row[:5]
        floor_km = row[5] if len(row) > 5 else 10
        if did not in domains:
            fails.append(f"{did}: 來源檔已無這個 domain（斷言要跟著改名或刪除）")
            continue
        ring = domains[did]["ring"]
        inside = point_in_ring(pt, ring)
        margin = edge_margin_km(pt, ring)
        ok = inside if want == "in" else not inside
        if not ok:
            verdict = "落在範圍外" if want == "in" else "被塗進範圍"
            fails.append(
                f"{did}（{domains[did]['name']}）「{place}」應{'在內' if want == 'in' else '在外'}，"
                f"實際{verdict}，距邊界 {margin:.1f} km｜依據：{basis}"
            )
        elif margin < floor_km:
            fails.append(
                f"{did}（{domains[did]['name']}）「{place}」雖然{'在內' if want == 'in' else '在外'}，"
                f"但離邊界只有 {margin:.1f} km（本條下限 {floor_km} km），這種斷言稍一挪動就會翻，判不穩"
            )
        else:
            passed += 1
    asserted = {a[0] for a in asserts}
    unasserted = [d for d in domains if d not in asserted]
    return fails, passed, unasserted


def teeth(domains):
    """注入三種破壞：挪掉一個 domain、把一個核心城市改判在外、把一個多邊形往東推一度。
    每種都必須被同一套檢查咬到，防止日後把規則改弱而數字仍然全綠。"""
    cases = []
    victim = "ko_north"
    moved = dict(domains)
    moved[victim] = dict(moved[victim], ring=[(lon + 2.0, lat) for lon, lat in domains[victim]["ring"]])
    cases.append(("ring-shift", moved))

    dropped = {k: v for k, v in domains.items() if k != victim}
    cases.append(("domain-gone", dropped))

    shrunk = dict(domains)
    ko = "ko_southeast"
    shrunk[ko] = dict(shrunk[ko], ring=[(lon - 2.0, lat) for lon, lat in domains[ko]["ring"]])
    cases.append(("ring-shrink", shrunk))

    bad = 0
    for name, tree in cases:
        fails, _, _ = run(tree, LANDMARKS)
        if fails:
            print(f"  ✓ teeth/{name} 被咬到（{len(fails)} 條）")
        else:
            print(f"  ✗ teeth/{name} 無事——斷言太弱")
            bad += 1
    print(f"check_country_ring_landmarks --teeth — 失敗 {bad} 項")
    return 1 if bad else 0


def main():
    argv = sys.argv[1:]
    domains = load_domains()
    if "--teeth" in argv:
        return teeth(domains)

    if "--px" in argv:
        i = argv.index("--px")
        try:
            lon, lat = float(argv[i + 1]), float(argv[i + 2])
        except (IndexError, ValueError):
            print("用法：--px <lon> <lat>")
            return 2
        x, y = asia_px(lon, lat)
        print(f"asiaPx({lon}, {lat}) = ({round(x, 1)}, {round(y, 1)})")
        return 0

    if "--unasserted" in argv:
        _, _, unasserted = run(domains, LANDMARKS)
        for d in unasserted:
            print(f"{d}｜{domains[d]['name']}｜待補地標斷言")
        print(f"check_country_ring_landmarks — 尚無斷言之領域名 {len(unasserted)} 個／共 {len(domains)} 個")
        return 0

    only = next((a for a in argv if a.startswith("--only")), None)
    asserts = LANDMARKS
    wanted = []
    if only:
        wanted = [w for w in only.split("=", 1)[1].split(",") if w]
        missing = [w for w in wanted if w not in domains]
        if missing:
            print(f"FAIL 沒有這個領域名：{'、'.join(missing)}")
            print(f"check_country_ring_landmarks — 失敗 {len(missing)} 項")
            return 2
        asserts = [a for a in LANDMARKS if a[0] in wanted]
        if not asserts:
            print(f"FAIL 這些領域名還沒有地標斷言：{'、'.join(wanted)}")
            print("check_country_ring_landmarks — 失敗 1 項")
            return 1

    fails, passed, unasserted = run(domains, asserts)
    for line in fails:
        print(f"FAIL {line}")
    scope = f"（--only：{'、'.join(wanted)}）" if wanted else ""
    print(
        f"check_country_ring_landmarks — {passed + len(fails)} 條地標斷言{scope}"
        f"（在冊領域名 {len(domains)} 個、尚無斷言 {len(unasserted)} 個），失敗 {len(fails)} 條"
    )
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
