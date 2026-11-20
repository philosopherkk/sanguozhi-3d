#!/usr/bin/env python3
"""地標歸屬斷言：把「某地標必須落在某個色塊」這類宣稱變成可執行檢查。

gen_era_regions.py 的註釋列出新疆／漠北兩側的地名與經緯度，但沒有斷言。
本腳本將地標自經緯度投影至 eraRegions 的像素畫布，逐一以 ray-casting 判定，
確認其落在指定環之內、且落在相鄰環之外（兩塊應相鄰而不重疊）。

用法：python3 scripts/check_ring_landmarks.py
      python3 scripts/check_ring_landmarks.py --unasserted   列出尚無任何地標斷言的環（排程佇列）
"""
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_geo import china_px  # noqa: E402  投影只用這一份

ROOT = Path(__file__).resolve().parent.parent
RINGS_TS = ROOT / "src" / "geo" / "eraRegions.ts"
W, H = 1968, 1567

# 名稱 -> (經度, 緯度, 應在其中（None 代表全圖未著色處）, 不應在其中（None＝不檢查）)
LANDMARKS = [
    ("哈巴河", 86.4, 48.1, "xinjiang", "steppe"),
    ("布爾津", 87.5, 47.7, "xinjiang", "steppe"),
    ("阿勒泰", 88.1, 47.8, "xinjiang", "steppe"),
    ("富蘊", 89.5, 47.0, "xinjiang", "steppe"),
    ("青河", 90.4, 46.6, "xinjiang", "steppe"),
    ("哈密", 93.5, 42.8, "xinjiang", "steppe"),
    ("烏列蓋", 89.9, 48.98, "steppe", "xinjiang"),
    ("科布多", 91.6, 48.0, "steppe", "xinjiang"),
    # 高麗環：北界鴨綠江，義州（保州）以北屬遼不屬高麗
    ("開京", 126.55, 37.93, "goryeo", "realm_liao"),
    ("漢陽", 126.98, 37.566, "goryeo", "realm_liao"),
    ("平壤", 125.75, 39.02, "goryeo", "realm_liao"),
    ("遼陽", 122.35, 41.27, "realm_liao", "goryeo"),
    ("遼東半島旅順", 121.2, 38.8, None, "goryeo"),
    # 大越環：北包順州（高平）兩屬之地，南以橫山為 1069 年前界
    ("高平順州", 106.26, 22.67, "daiyue", "yunnan"),
    ("河內東京", 105.85, 21.03, "daiyue", "realm_song_1141"),
    ("順化（1069 年前不著色）", 107.58, 16.47, None, "daiyue"),
    # 湟水與河西兩框不相混
    ("西寧", 101.77, 36.62, "qinghai", "gansu"),
    ("敦煌", 94.66, 40.14, "gansu", "xinjiang"),
    ("開封", 114.35, 34.79, "realm_song_1004", "realm_liao"),
    ("濟南", 117.00, 36.67, "shandong", "henan"),
    ("開封（河南環）", 114.35, 34.79, "henan", "shandong"),
    # 民國東三省：黑龍江—吉林—遼寧以松花江谷地・長白山地相鄰不重疊
    ("哈爾濱", 126.64, 45.76, "hlj", "jl"),
    ("長春", 125.33, 43.90, "jl", "hlj"),
    ("瀋陽", 123.43, 41.80, "ln", "jl"),
    # 熱河省會承德在燕山以北屬熱河，京師在長城以南屬直隸
    ("承德", 117.96, 40.95, "rehe", "zhili"),
    ("保定", 115.46, 38.87, "zhili", "shanxi"),
    # 幽薊古環：薊（北京）在內，代（大同）在恒山—太行界外
    ("北京", 116.40, 39.91, "youyun", "shanxi"),
    ("大同", 113.37, 40.10, "shanxi", "youyun"),
    ("太原", 112.55, 37.87, "shanxi", "zhili"),
    # 陝西自然界：長安在渭水關中，太原在大河（壺口—龍門）之東不屬陝
    ("長安", 108.94, 34.26, "shaanxi", "shanxi"),
    ("延安", 109.49, 36.65, "yanan", "shanxi"),
    # 寧夏：大河東岸灌溉平原，銀川在內，西安在六盤山—隴山界外
    ("銀川", 106.22, 38.48, "ningxia", "shaanxi"),
    # 青藏環：拉薩在內，西寧在湟水（青海環）巴顏喀山界外
    ("拉薩", 91.12, 29.65, "tibet", None),
    ("西寧（不入青藏）", 101.78, 36.62, "qinghai", "tibet"),
    # 四川盆地北緣：成都盆地、漢中在秦嶺—大巴山之北另一帶
    ("成都", 104.06, 30.66, "sichuan", "hanzhong"),
    ("漢中", 107.02, 33.07, "hanzhong", "sichuan"),
    # 貴州：赤水河桐梓河以南，貴陽在內，成都在四川盆地界內
    ("貴陽", 106.63, 26.65, "guizhou", "sichuan"),
    # 嶺南兩省：南寧（桂）廣州（粵）各據珠江東西，互不屬對方
    ("南寧", 108.33, 22.82, "guangxi", "guangdong"),
    ("廣州", 113.26, 23.13, "guangdong", "guangxi"),
    # 湖南北界洞庭湖港，長沙在內；湖北江漢平原與河南界外互證
    ("長沙", 112.94, 28.23, "hunan", "hubei"),
    ("武漢", 114.30, 30.59, "hubei", "henan"),
    # 江西鄱陽湖盆地：南昌在內，長沙在羅霄山界西
    ("南昌", 115.86, 28.68, "jiangxi", "hunan"),
    # 淮北自然界：阜陽在淮河道內，徐州在廢黃道以北屬蘇
    ("阜陽", 115.81, 32.89, "anhui_n", "shandong"),
    ("徐州", 117.19, 34.27, "jiangsu_n", "anhui_n"),
    # 皖南：徽州黃山在大鄣山—天目山之北屬皖，景德鎮在贛界內
    ("黃山", 118.34, 29.71, "anhui_s", "jiangxi"),
    ("景德鎮", 117.20, 29.29, "jiangxi", "anhui_s"),
    # 蘇南江南：蘇州在內，蕪湖在皖蘇界（和縣—江寧間）之西屬皖
    ("蘇州", 120.62, 31.30, "jiangsu_s", "anhui_s"),
    ("蕪湖", 118.43, 31.35, "anhui_s", "jiangsu_s"),
    # 浙江兩半環與閩：杭州（浙北）溫州（浙南）福州（閩）逐帶互斥
    ("杭州", 120.15, 30.27, "zhejiang_n", "jiangsu_s"),
    ("溫州", 120.70, 27.99, "zhejiang_s", "fujian"),
    ("福州", 119.30, 26.07, "fujian", "zhejiang_s"),
    # 察哈爾・綏遠・內蒙西：張家口（長城以北）呼和浩特（黃河彎內）
    # 包頭（河套北岸屬綏遠）額濟納（大河以西屬內蒙西）
    ("張家口", 114.89, 40.77, "chahar", "shanxi"),
    ("呼和浩特", 111.75, 40.84, "suiyuan", "chahar"),
    ("包頭", 109.95, 40.62, "suiyuan", "neimeng_w"),
    ("額濟納", 100.32, 41.75, "neimeng_w", "suiyuan"),
    # 伊洛盆地：洛陽在盆地中央，澠池在洛水上游之西端；成周小框（洛邑）不含此西端
    ("洛陽", 112.45, 34.62, "yiluo", "zhou_wei"),
    ("澠池", 111.76, 34.77, "yiluo", "zhou_luoyi"),
    # 成周洛邑王畿與西周王畿（宗周）：兩京各據洛、鎬，互不屬對方
    ("洛陽（成周）", 112.45, 34.62, "zhou_luoyi", "wei_daliang"),
    ("長安（宗周鎬京）", 108.94, 34.26, "zhou_wei", "zhou_luoyi"),
    # 商（殷墟期）：安陽殷墟在內，關中宗周畿在雍西不屬商畿
    ("安陽（殷墟）", 114.39, 36.10, "shang_yin", "zhou_wei"),
    # 齊都臨淄與春秋齊國：臨淄都城小框在齊國之內，萊州（東萊）在齊東北境
    # 曲阜屬魯、在齊都框外
    ("臨淄", 118.30, 36.82, "linzi", "lu"),
    ("萊州（東萊）", 119.93, 37.18, "qi", "lu"),
    ("曲阜", 116.99, 35.58, "lu", "linzi"),
    # 燕（早期）：薊城（今北京市街）在內，齊都臨淄在燕南界之外
    ("北京（薊）", 116.40, 39.91, "yan_early", "qi"),
    # 晉（曲沃）都邑帶與魏（河東）都邑帶：天馬—曲村在曲沃・翼城之間，
    # 安邑（今夏縣）在汾澮之南，屬魏河東都邑而不屬曲沃一系
    ("翼城（天馬曲村）", 111.72, 35.74, "jin_quwo", "wei_hedong"),
    ("安邑（夏縣）", 111.22, 35.14, "wei_hedong", "jin_quwo"),
    # 吳（太湖）與越（浙江）：姑蘇（今蘇州）在吳域，會稽（今紹興）在越域
    ("蘇州（姑蘇）", 120.62, 31.30, "wu_delta", "yue_zhe"),
    ("紹興（會稽）", 120.58, 30.05, "yue_zhe", "wu_delta"),
    # 楚（早期）荊山之域：郢（今荊州紀南城）在內；隨（今隨州）為姬姓與國
    # （《左傳·桓公六年》楚伐隨），在楚域東北、今湖北環之內
    ("荊州（郢）", 112.24, 30.34, "chu_early", "hubei_n"),
    ("隨州（隨國）", 113.38, 31.69, "hubei_n", "chu_early"),
    # 秦（關中）：雍域（今寶雞一帶，《史記·秦本紀》德公徙雍）在關中環、隴西環外
    ("寶雞（雍域）", 107.24, 34.36, "qin_guanzhong", "longxi"),
    # 趙（邯鄲）：邯鄲（《史記·趙世家》敬侯徙都）在趙邯鄲環、魏（大梁）帶之外
    ("邯鄲", 114.49, 36.60, "zhao_handan", "wei_daliang"),
    # 河西走廊：張掖（漢河西四郡之一）在走廊中段；蘭州在烏鞘嶺以東、西寧在
    # 湟水谷地（祁連主嶺之南），兩者皆不在河西環，與登記「蘭州不屬」「門源・西寧不屬」一致
    ("張掖（河西）", 100.45, 38.92, "hexie", "neimeng_w"),
    ("蘭州（烏鞘嶺以東）", 103.83, 36.06, "gansu", "hexie"),
    ("西寧（湟水谷地）", 101.78, 36.62, "qinghai", "hexie"),
    # 荊南（南郡地，《漢書·地理志》南郡治郢）：江陵在郡治；襄陽在荊北崗地之北、
    # 岳陽在洞庭湖之南（屬長沙），兩者皆不在南郡地，與登記「襄樊不在內」一致
    ("江陵（南郡）", 112.24, 30.34, "jingnan", "hubei_n"),
    ("襄陽（襄樊）", 112.12, 32.01, "hubei_n", "jingnan"),
    ("岳陽（洞庭湖之南）", 113.13, 29.36, "hunan", "jingnan"),
    # 安北都護府（《舊唐書·地理志》《唐會要》）：南界陰山，故呼和浩特在陰山以南不屬；
    # 哈拉和林（鄂爾渾河上游）作漠北中心之地理方位點，非唐代之治所
    ("哈拉和林（漠北中心）", 102.82, 47.20, "tang_anbei", "suiyuan"),
    ("呼和浩特（陰山以南）", 111.75, 40.84, "suiyuan", "tang_anbei"),
    # 北庭都護府（《舊唐書·地理志》有「北庭都護府」目）：治所在庭州金滿縣（今吉木薩爾，
    # 通說整理，非逐字引文）；科布多在阿爾泰山之北不屬
    ("吉木薩爾（北庭）", 89.07, 43.98, "tang_beiting", "steppe"),
    ("科布多（阿爾泰山北）", 91.60, 48.00, "steppe", "tang_beiting"),
    # 安西都護府：龜茲（今庫車）・于闐（今和田）兩鎮在天山南麓與崑崙北麓之間；
    # 哈密（伊州）在天山以北不屬安西
    ("庫車（龜茲）", 82.93, 41.72, "tang_anxi", "steppe"),
    ("和田（于闐）", 79.92, 37.12, "tang_anxi", "steppe"),
    ("哈密（伊州，天山北）", 93.50, 42.80, "xinjiang", "tang_anxi"),
    # 河湟（登記為鄯・廓・河三州地）：西寧（唐鄯州，湟水谷地）在環內；蘭州在黃河以東，
    # 非三州之境
    ("西寧（鄯州）", 101.78, 36.62, "tang_hehuang", "gansu"),
    ("蘭州（黃河以東）", 103.83, 36.06, "gansu", "tang_hehuang"),
]


def load_rings():
    text = RINGS_TS.read_text(encoding="utf-8")
    body = text[text.index("= {") + 2 : text.rindex("}") + 1]
    return json.loads(body)


def inside(rings, pt):
    """ring 可能係多重環（多島）：任何一環包住即算在內。"""
    x, y = pt
    for ring in rings:
        c = False
        j = len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        if c:
            return True
    return False


def list_unasserted(rings) -> int:
    """佇列模式：ERA_RINGS 裡沒有被任何地標點名的環，附依據首句與經緯度範圍。"""
    named = {n for _, _, _, a, b in LANDMARKS for n in (a, b) if n}
    prov = (ROOT / "src" / "data" / "territory" / "ringProvenance.ts").read_text(encoding="utf-8")
    todo = [k for k in rings if k not in named]
    for k in todo:
        m = re.search(rf"^\s*{re.escape(k)}:\s*\{{\s*basis:\s*'([^']*)'", prov, re.M)
        basis = (m.group(1) if m else "（ringProvenance 無登記）")[:70]
        print(f"{k}｜{basis}")
    print(f"check_ring_landmarks --unasserted — 共 {len(rings)} 環，無地標斷言 {len(todo)} 環")
    return 0


def main() -> int:
    rings = load_rings()
    if "--unasserted" in sys.argv:
        return list_unasserted(rings)
    bad = 0
    for name, lon, lat, should, should_not in LANDMARKS:
        px = china_px(lat, lon, W, H)
        in_no = inside(rings[should_not], px) if should_not else False
        if should is None:
            in_yes = None
            ok = not in_no
        else:
            in_yes = inside(rings[should], px)
            ok = in_yes and not in_no
        if not ok:
            bad += 1
        yes_txt = "─" if in_yes is None else str(in_yes)
        print(
            f"{'OK ' if ok else 'FAIL'} {name}: 應在 {should}={yes_txt} 應不在 {should_not}={in_no} "
            f"(像素 {px[0]:.0f},{px[1]:.0f})"
        )
    # 相鄰環不應重疊：以上述地標同時落入兩塊即視為重疊
    print(
        f"check_ring_landmarks — {len(LANDMARKS)} 個地標，失敗 {bad} 個"
        + ("（兩塊相鄰、不重疊、不侵蝕）" if bad == 0 else " → 環界有誤，暫勿合併")
    )
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
