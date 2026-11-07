"""產生 1945–1949 國共內戰的月份級圖層：控制區、作戰線、城市易手、兵力與人口序列。

控制區沿用本專案既有的省級環（src/geo/eraRegions.ts，像素對齊
china_edcp_relief 1968×1567），所以色塊不會偏離底圖；城市與作戰線用
scripts/probe_basemap_sea.py 同一個 china_px 投影換算。

執行：python3 scripts/gen_civil_war.py
輸出：src/chinaCivilWar/data/civilWar.ts

數字的出處與限度見 STRENGTH/POP 的 source 欄：兵力為軍事科學院
《中國人民解放軍戰史》《中國人民解放軍全史》一系的通行統計，國民黨方面
（國防部）口徑不同，兩側數字不能直接相減；「殲敵」含斃傷、被俘、起義與
和平改編，不是單純的陣亡數。
"""

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PI = math.pi
W, H = 1968, 1567


def china_px(lon: float, lat: float) -> tuple[float, float]:
    """與 gen_era_regions.py 同一個圓錐投影，換算到 1968×1567 像素。"""
    x = 50 + 116.80932603407057 * (
        (1.9996655301850468 - (lat * PI / 180))
        * math.sin(0.5867115434267053 * (lon - 104) * PI / 180)
    )
    y = (
        50
        + 1.256383 * 116.80932603407057 * 0.02641006622571962
        - 1.256383
        * 116.80932603407057
        * (
            1.3713469994670882
            - (1.9996655301850468 - (lat * PI / 180))
            * math.cos(0.5867115434267053 * (lon - 104) * PI / 180)
        )
    )
    return round(x / 100 * W, 1), round(y / 100 * H, 1)


# ── 省級環：直接取本專案已有的幾何，不另畫一套 ──────────────────────────
src = (ROOT / 'src/geo/eraRegions.ts').read_text(encoding='utf8')
m = re.search(r'export const ERA_RINGS[^=]*=\s*(\{.*\})\s*\n', src, re.S)
ERA_RINGS = json.loads(m.group(1))

# 1945–49 用得上的省級環（民國行省/解放區行政單位的近似對應）
PROV = {
    'hlj': '黑龍江', 'jl': '吉林', 'ln': '遼寧', 'rehe': '熱河',
    'zhili': '河北（冀）', 'youyun': '冀東/平北', 'shandong': '山東',
    'henan': '河南', 'shanxi': '山西', 'shanxi_n': '晉北', 'shanxi_s': '晉南',
    'shaanxi': '陝西', 'yanan': '陝甘寧（延安）', 'gansu': '甘肅',
    'ningxia': '寧夏', 'qinghai': '青海', 'xinjiang': '新疆', 'tibet': '西藏',
    'sichuan': '四川', 'yunnan': '雲南', 'guizhou': '貴州', 'guangxi': '廣西',
    'guangdong': '廣東', 'hunan': '湖南', 'hubei': '湖北', 'jiangxi': '江西',
    'anhui_n': '皖北', 'anhui_s': '皖南', 'jiangsu_n': '蘇北', 'jiangsu_s': '蘇南',
    'zhejiang_n': '浙西', 'zhejiang_s': '浙東', 'fujian': '福建',
    'chahar': '察哈爾', 'suiyuan': '綏遠', 'neimeng_w': '綏東/內蒙西部',
    'hainan': '海南島', 'taiwan': '台灣',
}


# ── 控制區（月份窗） ─────────────────────────────────────────────────────
# side: ccp 解放區 / kmt 國統區 / soviet 蘇軍佔領 / contested 拉鋸・易手區
# 省級環是「上限示意」：內戰的實控是城市與交通線 vs 鄉村，不是整省易手。
CONTROL = [
    dict(side='soviet', frm=194508, to=194605, prov=['ln', 'jl', 'hlj', 'rehe'],
         note='1945年8月蘇軍對日作戰後佔領東北主要城市與鐵路，1946年3月起撤出。',
         source='《中蘇友好同盟條約》（1945年8月14日）；蘇軍撤兵計劃（1946年）'),
    dict(side='ccp', frm=194508, to=194605,
         prov=['shandong', 'jiangsu_n', 'anhui_n', 'youyun', 'yanan', 'chahar'],
         note='抗戰末期中共軍隊在華北、山東、蘇皖的解放區；受降區與國軍受降區交錯。',
         source='朱德1945年8月15日命令；《解放日報》1945年8月各區受降報道'),
    dict(side='contested', frm=194508, to=194605, prov=['zhili', 'shanxi', 'suiyuan', 'neimeng_w'],
         note='華北城市與交通線由國軍接收，鄉村多在解放區手中；上黨、綏遠、平漢等役在此區發生。',
         source='上黨戰役（1945年9–10月）；綏遠戰役（1945年10–12月）'),
    dict(side='kmt', frm=194508, to=194912, prov=['tibet', 'taiwan'],
         note='西藏（1950年10月昌都戰役、1951年條約）、台灣（1949年12月以後仍由中華民國治理）不在1949年大陸戰事的收束範圍。',
         source='《中央人民政府與西藏地方政府關於和平辦法的協議》（1951年5月23日）'),
    dict(side='kmt', frm=194508, to=195004, prov=['hainan'],
         note='海南島在1950年4–5月海南島戰役之前仍在中華民國治理下。',
         source='海南島戰役（1950年4月17日–5月1日）'),
    dict(side='kmt', frm=194508, to=194605,
         prov=['henan', 'shaanxi', 'gansu', 'ningxia', 'qinghai', 'xinjiang', 'sichuan',
               'yunnan', 'guizhou', 'guangxi', 'guangdong', 'hunan', 'hubei', 'jiangxi',
               'anhui_s', 'jiangsu_s', 'zhejiang_n', 'zhejiang_s', 'fujian',
               'shanxi_n', 'shanxi_s'],
         note='國民政府直接治理的省域（戰時後方與接收區）。',
         source='國民政府行政區劃（1945年）；《中華民國行政區域簡圖》（1947）'),
    dict(side='kmt', frm=194511, to=194605, prov=['ln', 'jl', 'hlj'],
         note='1945年11月起國軍經秦皇島、營口、大連海空運進入東北，與共軍爭奪城市與鐵路。',
         source='《中蘇友好同盟條約》附換文；東北行營（1945年10月）'),
    dict(side='kmt', frm=194606, to=194702,
         prov=['zhili', 'shanxi', 'shanxi_n', 'shanxi_s', 'henan', 'hubei', 'jiangsu_s', 'anhui_s'],
         note='1946年6月全面內戰爆發後，國軍佔領華北城市與交通線（張家口1946年10月11日等）。',
         source='郭廷以《中華民國史事日誌》1946年10月11日條'),
    dict(side='contested', frm=194606, to=194706,
         prov=['shandong', 'jiangsu_n', 'anhui_n', 'youyun', 'chahar', 'suiyuan', 'rehe'],
         note='國軍控制點與線、解放區控制面；華北在此期反覆易手。',
         source='《中國人民解放軍戰史》第三卷（1946–1947華北戰事）'),
    dict(side='contested', frm=194703, to=194804, prov=['yanan'],
         note='1947年3月19日國軍佔領延安，共軍主動撤出；1948年4月22日收復延安。',
         source='延安撤離（1947年3月19日）；收復延安（1948年4月22日）'),
    dict(side='contested', frm=194703, to=194708, prov=['shandong'],
         note='1947年3月起國軍對山東的重點進攻（孟良崮1947年5月15–16日）。',
         source='孟良崮戰役（1947年5月）；《中國人民解放軍戰史》'),
    dict(side='ccp', frm=194712, to=194810, prov=['hlj', 'jl'],
         note='1947年12月–1948年3月東北冬季攻勢後，共軍控制東北絕大部分地區（長春、瀋陽等孤立城市除外）。',
         source='東北1947年冬季攻勢（1947年12月15日–1948年3月15日）'),
    dict(side='contested', frm=194708, to=194806, prov=['henan', 'hubei', 'anhui_n'],
         note='劉鄧大軍進入大別山（1947年8月底）後，鄂豫皖成為拉鋸區；根據地重建過程反覆。',
         source='劉鄧大軍千里躍進大別山（1947年8月27日–9月）'),
    dict(side='ccp', frm=194809, to=194912, prov=['rehe', 'shandong'],
         note='濟南1948年9月24日攻克；熱河隨遼沈戰役收復。',
         source='濟南戰役（1948年9月16–24日）；遼沈戰役戰史'),
    dict(side='ccp', frm=194811, to=194912, prov=['hlj', 'jl', 'ln'],
         note='1948年11月2日遼沈戰役結束，東北全境由共軍控制。',
         source='《中國人民解放軍戰史》遼沈戰役章'),
    dict(side='ccp', frm=194811, to=194912,
         prov=['henan', 'jiangsu_n', 'anhui_n', 'zhili', 'youyun', 'shanxi', 'shanxi_n',
               'shanxi_s', 'chahar', 'suiyuan', 'neimeng_w'],
         note='淮海戰役（1948年11月6日–1949年1月10日）與平津戰役（1948年11月29日–1949年1月31日）之後，長江以北由共軍控制。',
         source='淮海戰役、平津戰役戰史；北平和平改編（1949年1月31日）'),
    dict(side='ccp', frm=194904, to=194912,
         prov=['jiangsu_s', 'anhui_s', 'zhejiang_n', 'zhejiang_s', 'jiangxi', 'hubei', 'shaanxi'],
         note='渡江戰役（1949年4月20–21日夜）以後：南京4月23日、武漢5月17日、西安5月20日、上海5月27日。',
         source='《中國人民解放軍戰史》第四卷；京滬杭戰役（1949年5月）'),
    dict(side='ccp', frm=194908, to=194912,
         prov=['hunan', 'fujian', 'gansu', 'qinghai', 'ningxia', 'xinjiang'],
         note='湖南和平（1949年8月4日）、福州8月17日、蘭州8月26日、寧夏9月23日、新疆9月25–26日起義與和平解放。',
         source='程潛等停戰起義通電（1949年8月4日）；新疆和平解放（1949年9月25日）'),
    dict(side='contested', frm=194905, to=194909, prov=['hunan', 'fujian'],
         note='白崇禧集團在湘贛、閩贛邊區的遲滯作戰（衡寶戰役1949年9–10月）之前的過渡狀態。',
         source='衡寶戰役（1949年9–10月）'),
    dict(side='contested', frm=194907, to=194909,
         prov=['gansu', 'qinghai', 'ningxia', 'xinjiang'],
         note='第一野戰軍西進（扶郿戰役、蘭州攻克前後）的過渡階段。',
         source='扶郿戰役（1949年7–8月）；蘭州戰役（1949年8月）'),
    dict(side='contested', frm=194910, to=194911,
         prov=['guangdong', 'guangxi', 'guizhou', 'sichuan', 'yunnan'],
         note='西南戰役（1949年11月1日–12月31日）進行中的過渡狀態；廣州10月14日已在此段內易手。',
         source='西南戰役（1949年11–12月）'),
    dict(side='ccp', frm=194911, to=194912,
         prov=['guangxi', 'guizhou', 'sichuan', 'yunnan'],
         note='貴州11月15日、重慶11月30日、南寧12月4日、昆明12月9日起義、成都12月27日。',
         source='《中國人民解放軍戰史》第四卷；盧漢起義通電（1949年12月9日）'),
]

# ── 作戰線（月份窗；線依已進行月份逐步推進） ─────────────────────────────
FRONTS = [
    dict(id='f-kmt-ne', side='kmt', frm=194510, to=194604,
         name='國軍海空運進東北（秦皇島・營口・大連）',
         way=[(121.0, 30.7), (119.6, 39.9), (122.2, 40.7), (123.4, 41.8)],
         note='1945年10月起由美艦運送與空運進入華北、東北；11月16日佔山海關。',
         source='《中蘇友好同盟條約》附換文；美國海軍運兵記錄（1945–46）'),
    dict(id='f-zhongyuan', side='ccp', frm=194606, to=194608,
         name='中原突圍',
         way=[(114.6, 31.7), (111.5, 32.0), (110.5, 32.5)],
         note='1946年6月26日前後中原軍區部隊分路突圍，內戰全面化的起點。',
         source='中原突圍（1946年6月26日）；《中國人民解放軍戰史》第三卷'),
    dict(id='f-huabei', side='kmt', frm=194511, to=194610,
         name='沿平漢・平綏推進（佔領張家口）',
         way=[(116.4, 39.9), (115.5, 40.4), (114.9, 40.8)],
         note='沿交通線接收城市；1946年10月11日佔領張家口。',
         source='郭廷以《中華民國史事日誌》1946年10月11日條'),
    dict(id='f-yanan', side='kmt', frm=194703, to=194704,
         name='重點進攻陝北（進入延安）',
         way=[(109.6, 35.8), (109.5, 36.6)],
         note='3月13日起進攻、19日進入延安；共軍主動撤出，轉入內線作戰（青化砗、羊馬河、沙家店）。',
         source='陝北戰事（1947年3–8月）；《中國人民解放軍戰史》第三卷'),
    dict(id='f-liudeng', side='ccp', frm=194706, to=194709,
         name='劉鄧大軍強渡黃河・千里躍進大別山',
         way=[(115.0, 35.7), (115.7, 35.6), (114.5, 34.0), (113.8, 33.0), (115.5, 31.3)],
         note='6月30日夜強渡黃河，8月分路南下越隴海路進入大別山，轉入戰略反攻的標識。',
         source='《劉伯承軍事文選》；鄧小平年譜（1947年6–9月）'),
    dict(id='f-sanlu', side='ccp', frm=194709, to=194711,
         name='三路配合（陳謝出豫西・陳粟出豫東・謝富治出陝南）',
         way=[(110.3, 34.5), (112.0, 34.6), (115.5, 34.0)],
         note='「品」字形展開於中原，把國軍的重點進攻體系拉散。',
         source='《中國人民解放軍戰史》第三卷（1947年9–11月）'),
    dict(id='f-liaoshen', side='ccp', frm=194809, to=194811,
         name='遼沈戰役（北線→錦州→遼西→長春・瀋陽）',
         way=[(125.3, 43.9), (122.1, 42.6), (121.1, 41.1), (121.8, 41.6), (123.4, 41.8)],
         note='9月12日開始；10月15日攻克錦州，10月19日長春和平解放，11月2日瀋陽攻克。殲敵47.2萬（軍科院統計）。',
         source='《中國人民解放軍戰史》第四卷；殲敵數有異說'),
    dict(id='f-huaihai', side='ccp', frm=194811, to=194901,
         name='淮海戰役（濟南→徐州→陳官莊）',
         way=[(117.0, 36.7), (117.2, 34.3), (116.8, 33.9), (116.6, 33.8)],
         note='11月6日開始；碾莊以東殲黃百韜兵團，12月6日–1949年1月10日殲杜聿明集團於陳官莊。殲敵55.5萬。',
         source='《中國人民解放軍戰史》第四卷；淮海戰役統計（有異說）'),
    dict(id='f-pingjin', side='ccp', frm=194811, to=194901,
         name='平津戰役（張家口・新保安・天津・北平）',
         way=[(117.9, 40.9), (114.9, 40.8), (115.5, 40.4), (117.2, 39.1), (116.4, 39.9)],
         note='11月29日開始；12月22日殲35軍於新保安，1月15日攻克天津，1月31日北平和平改編。殲敵52.1萬。',
         source='平津戰役戰史；傅作義部改編協議（1949年1月）'),
    dict(id='f-dujiang', side='ccp', frm=194904, to=194905,
         name='渡江戰役（安慶・蕪湖・鎮江・南京・上海）',
         way=[(117.1, 30.5), (118.4, 31.3), (119.4, 32.2), (118.8, 32.0), (120.2, 30.3), (121.5, 31.2)],
         note='4月20–21日夜全線渡江，23日佔南京；5月3日杭州、17日武漢、27日上海。',
         source='《中國人民解放軍戰史》第四卷；京滬杭戰役（1949年5月）'),
    dict(id='f-xibei', side='ccp', frm=194905, to=194909,
         name='第一野戰軍西進（西安・扶郿・蘭州・寧夏・新疆）',
         way=[(108.9, 34.3), (107.9, 34.2), (103.8, 36.1), (101.8, 36.6), (106.3, 38.5), (87.6, 43.8)],
         note='5月20日西安；7–8月扶郿戰役；8月26日蘭州；9月23日銀川；9月25–26日新疆和平解放。',
         source='《中國人民解放軍戰史》第四卷；新疆起義通電（1949年9月25日）'),
    dict(id='f-nanxia', side='ccp', frm=194909, to=194912,
         name='衡寶・廣東・廣西（追殲白崇禧集團）',
         way=[(112.6, 26.9), (113.3, 23.1), (109.6, 24.5), (108.3, 22.8)],
         note='9–10月衡寶戰役；10月14日廣州；12月3–4日廣西境內殲滅戰（南寧12月4日）。',
         source='衡寶戰役、廣西戰役戰史'),
    dict(id='f-xinan', side='ccp', frm=194911, to=194912,
         name='西南戰役（貴陽・重慶・成都）',
         way=[(106.6, 27.3), (106.5, 29.6), (104.7, 30.6), (104.1, 30.7)],
         note='11月1日開始，突破川黔防線；15日貴陽，30日重慶，12月27日成都戰役結束。',
         source='西南戰役戰史；《中國人民解放軍戰史》第四卷'),
    dict(id='f-yunnan', side='ccp', frm=194912, to=194912,
         name='雲南和平（盧漢起義）',
         way=[(103.8, 26.6), (102.7, 25.0)],
         note='12月9日盧漢在昆明宣布起義；12月30日解放軍進入昆明。',
         source='盧漢起義通電（1949年12月9日）'),
]

# ── 城市易手（月份精度；同一城市可多次易手） ─────────────────────────────
CITIES = [
    ('yanan', '延安', 109.5, 36.6, 194508, 'ccp', '抗戰末期的陝甘寧邊區首府。', '《解放日報》（延安）'),
    ('yanan', '延安', 109.5, 36.6, 194703, 'kmt', '1947年3月19日國軍進入；共軍主動撤出。', '胡宗南部戰報（1947年3月）'),
    ('yanan', '延安', 109.5, 36.6, 194804, 'ccp', '1948年4月22日收復。', '《中國人民解放軍戰史》第三卷'),
    ('zjkg', '張家口', 114.9, 40.8, 194508, 'ccp', '抗戰末期由中共軍隊受降。', '朱德1945年8月命令'),
    ('zjkg', '張家口', 114.9, 40.8, 194610, 'kmt', '1946年10月11日國軍佔領，當日發布停戰令。', '郭廷以《中華民國史事日誌》'),
    ('zjkg', '張家口', 114.9, 40.8, 194812, 'ccp', '1948年12月攻克（平津戰役）。', '平津戰役戰史'),
    ('sy', '瀋陽', 123.4, 41.8, 194603, 'kmt', '蘇軍撤出後國軍接收。', '東北行營檔案'),
    ('sy', '瀋陽', 123.4, 41.8, 194811, 'ccp', '1948年11月2日攻克，遼沈戰役結束。', '《中國人民解放軍戰史》第四卷'),
    ('cc', '長春', 125.3, 43.9, 194605, 'kmt', '1946年5月國軍佔領。', '東北戰事（1946年5月）'),
    ('cc', '長春', 125.3, 43.9, 194810, 'ccp', '1948年10月19日和平解放（曾澤生部投誠）。', '長春圍城戰（1948年5–10月）'),
    ('jz', '錦州', 121.1, 41.1, 194603, 'kmt', '國軍經海運接收。', '東北行營檔案'),
    ('jz', '錦州', 121.1, 41.1, 194810, 'ccp', '1948年10月15日攻克，封閉遼西走廊。', '遼沈戰役戰史'),
    ('heb', '哈爾濱', 126.6, 45.8, 194604, 'ccp', '1946年4月28日共軍控制，後為東北首府。', '東北戰事（1946年4月）'),
    ('jn', '濟南', 117.0, 36.7, 194809, 'ccp', '1948年9月24日攻克（濟南戰役）。', '濟南戰役戰史'),
    ('ly', '洛陽', 112.4, 34.7, 194804, 'ccp', '1948年4月6日攻克（洛陽戰役）。', '《中國人民解放軍戰史》第三卷'),
    ('kf', '開封', 114.3, 34.8, 194810, 'ccp', '1948年6月一度攻克，10月24日最終控制。', '豫東戰役、開封戰役'),
    ('xz', '徐州', 117.2, 34.3, 194901, 'ccp', '淮海戰役核心；1949年1月共軍控制。', '淮海戰役戰史'),
    ('tj', '天津', 117.2, 39.1, 194901, 'ccp', '1949年1月15日攻克。', '平津戰役戰史'),
    ('bp', '北平', 116.4, 39.9, 194901, 'ccp', '1949年1月31日和平改編，古城未戰。', '傅作義部改編協議（1949年1月21日）'),
    ('nj', '南京', 118.8, 32.0, 194904, 'ccp', '1949年4月23日佔領（渡江戰役）。', '《中國人民解放軍戰史》第四卷'),
    ('hz', '杭州', 120.2, 30.3, 194905, 'ccp', '1949年5月3日。', '京滬杭戰役'),
    ('wh', '武漢', 114.3, 30.6, 194905, 'ccp', '1949年5月16–17日（張軻部起義配合）。', '武漢戰事（1949年5月）'),
    ('xa', '西安', 108.9, 34.3, 194905, 'ccp', '1949年5月20日。', '第一野戰軍西進'),
    ('sh', '上海', 121.5, 31.2, 194905, 'ccp', '1949年5月27日（京滬杭戰役）。', '《中國人民解放軍戰史》第四卷'),
    ('ty', '太原', 112.5, 37.9, 194904, 'ccp', '1949年4月24日攻克（太原戰役）。', '太原戰役戰史'),
    ('lz', '蘭州', 103.8, 36.1, 194908, 'ccp', '1949年8月26日攻克。', '蘭州戰役戰史'),
    ('fz', '福州', 119.3, 26.1, 194908, 'ccp', '1949年8月17日。', '閩贛戰役'),
    ('xg', '西寧', 101.8, 36.6, 194909, 'ccp', '1949年9月5日。', '青海戰事'),
    ('yc', '銀川', 106.3, 38.5, 194909, 'ccp', '1949年9月23日（馬鴻逵部投降）。', '寧夏戰役'),
    ('dh', '迪化（烏魯木齊）', 87.6, 43.8, 194909, 'ccp', '1949年9月25–26日新疆和平解放。', '陶峙岳、包爾漢通電（1949年9月）'),
    ('gz', '廣州', 113.3, 23.1, 194910, 'ccp', '1949年10月14日。', '廣東戰事'),
    ('xm', '廈門', 118.1, 24.5, 194910, 'ccp', '1949年10月17日（10月25日古寧頭戰役失利）。', '閩南戰事；古寧頭戰役'),
    ('gy', '貴陽', 106.7, 26.6, 194911, 'ccp', '1949年11月15日。', '西南戰役'),
    ('cq', '重慶', 106.5, 29.6, 194911, 'ccp', '1949年11月30日。', '西南戰役'),
    ('nn', '南寧', 108.3, 22.8, 194912, 'ccp', '1949年12月4日。', '廣西戰役'),
    ('km', '昆明', 102.7, 25.0, 194912, 'ccp', '12月9日盧漢起義，12月30日解放軍入城。', '盧漢起義通電'),
    ('cd', '成都', 104.1, 30.7, 194912, 'ccp', '1949年12月27日成都戰役結束。', '西南戰役'),
]

# ── 兵力與人口序列（口徑見 note／source） ────────────────────────────────
# 兵力為軍事科學院《中國人民解放軍戰史》《中國人民解放軍全史》一系的通行統計；
# 國民黨方面（國防部）口徑不同，兩側數字不能直接相減。單位：萬人。
STRENGTH = [
    dict(ym=194607, kmt=430, ccp=127,
         note='內戰全面爆發時。國民黨軍含正規軍、非正規部隊與後勤機關；解放軍含野戰軍61萬、地方軍24萬、機關及其他。',
         source='軍事科學院《中國人民解放軍戰史》第三卷；《中國人民解放軍全史》統計表'),
    dict(ym=194706, kmt=373, ccp=195,
         note='第一年（1946.7–1947.6）後；國軍可戰兵力下降，後勤與地方部隊比例上升。',
         source='同上'),
    dict(ym=194806, kmt=365, ccp=280,
         note='戰略反攻一年後；解放軍野戰軍擴大，國軍精銳損失而總數下降有限。',
         source='同上'),
    dict(ym=194811, kmt=290, ccp=310,
         note='遼沈戰役結束時，解放軍總兵力首次超過國民黨軍。',
         source='同上'),
    dict(ym=194901, kmt=204, ccp=360,
         note='三大戰役之後；國民黨軍能作戰兵力約100餘萬，其餘為重建與後勤。',
         source='同上；國民黨方面另有統計系統，口徑不同'),
    dict(ym=194906, kmt=150, ccp=400,
         note='渡江戰役後；國民黨殘餘退向閩粵、西南與台灣。',
         source='同上'),
]

POP = [
    dict(ym=194607, ccpPop=1.36, ccpArea=228,
         note='解放區面積約228萬平方公里、人口約1.36億（約占當時全國的四分之一）。',
         source='《中國人民解放軍全史》統計；中央黨史研究室《中國共產黨歷史》第一卷'),
    dict(ym=194706, ccpPop=1.0, ccpArea=100,
         note='1946年10月–1947年6月國軍佔領張家口、延安等地後，解放區面積與人口一度大幅縮小；各書差異大，只作量級。',
         source='同上（此年數字異說最多）', disputed=True),
    dict(ym=194811, ccpPop=1.68, ccpArea=235,
         note='遼沈戰役後東北全境與華北大部連成一片；人口含新解放區。',
         source='同上', disputed=True),
    dict(ym=194910, ccpPop=4.0, ccpArea=700,
         note='建國時大陸絕大部分地區；全國總人口通常以1953年普查6.02億回溯為約4.5億以上。',
         source='《中國統計年鑑》1983（1953年人口普查）；《中國共產黨歷史》第一卷', disputed=True),
]

TOTAL = dict(
    text='三年（1946.7–1949.9）殲敵總數的通行統計為158萬餘人（含斃傷、被俘、起義與和平改編）；'
         '三大戰役分別殲敵47.2萬、55.5萬、52.1萬。國民黨方面的損失統計口徑不同，'
         '「殲敵」也不是單純的陣亡數。',
    source='軍事科學院《中國人民解放軍戰史》附錄統計；《中國人民解放軍全史》統計表',
)



def _ym_add(ym: int, k: int) -> int:
    y, m = divmod(ym, 100)
    t = (y * 12 + (m - 1)) + k
    return (t // 12) * 100 + (t % 12) + 1


def normalize_control() -> list[dict]:
    """每個省在任何月份都要有一個身分。

    作者只寫「這段從什麼時候開始」，結束月一律由下一段的開始月往前推一個月
    （最後一段收到 194912）。這樣不會出現兩個身分並存，也不會出現
    「這月沒有顏色」的空洞；要讓一省回到舊身分，就明寫一段。
    """
    by_prov: dict[str, list[dict]] = {}
    for c in CONTROL:
        for p in c['prov']:
            by_prov.setdefault(p, []).append(
                dict(side=c['side'], frm=c['frm'], note=c['note'], source=c['source'], prov=p)
            )
    out: list[dict] = []
    for p, segs in by_prov.items():
        segs.sort(key=lambda s: s['frm'])
        for i, s in enumerate(segs):
            nxt = segs[i + 1]['frm'] if i + 1 < len(segs) else None
            end = 194912 if nxt is None else _ym_add(nxt, -1)
            if end < s['frm']:
                print(f'  !! {p}: {s["side"]} {s["frm"]} 被後一段吃掉，跳過')
                continue
            out.append(dict(side=s['side'], frm=s['frm'], to=end, prov=p, note=s['note'], source=s['source']))

    # 完整性檢查：每一省在 1945-08 … 1949-12 的每一個月都要恰好有一個身分。
    months = []
    cur = 194508
    while cur <= 194912:
        months.append(cur)
        cur = _ym_add(cur, 1)
    problems = 0
    first_gap: dict[str, int] = {}
    for p in by_prov:
        for m in months:
            hits = [s for s in out if s['prov'] == p and s['frm'] <= m <= s['to']]
            if len(hits) != 1:
                problems += 1
                first_gap.setdefault(p, m)
    for p, m in sorted(first_gap.items()):
        earliest = min(s['frm'] for s in out if s['prov'] == p)
        print(f'  gap {p:12s} 從 {m} 起空，最早段 {earliest}')
    print(f'控制區完整性：{len(by_prov)} 省 × {len(months)} 月，問題 {problems} 個')
    return out


def emit(path: Path) -> None:
    out: list[str] = []
    out.append('/* 由 scripts/gen_civil_war.py 產生。')
    out.append('   控制區沿用 src/geo/eraRegions.ts 的省級環（像素對齊 china_edcp_relief 1968×1567），')
    out.append('   城市與作戰線用同一個圓錐投影換算，所以不會偏離底圖。')
    out.append('')
    out.append('   限度：省級色塊是上限示意。內戰的實控是「城市與交通線 vs 鄉村」，同一省內往往')
    out.append('   同時存在兩種控制；兵力與人口數字的統計口徑兩側不同。 */')
    out.append('')
    out.append("export type CWSide = 'ccp' | 'kmt' | 'soviet' | 'contested'")
    out.append('')
    out.append('export interface CWControl {')
    out.append('  id: string')
    out.append('  side: CWSide')
    out.append('  prov: string')
    out.append('  provName: string')
    out.append('  fromYm: number')
    out.append('  toYm: number')
    out.append('  note: string')
    out.append('  source: string')
    out.append('  rings: [number, number][][]')
    out.append('}')
    out.append('')
    out.append('export interface CWFront {')
    out.append('  id: string')
    out.append('  name: string')
    out.append('  side: CWSide')
    out.append('  fromYm: number')
    out.append('  toYm: number')
    out.append('  pts: [number, number][]')
    out.append('  note: string')
    out.append('  source: string')
    out.append('}')
    out.append('')
    out.append('export interface CWCity {')
    out.append('  id: string')
    out.append('  name: string')
    out.append('  x: number')
    out.append('  y: number')
    out.append('  ym: number')
    out.append('  side: CWSide')
    out.append('  note: string')
    out.append('  source: string')
    out.append('}')
    out.append('')
    out.append('export interface CWStrength {')
    out.append('  ym: number')
    out.append('  kmt: number')
    out.append('  ccp: number')
    out.append('  note: string')
    out.append('  source: string')
    out.append('}')
    out.append('')
    out.append('export interface CWPop {')
    out.append('  ym: number')
    out.append('  ccpPop: number')
    out.append('  ccpArea: number')
    out.append('  note: string')
    out.append('  source: string')
    out.append('  disputed?: boolean')
    out.append('}')
    out.append('')
    out.append('export const CW_MAP = {')
    out.append("  file: 'china_edcp_relief_display.jpg',")
    out.append(f'  w: {W},')
    out.append(f'  h: {H},')
    out.append("  generatedBy: 'scripts/gen_civil_war.py',")
    out.append('}')
    out.append('')
    out.append('export const CW_CONTROL: CWControl[] = [')
    n = 0
    for c in normalize_control():
        p = c['prov']
        rings = ERA_RINGS.get(p)
        if not rings:
            print(f'  !! 沒有環: {p}')
            continue
        n += 1
        out.append('  {')
        out.append(f"    id: '{c['side']}-{p}-{c['frm']}', side: '{c['side']}',")
        out.append(f"    prov: {json.dumps(p)}, provName: {json.dumps(PROV.get(p, p), ensure_ascii=False)},")
        out.append(f"    fromYm: {c['frm']}, toYm: {c['to']},")
        out.append(f"    note: {json.dumps(c['note'], ensure_ascii=False)},")
        out.append(f"    source: {json.dumps(c['source'], ensure_ascii=False)},")
        out.append('    rings: ' + json.dumps(rings, separators=(',', ':')) + ',')
        out.append('  },')
    out.append(']')
    out.append('')
    out.append('export const CW_FRONT: CWFront[] = [')
    for f in FRONTS:
        pts = [china_px(lo, la) for lo, la in f['way']]
        out.append('  {')
        out.append(f"    id: '{f['id']}', name: {json.dumps(f['name'], ensure_ascii=False)}, side: '{f['side']}',")
        out.append(f"    fromYm: {f['frm']}, toYm: {f['to']},")
        out.append('    pts: ' + json.dumps(pts, separators=(',', ':')) + ',')
        out.append(f"    note: {json.dumps(f['note'], ensure_ascii=False)},")
        out.append(f"    source: {json.dumps(f['source'], ensure_ascii=False)},")
        out.append('  },')
    out.append(']')
    out.append('')
    out.append('export const CW_CITY: CWCity[] = [')
    for cid, name, lon, lat, ym, side, note, source in CITIES:
        x, y = china_px(lon, lat)
        out.append('  {')
        out.append(f"    id: {json.dumps(cid, ensure_ascii=False)}, name: {json.dumps(name, ensure_ascii=False)},")
        out.append(f'    x: {x}, y: {y}, ym: {ym}, side: \'{side}\',')
        out.append(f"    note: {json.dumps(note, ensure_ascii=False)},")
        out.append(f"    source: {json.dumps(source, ensure_ascii=False)},")
        out.append('  },')
    out.append(']')
    out.append('')
    out.append('export const CW_STRENGTH: CWStrength[] = [')
    for s in STRENGTH:
        out.append('  {')
        out.append(f"    ym: {s['ym']}, kmt: {s['kmt']}, ccp: {s['ccp']},")
        out.append(f"    note: {json.dumps(s['note'], ensure_ascii=False)},")
        out.append(f"    source: {json.dumps(s['source'], ensure_ascii=False)},")
        out.append('  },')
    out.append(']')
    out.append('')
    out.append('export const CW_POP: CWPop[] = [')
    for s in POP:
        out.append('  {')
        out.append(f"    ym: {s['ym']}, ccpPop: {s['ccpPop']}, ccpArea: {s['ccpArea']},")
        out.append(f"    note: {json.dumps(s['note'], ensure_ascii=False)},")
        out.append(f"    source: {json.dumps(s['source'], ensure_ascii=False)},")
        if s.get('disputed'):
            out.append('    disputed: true,')
        out.append('  },')
    out.append(']')
    out.append('')
    out.append('export const CW_TOTAL = {')
    out.append(f"  text: {json.dumps(TOTAL['text'], ensure_ascii=False)},")
    out.append(f"  source: {json.dumps(TOTAL['source'], ensure_ascii=False)},")
    out.append('}')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(out) + '\n', encoding='utf8')
    print(f'ts -> {path}: {n} control windows, {len(FRONTS)} fronts, {len(CITIES)} city events, '
          f'{len(STRENGTH)} strength points, {path.stat().st_size // 1024} KB')


FACTION_META = [
    ('ccp', '解放區（中國共產黨）', '#b03030'),
    ('kmt', '國統區（中華民國政府）', '#2f5f8a'),
    ('soviet', '蘇軍佔領（東北）', '#7a5aa0'),
    ('contested', '拉鋸・反覆易手區', '#b08a20'),
]

# 快照年取該年 12 月在效的身分（與「疆域採 X 年快照」的說法一致）。
SNAP_YEARS = [1945, 1946, 1947, 1948, 1949]
SNAP_LABEL = {
    1945: '抗戰結束、受降與對峙',
    1946: '全面內戰爆發後',
    1947: '重點進攻與轉入反攻',
    1948: '戰略決戰（三大戰役）',
    1949: '渡江與大陸戰事收束',
}
SNAP_NOTE = {
    1945: '東北是蘇軍佔領區（至1946年撤兵），不是任何一方的行政區。華北城市與交通線由國軍接收、鄉村多在解放區，故標拉鋸。',
    1946: '1946年6月26日中原突圍後全面內戰；10月11日國軍佔張家口。國軍控制點與線，解放區控制面。',
    1947: '1947年3月19日國軍進入延安（共軍主動撤出）；6月30日劉鄧大軍強渡黃河，8月進入大別山，鄂豫皖成為拉鋸區。',
    1948: '9–11月遼沈、11–1月淮海、11–1月平津；11月2日以後東北全境易手，11月解放軍總兵力首次超過國軍。',
    1949: '4月20–21日渡江，23日南京；其後蘭州8月、新疆9月、廣州10月、重慶11月、成都12月。西藏、台灣、海南（至1950年5月）不在大陸戰事收束範圍。',
}


def side_at(norm: list[dict], prov: str, ym: int) -> str | None:
    for s in norm:
        if s['prov'] == prov and s['frm'] <= ym <= s['to']:
            return s['side']
    return None


def norm_note(norm: list[dict], prov: str, ym: int) -> str:
    """該省在該月那一段的注文（控制為什麼這樣分）。"""
    for s in norm:
        if s['prov'] == prov and s['frm'] <= ym <= s['to']:
            return f'{PROV.get(prov, prov)}：{s["note"]}'
    return ''


# 重大事件（月精確；政治與軍事並列）。逐月的城市易手與作戰線由下面的表自動生成。
MAJOR_EVENTS = [
    dict(id='cw-1945-08', ym=194508, title='日本投降、中國戰區受降',
         desc='8月15日終戰詔書；9月2日降伏文書；9月9日南京受降。華北由中共軍隊受降、江南由國民政府軍隊受降的分配，直接劃出內戰的接觸線。',
         factions=['kmt', 'ccp'], source='《日本降伏文書》（1945年9月2日）；郭廷以《中華民國史事日誌》',
         secondary='受降區的分派同時是軍事位置的劃定；蘇軍同時佔領東北。',
         university='抗戰結束與內戰前夜在同一個月重疊。受降的地區分配把「誰進哪座城市」變成軍事事實，1945年的地圖因此是主權恢復與軍事對峙兩層重疊。', type='politics'),
    dict(id='cw-1945-10', ym=194510, title='重慶談判與《雙十協定》',
         desc='8月28日毛澤東赴重慶，10月10日簽訂會談紀要（雙十協定），同意避免內戰、召開政治協商會議。',
         factions=['kmt', 'ccp'], source='《政府與中共代表會談紀要》（1945年10月10日）',
         secondary='協定簽下同時，上黨、綏遠等役已在進行；文字與戰場不同步。',
         university='雙十協定是文字層的和談，同時上黨戰役（9–10月）與綏遠戰役（10–12月）在打。讀這一年要把協定與戰役並列，不能只用其中一條。', type='politics'),
    dict(id='cw-1946-01', ym=194601, title='政治協商會議與停戰令',
         desc='1月10日停戰令生效、政治協商會議開幕（至31日），通過政府改組、憲法草案等決議。',
         factions=['kmt', 'ccp'], source='政治協商會議決議文（1946年1月）；郭廷以《中華民國史事日誌》',
         secondary='停戰令的多處邊界在簽下當日即被違反。',
         university='政協的決議在1946年1月是制度性的出路，其後數月逐一破裂。地圖上1946年1月與6月的接觸線幾乎相同，說明文字沒有改變實控。', type='politics'),
    dict(id='cw-1946-06', ym=194606, title='中原突圍：全面內戰爆發',
         desc='6月26日前後中原軍區部隊分路突圍，國共全面戰爭開始。',
         factions=['ccp', 'kmt'], source='中原突圍（1946年6月26日）；《中國人民解放軍戰史》第三卷',
         secondary='突圍方向分鄂西北與蘇中兩路，不是單一路線。',
         university='1946年6月26日是階段的分界而非唯一原因：停戰令自1月已反覆被破壞。把全面內戰起點定在這一天是戰史的分段慣例。'),
    dict(id='cw-1947-03', ym=194703, title='國軍進入延安',
         desc='3月13日起進攻陝北，3月19日進入延安；共軍主動撤出，轉入內線作戰（青化砗、羊馬河、沙家店）。',
         factions=['kmt', 'ccp'], source='胡宗南部戰報（1947年3月）；《中國人民解放軍戰史》第三卷',
         secondary='佔領空城與殲滅有生力量是兩件事；延安1948年4月22日收復。',
         university='延安的易手是象徵重於實利的節點：國軍得到城市，共軍保留軍隊與鄉村。地圖上陝甘寧在1947-03至1948-04標為拉鋸而非國統區，理由在此。'),
    dict(id='cw-1947-06', ym=194706, title='劉鄧大軍強渡黃河、千里躍進大別山',
         desc='6月30日夜強渡黃河，8月分路南下越隴海路進入大別山，是解放軍由戰略防禦轉入戰略反攻的標識。',
         factions=['ccp'], source='《劉伯承軍事文選》；鄧小平年譜（1947年6–9月）',
         secondary='大別山根據地的重建反覆受挫，不是到達即站穩。',
         university='「躍進大別山」的意義在把戰爭推向國統區，不在一次戰役勝負。鄂豫皖此後一年仍是拉鋸區，地圖因此不把它直接改色。'),
    dict(id='cw-1948-09', ym=194809, title='濟南戰役與遼沈戰役開始',
         desc='9月16–24日攻克濟南；9月12日開始的遼沈戰役至11月2日結束，殲敵47.2萬（軍科院統計）。',
         factions=['ccp', 'kmt'], source='濟南戰役、遼沈戰役戰史；殲敵數有異說',
         secondary='錦州10月15日、長春10月19日和平解放、瀋陽11月2日。',
         university='遼沈的決定性在封閉遼西走廊（錦州），使東北國軍失去退路。殲敵數含被俘與起義，不是陣亡數。'),
    dict(id='cw-1948-11', ym=194811, title='淮海戰役開始；解放軍兵力首次超過國軍',
         desc='11月6日淮海戰役開始（至1949年1月10日，殲敵55.5萬）；同月解放軍總兵力310萬，超過國民黨軍290萬。',
         factions=['ccp', 'kmt'], source='《中國人民解放軍戰史》第四卷；兵力為軍事科學院通行統計',
         secondary='兵力統計的兩側口徑不同（含後勤與非正規部隊），不能直接相減。',
         university='1948年11月是數量與士氣同時翻轉的月份：三大戰役在此月同時展開，而國民黨軍的可戰兵力下降快於總數。'),
    dict(id='cw-1948-11b', ym=194811, title='平津戰役開始',
         desc='11月29日開始；12月22日殲35軍於新保安，1949年1月15日攻克天津，1月31日北平和平改編，殲敵52.1萬。',
         factions=['ccp', 'kmt'], source='平津戰役戰史；傅作義部改編協議（1949年1月）',
         secondary='北平的和平改編使古城未受戰火，是談判與軍事壓力的結果。',
         university='平津的兩段（天津攻城、北平改編）必須分開：一座是軍事結果，一座是政治協議。'),
    dict(id='cw-1949-04', ym=194904, title='渡江戰役與南京易手',
         desc='4月20–21日夜全線渡江，23日佔南京；其後5月3日杭州、17日武漢、27日上海。',
         factions=['ccp', 'kmt'], source='《中國人民解放軍戰史》第四卷；京滬杭戰役（1949年5月）',
         secondary='渡江線東起江陰、西至安慶，各兵團渡點不同。',
         university='「長江防線」在1949年4月同時是軍事與政治的界線：南京易手後國民政府遷往廣州、再遷成都與台北。'),
    dict(id='cw-1949-09', ym=194909, title='新疆和平解放與政治協商會議',
         desc='9月25–26日陶峙岳、包爾漢通電起義，新疆和平解放；9月21–30日中國人民政治協商會議第一屆全體會議，通過《共同綱領》。',
         factions=['ccp'], source='新疆起義通電（1949年9月25日）；《中國人民政治協商會議共同綱領》（1949年9月29日）',
         secondary='和平解放與軍事進軍在同一省內並行（第一野戰軍同時西進）。',
         university='新疆的易手以通電與改編為主，不是攻城戰；這也說明1949年的版圖變化不能只用戰役解釋。', type='politics'),
    dict(id='cw-1949-10', ym=194910, title='中華人民共和國成立；廣東易手',
         desc='10月1日中央人民政府成立；10月14日廣州易手，10月17日廈門（10月25日古寧頭戰役失利）。',
         factions=['ccp', 'kmt'], source='《中央人民政府公告》（1949年10月1日）；閩南戰事檔案',
         secondary='古寧頭戰役的失利說明1949年的渡海作戰並非全部成功。',
         university='建國日是政權成立的節點，不是大陸戰事的終點：西南在11–12月，海南在1950年5月，西藏在1950–51年。'),
    dict(id='cw-1949-12', ym=194912, title='西南戰役結束：重慶、成都、雲南',
         desc='11月30日重慶、12月9日盧漢昆明起義、12月27日成都戰役結束；大陸主要戰事收束。',
         factions=['ccp', 'kmt'], source='西南戰役戰史；盧漢起義通電（1949年12月9日）',
         secondary='起義、改編與殲滅三種方式同時存在，不能一概稱「戰役」。',
         university='1949年12月的版圖收束混合了軍事殲滅與政治起義。把這一年畫成單純的軍事推進，會抹掉起義與改編這條線。'),
]

PEOPLE = [
    dict(name='毛澤東', side='ccp', role='中共中央主席；戰略決策與九月會議、濟南戰役後的決戰決策', source='《毛澤東年譜》（1945–1949）'),
    dict(name='蔣介石', side='kmt', role='國民政府主席、陸海空軍大元帥', source='總統府檔案；郭廷以《中華民國史事日誌》'),
    dict(name='林彪', side='ccp', role='東北野戰軍司令員（遼沈、平津）', source='《中國人民解放軍戰史》第四卷'),
    dict(name='粟裕', side='ccp', role='華東野戰軍代司令員（淮海前線指揮）', source='《粟裕戰爭回憶錄》'),
    dict(name='劉伯承', side='ccp', role='中原野戰軍司令員（大別山、淮海）', source='《劉伯承軍事文選》'),
    dict(name='鄧小平', side='ccp', role='中原野戰軍政委、總前委書記', source='《鄧小平年譜》'),
    dict(name='彭德懷', side='ccp', role='第一野戰軍（陝北、西北）', source='《彭德懷自述》'),
    dict(name='傅作義', side='kmt', role='華北剿總總司令；1949年1月北平和平改編', source='平津戰役戰史；改編協議（1949年1月）'),
    dict(name='衛立煌', side='kmt', role='東北剿總總司令（遼沈）', source='遼沈戰役戰史'),
    dict(name='杜聿明', side='kmt', role='徐州剿總副總司令（淮海被俘）', source='淮海戰役戰史'),
    dict(name='白崇禧', side='kmt', role='華中軍政長官（衡寶、廣西）', source='衡寶戰役、廣西戰役戰史'),
    dict(name='程潛', side='kmt', role='湖南省主席；1949年8月4日停戰起義', source='程潛等通電（1949年8月4日）'),
    dict(name='陶峙岳', side='kmt', role='新疆警備總司令；1949年9月25日起義', source='新疆和平解放檔案'),
    dict(name='盧漢', side='kmt', role='雲南省政府主席；1949年12月9日起義', source='盧漢起義通電（1949年12月9日）'),
]


def emit_pack(path: Path) -> None:
    norm = normalize_control()
    out: list[str] = []
    out.append('/* 由 scripts/gen_civil_war.py 產生：1945–1949 國共內戰（民國／共和國之間的四年）。')
    out.append('   控制區沿用 src/geo/eraRegions.ts 的省級環（像素對齊 china_edcp_relief 1968×1567），')
    out.append('   城市與作戰線用同一個圓錐投影換算。快照取該年12月在效的身分。')
    out.append('')
    out.append('   限度：省級色塊是上限示意。內戰的實控是「城市與交通線 vs 鄉村」，同一省內往往')
    out.append('   同時存在兩種控制；兵力與人口數字的統計口徑兩側不同（見 profiles 與事件出處）。 */')
    out.append("import type { ImperialPack } from '../types'")
    out.append('')
    out.append('export const CIVIL_WAR_PACK: ImperialPack = {')
    out.append("  id: 'civilwar',")
    out.append("  title: '國共內戰',")
    out.append("  tag: '1945–1949 · 逐月紀事 · 版圖以年快照、城市易手與作戰線到月 · 省級色塊是上限示意',")
    out.append('  footer: ' + json.dumps(
        '中國 · 國共內戰（1945–1949）· 1945年8月15日終戰、9月9日南京受降；1946年6月26日中原突圍'
        ' · 1947年3月19日國軍入延安、6月30日劉鄧大軍強渡黃河 · 1948年9月12日–11月2日遼沈、'
        '11月6日–1949年1月10日淮海、11月29日–1月31日平津 · 1949年4月20–21日渡江、23日南京、'
        '5月27日上海、10月1日建國 · 12月27日成都戰役結束，西藏（1950–51）、海南（1950年5月）、'
        '台灣不在這四年的大陸戰事裡 · 兵力與殲敵為軍事科學院一系統計，國民黨方面口徑不同，'
        '兩側不能直接相減 · 抗戰與戰後接收見「民國軍閥」，建國以後見「共和國」',
        ensure_ascii=False) + ',')
    out.append('  yearMin: 1945,')
    out.append('  yearMax: 1949,')
    out.append('  initialYear: 1946,')
    out.append('  ticks: [')
    for y in SNAP_YEARS:
        out.append(f"    {{ year: {y}, label: {json.dumps(SNAP_LABEL[y], ensure_ascii=False)} }},")
    out.append('  ],')
    out.append('  factions: [')
    for fid, name, color in FACTION_META:
        out.append(f"    {{ id: '{fid}', name: {json.dumps(name, ensure_ascii=False)}, color: '{color}' }},")
    out.append('  ],')

    # ── 快照：只在控制歸屬改變的那個月落一筆；幾何取自省份 id → eraRegions ──
    out.append('  snapshots: [')
    months = []
    cur = 194508
    while cur <= 194912:
        months.append(cur)
        cur = _ym_add(cur, 1)

    side_name = {fid: nm for fid, nm, _ in FACTION_META}
    prev_vec: dict[str, str] | None = None
    n_snap = 0
    for ym in months:
        vec = {p: side_at(norm, p, ym) for p in PROV}
        vec = {p: s for p, s in vec.items() if s and ERA_RINGS.get(p)}
        if vec == prev_vec:
            continue
        y, mo = ym // 100, ym % 100
        if prev_vec is None:
            changed = []
            head = f'{y}年{mo}月起點：抗戰結束時的控制狀態。'
        else:
            changed = [p for p in vec if prev_vec.get(p) != vec[p]]
            parts = [f'{PROV.get(p, p)}→{side_name.get(vec[p], vec[p])}' for p in changed]
            head = '本月改變：' + '、'.join(parts) + '。' if parts else ''
        notes = [norm_note(norm, p, ym) for p in changed]
        note = head + (' ' if head else '') + '；'.join(n for n in notes if n)
        out.append('    {')
        out.append(f'      year: {y}, month: {mo},')
        out.append(f"      label: {json.dumps(f'{y}年{mo}月', ensure_ascii=False)},")
        out.append('      source: ' + json.dumps(
            '譚其驤《中國歷史地圖集》現代底圖作地理底；軍事科學院《中國人民解放軍戰史》第三、四卷；'
            '郭廷以《中華民國史事日誌》', ensure_ascii=False) + ',')
        out.append('      control: {')
        for p in sorted(vec):
            out.append(f"        {json.dumps(p)}: {json.dumps(vec[p])},")
        out.append('      },')
        out.append(f"      note: {json.dumps(note.strip(), ensure_ascii=False)},")
        out.append('      disputed: true,')

        marks = [c for c in CITIES if c[4] == ym]
        if marks:
            out.append('      markers: [')
            for cid, name, lon, lat, cym, side, cnote, csource in marks:
                x, yy = china_px(lon, lat)
                out.append('        {')
                out.append(f"          faction: '{side}', name: {json.dumps(name, ensure_ascii=False)},")
                out.append(f'          x: {x}, y: {yy},')
                out.append('        },')
            out.append('      ],')
        out.append('    },')
        prev_vec = vec
        n_snap += 1
    out.append('  ],')

    # ── 作戰線 ────────────────────────────────────────────────────────
    out.append('  routes: [')
    for f in FRONTS:
        pts = [china_px(lo, la) for lo, la in f['way']]
        out.append('    {')
        out.append(f"      id: '{f['id']}', name: {json.dumps(f['name'], ensure_ascii=False)}, year: {f['frm'] // 100},")
        out.append(f"      month: {f['frm'] % 100}, faction: '{f['side']}',")
        out.append(f"      source: {json.dumps(f['source'] + '｜' + f['note'], ensure_ascii=False)},")
        out.append('      points: ' + json.dumps(pts, separators=(',', ':')) + ',')
        out.append('    },')
    out.append('  ],')
    # ── 事件（月精確；時間軸會自動出現「本年逐月」） ──────────────────
    out.append('  events: [')

    def ev(eid, ym, title, desc, factions, source, secondary, university, etype='war', extra=None):
        out.append('    {')
        out.append(f"      id: '{eid}', year: {ym // 100}, month: {ym % 100}, datePrecision: 'month',")
        out.append(f"      title: {json.dumps(title, ensure_ascii=False)},")
        out.append(f"      desc: {json.dumps(desc, ensure_ascii=False)},")
        out.append('      factions: [' + ', '.join(json.dumps(f, ensure_ascii=False) for f in factions) + '],')
        out.append(f"      source: {json.dumps(source, ensure_ascii=False)},")
        out.append(f"      secondary: {json.dumps(secondary, ensure_ascii=False)},")
        out.append(f"      university: {json.dumps(university, ensure_ascii=False)},")
        out.append(f"      type: '{etype}',")
        if extra:
            out.append(extra)
        out.append('    },')

    for e in MAJOR_EVENTS:
        ev(e['id'], e['ym'], e['title'], e['desc'], e['factions'], e['source'],
           e['secondary'], e['university'], e.get('type', 'war'))

    for cid, name, lon, lat, cym, side, note, source in sorted(CITIES, key=lambda c: c[4]):
        ev(f'cw-c-{cid}-{cym}', cym, f'{name}易手', note, [side], source,
           '城市易手是月精確的點，不是整省易手；同一省內可能同時有兩種控制。',
           '內戰的實控在城市與交通線。把一個月的易手畫成整省改色，是把點讀成面。')

    for f in sorted(FRONTS, key=lambda x: x['frm']):
        ev(f'cw-r-{f["id"]}', f['frm'], f['name'],
           f"{f['note']}（{f['frm'] // 100}年{f['frm'] % 100}月–{f['to'] // 100}年{f['to'] % 100}月）",
           [f['side']], f['source'],
           '路線沿交通線與推定方向示意，未逐日復原；日期為戰役的起止月。',
           '行軍線是推定的方向與階段，不是每一天的位置。殲敵與兵力數字依統計口徑不同。')

    out.append('  ],')

    # ── profiles：兵力與人口放在勢力卡上 ──────────────────────────────
    strength_lines = '；'.join(f"{s['ym'] // 100}年{s['ym'] % 100}月 國民黨軍{s['kmt']}萬／解放軍{s['ccp']}萬"
                              for s in STRENGTH)
    pop_lines = '；'.join(f"{p['ym'] // 100}年{p['ym'] % 100}月 解放區人口約{p['ccpPop']}億、"
                          f"面積約{p['ccpArea']}萬平方公里" for p in POP)
    profiles = {
        'ccp': dict(
            eraIntro='中國共產黨及其軍隊（解放區、解放軍）。1945年時控制華北、山東、蘇皖的鄉村與中小城鎮，1949年控制大陸絕大部分。',
            population=f'解放區人口與面積：{pop_lines}。1947年前後因國軍佔領張家口、延安而一度縮小，各書統計差異大。',
            military=f'兵力（萬人）：{strength_lines}。1948年11月解放軍總兵力首次超過國民黨軍。'
                     f'{TOTAL["text"]}',
            economy='解放區的土地改革、公糧與支前民工是戰爭的財政與後勤基礎，不是全國性的稅收統計。',
            politics='政治協商會議破裂、1947年憲法與國民參政會的對立，到1949年9月中國人民政治協商會議與《共同綱領》。',
            source=TOTAL['source'] + '；中央黨史研究室《中國共產黨歷史》第一卷',
            disputed=True,
        ),
        'kmt': dict(
            eraIntro='中華民國政府（國民政府）及其軍隊（國統區）。戰時後方在重慶，戰後接收華北、東北、台灣與南海諸島。',
            population='國統區人口沒有與解放區可比的同時統計；全國總人口通常以1953年第一次普查6.02億回溯為約4.5億以上。',
            military=f'兵力（萬人）：{strength_lines}。國民黨方面（國防部）的統計口徑不同，含正規軍、非正規與後勤機關，'
                     '兩側數字不能直接相減。',
            economy='戰後接收、通貨膨脹（法幣到金圓券）與外債是1948–49年財政崩解的主線。',
            politics='1946年制憲國民大會與《中華民國憲法》（1947年施行）、1948年動員戡亂時期臨時條款。',
            source='郭廷以《中華民國史事日誌》；《中華民國憲法》（1947年）；國防部統計（口徑與解放軍統計不同）',
            disputed=True,
        ),
        'soviet': dict(
            eraIntro='蘇聯紅軍在東北的佔領（1945年8月–1946年），依《中蘇友好同盟條約》及其換文行事。',
            population='佔領區人口無獨立統計。',
            military='遠東紅軍在滿洲的兵力與撤兵計劃（1946年2–5月分階段撤出）。',
            economy='東北工業設備的拆運與中蘇經濟合作在研究中爭議持續。',
            politics='條約框架下的外蒙古公投、東北接收與國共進入東北的時間差。',
            source='《中蘇友好同盟條約》（1945年8月14日）及換文；蘇軍撤兵計劃（1946年）',
            disputed=True,
        ),
        'contested': dict(
            eraIntro='拉鋸區：國軍控制城市與交通線、解放區控制鄉村的地帶，不是第三個政權。',
            population='拉鋸區戶籍在戰時無法統計。',
            military='這些地帶反覆易手，兵力隨戰役變動。',
            economy='戰爭破壞、徵糧與通貨在拉鋸區最難有可靠數字。',
            politics='名義行政與實際控制分離，是內戰地圖最容易被誤讀的一層。',
            source='《中國人民解放軍戰史》第三卷；郭廷以《中華民國史事日誌》',
            disputed=True,
        ),
    }
    out.append('  profiles: {')
    for fid, meta in profiles.items():
        out.append('    ' + fid + ': {')
        for k, v in meta.items():
            out.append(f'      {k}: {json.dumps(v, ensure_ascii=False)},')
        out.append('    },')
    out.append('  },')
    out.append('  people: [')
    for i, p in enumerate(PEOPLE):
        out.append('    {')
        out.append(f"      id: 'cw-p{i:02d}', name: {json.dumps(p['name'], ensure_ascii=False)},")
        out.append(f"      faction: '{p['side']}', role: {json.dumps(p['role'], ensure_ascii=False)},")
        out.append('      activeFrom: 1945, activeTo: 1949,')
        out.append(f"      summary: {json.dumps(p['role'], ensure_ascii=False)},")
        out.append(f"      source: {json.dumps(p['source'], ensure_ascii=False)},")
        out.append('    },')
    out.append('  ],')
    out.append('}')
    path.write_text('\n'.join(out) + '\n', encoding='utf8')
    print(f'pack -> {path}: {n_snap} monthly snapshots, {len(FRONTS)} routes, '
          f'{len(MAJOR_EVENTS) + len(CITIES) + len(FRONTS)} events, {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    emit_pack(ROOT / 'src/imperial/data/civilWarPack.ts')
