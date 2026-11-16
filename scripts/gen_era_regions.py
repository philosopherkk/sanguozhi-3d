#!/usr/bin/env python3
"""Land-clipped historical ranges on the China (1968×1567) and Japan (1482×1477) reliefs.

Polygons are dynasty-era schematic outlines in lon/lat. They are clipped to the
relief coastline only. They are not the Eastern Han / Three Kingdoms province
rings, and those rings are not subtracted.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import tighten_land_borders as tlb  # noqa: E402

W, H = 1968, 1567
JP_W, JP_H = 1482, 1477

# Xinjiang / 漠北 (Outer Mongolia) frontier shared by two rings so they neither
# overlap nor leave a gap: the Altai spine drops from the 友誼峰 tripoint to the
# 馬鬃山 end. Landmarks that must fall on the 新疆 side: 哈巴河 86.4E,48.1N；
# 布爾津 87.5E,47.7N；阿勒泰 88.1E,47.8N；富蘊 89.5E,47.0N；青河 90.4E,46.6N；
# 哈密 93.5E,42.8N. On the 漠北 side: 烏列蓋 89.9E,48.98N；科布多 91.6E,48.0N.
XJ_MG_BORDER: list[tuple[float, float]] = [
    (89.5, 49.2), (90.2, 47.4), (91.5, 46.6), (93.5, 45.2),
    (95.2, 43.8), (96.3, 42.8),
]

# (lon, lat) lists. Coasts are finished by the land mask, not by these vertices.
POLYS: dict[str, list[tuple[float, float]]] = {
    "hlj": [
        # 黑龍江：北界黑龍江—烏蘇里江江道（額爾古納大灣至伯力口），西界大興安嶺主脊，
        # 南界松花江—嫩江平原分水（哈爾濱在內，長春・齊齊哈爾南界外推），東循烏蘇里江。
        (121.5, 53.35), (123.3, 53.5), (125.2, 53.2), (127.0, 52.6), (128.6, 51.6),
        (130.0, 50.6), (131.8, 49.4), (133.4, 48.6), (135.0, 48.4), (134.2, 47.4),
        (132.8, 47.3), (131.2, 47.5), (131.3, 46.6), (131.0, 45.4), (129.4, 45.05),
        (127.2, 45.0), (126.3, 45.6), (125.2, 46.3), (124.2, 46.8), (123.2, 47.2),
        (122.6, 48.2), (121.9, 49.2), (121.6, 50.2), (121.4, 51.3), (121.0, 52.3),
    ],
    "jl": [
        # 吉林：北界松花江谷地（長春・吉林在內），西界大興安嶺東麓分界，
        # 南界鴨綠江源—長白山脊（通化在內），東界圖們江上游分水。
        (121.9, 46.05), (122.5, 45.55), (123.2, 45.28), (124.2, 45.4), (125.2, 45.2),
        (126.8, 45.25),
        (128.0, 45.2), (129.0, 45.3), (130.2, 45.35), (131.0, 45.2), (131.2, 44.3),
        (131.2, 43.2), (130.6, 42.9), (130.0, 42.6), (129.2, 42.2), (128.2, 41.9),
        (127.0, 41.5), (125.6, 41.4), (124.6, 41.8), (123.4, 42.4), (123.0, 43.2),
        (122.6, 44.2), (122.4, 45.2),
    ],
    "ln": [
        (119.6, 41.4), (122.2, 42.6), (124.8, 43.0), (125.4, 41.5),
        (124.2, 40.0), (123.6, 39.6), (122.6, 39.15), (121.2, 38.65),
        (120.8, 39.3), (120.6, 40.4), (119.6, 40.8),
    ],
    "rehe": [
        # 熱河：南界沿燕山長城（古北口—喜峰口），北包昭烏達、卓索頓兩盟，東及努魯兒虎山（阜新屬土默特）。示意。
        (115.6, 40.9), (115.35, 41.35), (115.4, 41.8), (115.55, 42.2),
        (116.0, 42.6), (116.9, 42.85), (117.9, 43.05), (119.0, 42.9),
        (119.8, 42.6), (120.3, 42.4), (121.55, 42.05), (120.7, 41.35),
        (119.9, 40.85), (118.9, 40.55), (118.3, 40.4), (117.6, 40.5),
        (117.05, 40.72), (116.3, 40.85),
    ],
    "zhili": [
        # 直隸：西界太行主脊—山西界（廣靈・陽高屬山西大同府，不屬直隸）。行政界示意。
        (114.55, 39.62), (114.62, 40.15), (115.0, 40.7), (116.6, 40.5), (117.8, 40.2),
        (119.2, 39.5), (119.4, 38.6), (118.2, 38.0), (117.4, 38.2),
        (116.6, 37.4), (115.0, 36.4), (114.0, 36.2), (113.5, 37.0),
        (113.6, 38.4),
    ],
    "youyun": [
        # 幽薊：北界燕山主脊（居庸—古北口—山海關在內），西界太行主脊（蔚州不屬，
        # 恒山以東廣靈・靈丘屬代／雁門不屬幽），南界拒馬河—唐河低線（北京在內，保定・天津不屬），東循灤河下游至海。
        (114.5, 39.62), (114.6, 40.2), (114.55, 40.6), (114.5, 41.15),
        (115.6, 41.4), (116.9, 41.3), (118.0, 41.35), (119.2, 41.0),
        (119.9, 40.45), (119.8, 39.95), (119.65, 39.7), (118.3, 39.5),
        (116.6, 39.45), (115.0, 39.55),
    ],
    "shandong": [
        (115.5, 37.6), (117.4, 38.2), (118.8, 38.15), (120.2, 37.8),
        (122.5, 37.45), (122.3, 36.7), (120.6, 36.15), (119.4, 35.1),
        (118.0, 34.85), (116.6, 35.0), (115.6, 35.8), (115.3, 36.8),
    ],
    "henan": [
        (110.5, 34.9), (112.0, 35.4), (113.6, 36.3), (115.2, 36.2),
        (116.3, 35.6), (116.3, 34.6), (115.4, 33.8), (114.4, 32.6),
        (112.4, 32.5), (111.0, 33.3), (110.3, 33.8), (110.3, 34.5),
    ],
    "shanxi": [
        # 山西：西北南三面阻河（府谷—壺口—龍門—潼關—三門），東界太行主脊（恒山以東廣靈・陽高屬代／雁門在內）；南及大河。示意自然界。
        (110.9, 40.0), (111.4, 40.5), (112.3, 40.7), (113.1, 40.6),
        (114.4, 40.68), (114.62, 40.3), (114.6, 39.78), (114.35, 39.42), (113.95, 39.0),
        (113.8, 38.9),
        (114.2, 38.3), (113.8, 37.8), (114.0, 37.2), (113.6, 36.6),
        (113.9, 36.0), (113.0, 35.2), (112.0, 34.9), (111.2, 34.8),
        (110.5, 34.8), (110.5, 35.4), (110.6, 36.0), (110.4, 36.6),
        (110.6, 37.2), (110.5, 37.8), (110.5, 38.4), (110.3, 39.0),
        (110.4, 39.6),
    ],
    "shanxi_n_range": [
        # 山西（陝嶺山脈以北）：南界循陝嶺山脈—雁門山主脊（平頭—雁門—陝嶺關；
        # 太原・忻州・代縣不屬，大同・朔州・廣靈在內），北・東循山西外界。
        (110.35, 39.55), (110.9, 39.45), (111.6, 39.6), (112.2, 39.5), (112.55, 39.15),
        (112.9, 39.35), (113.5, 39.65), (114.1, 39.55), (114.62, 39.68), (114.66, 40.1),
        (114.35, 40.65), (112.3, 40.75), (111.4, 40.6), (110.4, 40.0), (110.25, 39.8),
    ],
    "shaanxi": [
        # 陝西：北界明長城（定邊—神木），東界循黃河（府谷—佳縣—吳堡—壺口—龍門—潼關），南界秦嶺—巴山，西界秦嶺—隴山分水（天水・固原不屬）；漢中別有環不奪。
        (108.5, 39.4), (109.4, 39.4), (110.3, 39.4), (110.5, 38.9),
        (110.45, 38.3), (110.55, 37.85), (110.6, 37.4), (110.35, 36.95),
        (110.3, 36.55), (110.4, 36.0), (110.5, 35.45), (110.15, 35.0),
        (110.35, 34.55), (110.2, 34.1), (110.2, 33.3), (109.6, 33.0),
        (108.9, 32.5), (108.4, 32.7), (107.9, 33.0), (107.4, 33.3),
        (106.7, 33.1), (106.3, 33.45), (106.45, 33.9), (106.6, 34.35),
        (106.5, 34.8), (106.9, 35.05), (107.6, 35.3), (107.85, 35.75),
        (108.0, 36.15), (108.0, 36.6), (108.1, 37.05), (108.1, 37.4),
        (107.8, 37.7), (107.55, 38.0), (107.7, 38.35), (108.15, 38.85),
    ],
    "yanan": [
        # 陝西北部（延安）：北界長城（靖邊—安塞北），東界黃河（吳堡—清澗—宜川壺口），西界子午嶺。示意。
        (107.5, 37.7), (108.2, 37.95), (109.0, 37.95), (109.8, 37.85),
        (110.3, 37.55), (110.6, 37.15), (110.45, 36.8), (110.3, 36.45),
        (110.6, 36.1), (110.2, 35.95), (109.5, 35.85), (108.8, 35.95),
        (108.2, 36.25), (107.8, 36.6), (107.4, 37.1),
    ],
    "gansu": [
        (93.2, 40.4), (96.2, 42.2), (100.2, 41.2), (103.6, 39.0),
        (104.8, 37.0), (106.4, 36.0), (106.2, 34.6), (104.2, 33.6),
        (101.6, 33.8), (98.2, 39.4), (94.6, 39.6),
    ],
    "ningxia": [
        # 寧夏：賀蘭山以東引河灌溉之河套東岸平原（銀川—石嘴山—吳忠），南循六盤山（固原），北抵大河。示意。
        (105.4, 38.6), (105.5, 39.0), (105.9, 39.3), (106.5, 39.35),
        (107.0, 39.2), (107.3, 38.7), (107.35, 38.1), (107.2, 37.5),
        (106.9, 36.9), (106.6, 36.4), (106.4, 35.9), (106.0, 35.6),
        (105.5, 35.7), (105.15, 36.15), (104.9, 36.65), (104.85, 37.1),
        (104.95, 37.5), (105.3, 37.9),
    ],
    # 青海高原，用來接通新疆、西藏、河西與四川。不是只圈西寧。
    "qinghai": [
        (89.5, 39.3), (95.2, 39.6), (99.2, 39.1), (102.8, 38.2),
        (103.5, 36.3), (102.6, 34.4), (101.2, 32.6), (97.8, 31.9),
        (94.2, 32.3), (91.2, 33.8), (89.6, 36.4),
    ],
    "xinjiang": [
        (73.6, 39.2), (73.6, 42.2), (80.5, 45.4),
        (85.0, 47.2), (86.6, 48.4), (87.6, 49.1),
        *XJ_MG_BORDER,
        (93.6, 38.8), (88.5, 36.2), (80.0, 35.4), (75.5, 36.6), (73.5, 38.2),
    ],
    "tibet": [
        # 青藏高原本體：北界崑崙山—布喀哈希山嶺至阿尼瑪卿山，循柴達木盆地南緣（格爾木在盆地南緣不屬），
        # 東界巴顏喀山東麓—橫斷山分水（昌都・玉樹在內，康定在大渡河以東不屬），
        # 南界喜馬拉雅山，西界喀喇崑崙—羌坦格山口。高原自然區示意，非歷代行政界。
        (78.8, 31.3), (79.5, 34.2), (82.5, 35.2), (85.5, 36.2), (89.5, 36.2),
        (91.5, 36.0), (94.5, 35.8), (95.8, 35.2), (97.2, 34.6), (98.1, 33.6),
        (98.5, 31.3), (98.8, 30.3), (98.4, 29.3), (97.6, 28.4), (97.0, 27.6),
        (95.5, 28.1), (93.5, 28.4), (91.0, 27.7), (88.0, 27.6), (85.0, 28.2),
        (82.0, 29.0), (79.5, 30.4),
    ],
    "sichuan": [
        # 四川（益州）：盆地為界——北阻米倉大巴（廣元留門內），東界三峽口，南界雲貴高原北緣，西抵龍門山。示意。
        (103.9, 32.6), (104.6, 32.7), (105.4, 32.6), (106.0, 32.55),
        (106.6, 32.4), (107.2, 32.3), (107.9, 32.2), (108.5, 32.1),
        (108.7, 31.5), (108.9, 31.0), (108.8, 30.4), (108.9, 29.8),
        (108.7, 29.3), (108.4, 28.7), (107.9, 28.2), (107.2, 27.9),
        (106.2, 27.8), (105.2, 27.8), (104.4, 27.9), (103.7, 28.2),
        (103.2, 28.8), (102.9, 29.5), (102.8, 30.3), (102.9, 31.0),
        (103.2, 31.6), (103.5, 32.1),
    ],
    "yunnan": [
        (97.8, 28.3), (100.4, 28.4), (102.6, 28.0), (104.4, 27.2),
        (105.6, 25.8), (106.2, 24.2), (105.6, 22.8), (103.2, 22.4),
        (101.2, 21.8), (99.0, 22.6), (97.6, 24.2), (97.5, 26.6),
    ],
    "guizhou": [
        # 貴州：山川形勢——北界赤水河—桐梓河（赤水・桐梓在內，瀘州・武隆不屬）、
        # 東北萬山—武陵山山脊（銅仁在內，懷化不屬）、南界南盤江—紅水河（興義在內）、
        # 西界北盤江—威寧高原（昆明・曲靖不屬）。
        (103.7, 26.4), (103.75, 27.1), (104.05, 27.8), (104.6, 28.35),
        (105.2, 28.62), (105.75, 28.85), (106.4, 28.95), (107.0, 29.15),
        (107.5, 29.05), (108.1, 28.95), (108.5, 28.8), (109.0, 28.55),
        (109.35, 28.3), (109.45, 27.55), (109.3, 26.95), (109.15, 26.35),
        (108.95, 25.9), (108.5, 25.25), (108.0, 24.85), (107.4, 24.6),
        (106.7, 24.45), (106.1, 24.7), (105.4, 24.6), (104.7, 24.4),
        (104.3, 24.55), (103.9, 25.05), (103.6, 25.9),
    ],
    "guangxi": [
        (104.6, 26.2), (107.6, 26.3), (110.4, 26.15), (111.6, 25.4),
        (111.8, 23.4), (110.2, 21.6), (108.0, 21.6), (106.4, 22.3),
        (105.0, 23.6), (104.4, 24.8),
    ],
    "guangdong": [
        (110.0, 23.8), (111.8, 24.8), (113.8, 25.2), (115.6, 24.5),
        (117.0, 23.6), (116.8, 22.8), (114.6, 22.2), (113.0, 21.8),
        (111.0, 21.4), (109.8, 21.5), (109.7, 22.6),
    ],
    "hunan": [
        (109.2, 29.6), (111.4, 30.1), (113.4, 29.6), (114.2, 28.8),
        (114.0, 26.4), (113.0, 25.0), (111.2, 24.7), (109.6, 25.2),
        (109.0, 26.8), (108.8, 28.4),
    ],
    "hubei": [
        (108.8, 32.8), (111.2, 33.1), (112.8, 32.4), (114.4, 32.2),
        (115.6, 31.0), (115.6, 30.0), (114.4, 29.5), (112.6, 29.4),
        (110.6, 29.8), (109.2, 30.6), (108.6, 31.6),
    ],
    "hubei_n_box": [
        (110.6, 32.8), (114.2, 32.8), (114.2, 31.35), (110.6, 31.35),
    ],
    "jiangxi": [
        # 江西：鄱陽湖盆地——北界大江，西循羅霄東麓，南越大庾嶺，東界武夷・玉山（饒州・上饒在內）。示意。
        (114.4, 29.9), (115.1, 30.0), (115.9, 29.95), (116.5, 29.8),
        (117.0, 29.6), (117.4, 29.3), (117.75, 29.05), (118.05, 28.7),
        (118.15, 28.25), (117.6, 27.5), (117.1, 27.0), (116.8, 26.8),
        (116.4, 26.1), (115.9, 25.4), (115.2, 24.9), (114.5, 24.7),
        (114.0, 25.1), (113.9, 25.7), (114.1, 26.4), (114.0, 27.1),
        (114.2, 27.8), (114.0, 28.4), (113.9, 29.0), (114.0, 29.5),
    ],
    "anhui_n": [
        # 皖北（淮北）：南界循淮河道（阜陽—蚌埠—北淝河），北循廢黃河道（通灣—碭山）為界，
        # 東繞天長（高郵不屬），西循永城—亳縣線。山川形勢示意。
        (115.25, 34.4), (115.9, 34.5), (116.5, 34.45), (117.1, 34.3), (117.6, 34.0),
        (118.1, 33.6), (118.5, 33.2), (118.7, 32.95), (119.25, 32.78), (119.0, 32.5),
        (118.55, 32.45), (118.2, 32.55), (117.7, 32.6), (117.2, 32.62), (116.7, 32.5),
        (116.2, 32.62), (115.8, 32.8), (115.45, 32.85), (115.15, 33.3), (115.15, 33.9),
    ],
    "anhui_s": [
        # 皖南（江淮—皖南）：北循淮河道，西越大別山（霍山・岳西在內），
        # 南循長江—大鄣山山脊—天目山（婺源・開化在內，景德鎮不屬），
        # 東自高郵湖西岸—老山—溧陽界（六合・和縣（蘇）不屬）。山川形勢示意。
        (115.2, 32.85), (115.8, 32.8), (116.2, 32.62), (116.7, 32.5), (117.2, 32.62),
        (117.7, 32.6), (118.2, 32.55), (118.55, 32.45), (118.65, 32.25), (118.6, 32.05),
        (118.7, 31.8), (118.7, 31.55), (118.85, 31.3), (119.1, 31.15), (119.25, 30.95),
        (119.1, 30.55), (118.95, 30.2), (118.85, 29.85), (118.7, 29.5), (118.55, 29.15),
        (118.35, 29.02), (118.0, 28.98), (117.6, 29.1), (117.3, 29.42), (117.0, 29.55),
        (116.8, 29.75), (116.55, 30.0), (116.1, 30.05), (116.0, 30.4), (115.75, 30.9),
        (115.55, 31.4), (115.3, 31.9), (115.15, 32.4),
    ],
    "jiangsu_n": [
        # 蘇北（淮海）：西界循皖蘇界——天長・滁州屬皖（界在天長以東），高郵湖西岸以東屬蘇（高郵在內）。行政界示意。
        (116.5, 34.9), (119.5, 34.7), (120.5, 33.5), (119.7, 32.35),
        (118.6, 32.3), (119.0, 32.5), (119.25, 32.78), (119.52, 33.02),
        (119.45, 33.32), (119.05, 33.45), (118.5, 33.5), (116.8, 33.6), (116.3, 34.3),
    ],
    "jiangsu_s": [
        # 蘇南（江南）：西界循皖蘇界——馬鞍山・蕪湖屬皖（界在和縣—江寧間，六合在內）。行政界示意。
        (118.62, 32.3), (119.8, 32.45), (121.3, 32.05), (121.8, 31.3),
        (121.0, 30.95), (119.4, 31.35), (118.85, 31.5), (118.7, 31.7), (118.62, 31.95),
    ],
    "zhejiang_n": [
        (118.6, 31.15), (120.4, 31.05), (121.6, 30.55), (121.4, 29.95),
        (120.0, 29.85), (118.8, 30.25),
    ],
    "zhejiang_s": [
        # 浙南（溫台處）：西界循閩贛・閩浙界（武夷山—仙霞嶺以東；開化・常山在內，浦江・龍游屬浙）。行政界示意。
        (118.75, 29.95), (120.2, 29.9), (122.0, 28.8), (121.4, 27.2),
        (119.8, 27.4), (119.0, 27.6), (118.6, 28.0), (118.45, 28.5), (118.5, 28.95),
        (118.62, 29.35), (118.72, 29.7),
    ],
    "fujian": [
        (116.0, 27.3), (117.6, 27.5), (118.8, 27.0), (119.8, 26.2),
        (119.7, 25.0), (118.4, 24.2), (117.2, 23.7), (116.2, 24.3),
        (115.7, 25.4), (115.8, 26.5),
    ],
    "chahar": [
        (112.6, 42.2), (116.2, 42.3), (116.6, 40.8), (115.0, 40.15),
        (113.2, 40.3), (112.4, 41.1),
    ],
    "suiyuan": [
        (107.0, 41.9), (112.4, 42.1), (112.8, 40.5), (110.0, 40.0),
        (107.6, 40.2), (106.6, 41.0),
    ],
    "neimeng_w": [
        (97.5, 42.6), (106.5, 42.8), (107.2, 40.4), (104.2, 37.8),
        (100.5, 39.2), (97.2, 40.6),
    ],
    # 漠北（外蒙古）。西界與 xinjiang 共用 XJ_MG_BORDER：兩塊相鄰不留縫也不重疊，
    # 科布多盆地因此歸漠北，不再被新疆色塊吃掉；甘肅北端的馬鬃山一帶也不再塗成漠北。
    "steppe": [
        *reversed(XJ_MG_BORDER),
        (104.0, 49.5), (106.5, 49.9), (109.0, 50.3), (112.0, 50.5), (114.5, 50.3),
        (117.0, 49.8), (120.0, 49.0), (121.3, 48.5), (122.5, 47.6), (124.0, 46.5),
        (123.0, 45.6), (122.0, 44.8), (120.5, 44.2), (119.0, 43.6), (118.0, 43.2),
        (116.2, 43.0), (114.5, 42.7), (112.8, 42.4), (111.0, 42.3), (109.5, 42.1),
        (108.0, 42.2), (106.0, 42.2), (104.0, 42.1), (102.0, 42.1), (100.0, 42.2),
        (98.0, 42.0),
    ],
    "yiluo": [
        (110.9, 35.05), (112.4, 35.15), (113.5, 34.85), (113.45, 34.2),
        (112.2, 33.85), (111.0, 34.15),
    ],
    "shang_yin": [
        (111.6, 36.9), (114.0, 37.5), (116.6, 37.15), (117.5, 35.9),
        (116.4, 34.5), (114.2, 33.95), (112.0, 34.35), (111.2, 35.5),
    ],
    "zhou_wei": [
        (106.7, 35.05), (108.8, 35.25), (110.3, 34.85), (110.45, 34.15),
        (108.6, 33.9), (106.6, 34.25),
    ],
    "zhou_luoyi": [
        # 成周洛邑王畿：北阻大河（孟津），東界虎牢，南界闕塞嵩高，西及新安（《書·召誥》卜澗水東瀍水西大意）。示意。
        (112.1, 34.75), (112.2, 34.93), (112.5, 34.98), (112.85, 34.92),
        (113.15, 34.88), (113.45, 34.78), (113.5, 34.55), (113.2, 34.4),
        (112.85, 34.38), (112.55, 34.42), (112.3, 34.5), (112.12, 34.58),
        (112.05, 34.65),
    ],
    "linzi": [
        (117.6, 37.25), (118.9, 37.35), (119.0, 36.45), (117.7, 36.35),
    ],
    "qi": [
        (116.7, 37.5), (118.4, 38.05), (120.6, 37.85), (122.4, 37.3),
        (122.0, 36.55), (120.0, 36.3), (118.2, 36.15), (117.2, 36.45),
        (116.5, 36.8),
    ],
    "qi_east_box": [
        (119.6, 37.9), (122.7, 37.9), (122.7, 36.4), (119.6, 36.4),
    ],
    "lu": [
        # 魯（春秋）：泰山之陽、汶泗之野，東及費，南及鄒滕，西循汶水。地望示意。
        (116.35, 35.8), (116.5, 36.02), (116.85, 36.18), (117.15, 36.25),
        (117.55, 36.08), (117.85, 35.8), (117.9, 35.5), (117.6, 35.2),
        (117.2, 35.02), (116.85, 35.05), (116.55, 35.25), (116.4, 35.5),
        (116.3, 35.65),
    ],
    "yan_early": [
        (115.1, 41.05), (117.6, 41.2), (119.15, 40.45), (119.0, 39.55),
        (116.6, 39.35), (115.0, 39.85),
    ],
    "chu_early": [
        (110.0, 32.35), (112.8, 32.5), (113.7, 31.35), (112.9, 30.15),
        (111.0, 29.95), (109.7, 30.85),
    ],
    "jin_quwo": [
        (110.35, 37.25), (112.15, 37.4), (112.65, 35.7), (111.35, 35.05),
        (110.25, 35.4), (110.15, 36.4),
    ],
    "qin_guanzhong": [
        # 關中：南界秦嶺主脊（商洛在上洛山間不屬），北界渭北台地南麓（堯山—驪山），
        # 東界黃河三門峽口（潼關在內），西界隴山（寶雞在內，隴縣・天水不屬）。山川形勢示意。
        (106.85, 34.45), (107.0, 34.9), (107.6, 34.95), (108.3, 35.0), (109.0, 34.98),
        (109.8, 34.92), (110.3, 34.82), (110.35, 34.5), (110.1, 34.2), (109.6, 33.92),
        (109.0, 33.85), (108.4, 33.88), (107.8, 33.95), (107.3, 34.08), (106.9, 34.2),
    ],
    "hanzhong": [
        (105.6, 33.45), (108.4, 33.5), (109.0, 32.55), (106.6, 32.35),
        (105.4, 32.85),
    ],
    "wu_delta": [
        (119.0, 32.25), (121.5, 32.1), (121.8, 31.05), (120.6, 30.55),
        (119.2, 30.85), (118.6, 31.5),
    ],
    "yue_zhe": [
        (119.4, 30.45), (121.5, 30.45), (122.1, 29.1), (121.0, 28.5),
        (119.8, 28.85), (119.2, 29.7),
    ],
    "han_state": [
        (111.6, 35.15), (113.5, 35.05), (114.3, 34.15), (113.4, 33.35),
        (112.0, 33.5), (111.2, 34.25),
    ],
    "wei_daliang": [
        (113.5, 36.05), (115.6, 36.05), (115.7, 34.55), (114.0, 34.4),
        (113.2, 35.05),
    ],
    "wei_hedong": [
        (110.25, 35.85), (111.7, 35.9), (111.9, 34.95), (110.5, 34.8),
        (110.1, 35.3),
    ],
    "zhao_handan": [
        (113.6, 38.3), (115.4, 38.45), (115.5, 36.35), (114.0, 36.2),
        (113.4, 37.2),
    ],
    "zhao_dai": [
        (110.5, 40.3), (113.8, 40.35), (114.0, 38.15), (111.2, 37.85),
        (110.3, 38.7),
    ],
    "longxi": [
        (103.6, 35.6), (106.2, 35.7), (106.6, 34.2), (104.2, 33.8),
        (103.2, 34.6),
    ],
    "xia_yin": [
        (107.6, 38.7), (109.8, 38.9), (110.2, 37.5), (108.2, 37.2),
        (107.2, 37.8),
    ],
    "hexie": [
        (94.2, 40.6), (98.5, 41.4), (102.2, 39.2), (103.8, 37.6),
        (102.4, 36.4), (98.6, 39.2), (95.0, 39.6),
    ],
    "jingnan": [
        (111.15, 30.95), (113.05, 31.0), (113.15, 29.55), (111.2, 29.45),
    ],
    "annam": [
        (104.0, 22.5), (107.8, 22.5), (108.2, 20.5), (105.0, 20.3),
        (103.6, 21.2),
    ],
    # 高麗（918–1392）。北界以鴨綠江為遼、金之界：自海口溯江至楚山後折向長白北麓；
    # 義州（保州）自 993 年後入遼, 故北界取江之南岸（《高麗史·地理志》；
    # 《遼史·聖宗紀》三舉高麗、保州之爭）。東海岸以北德源一帶屬女直, 不取。
    "goryeo": [
        (124.40, 40.02), (125.05, 40.30), (125.60, 40.55), (126.05, 40.72),
        (126.23, 41.05), (126.75, 41.10), (127.30, 40.50), (127.90, 40.10),
        (128.25, 39.80), (128.45, 39.30), (128.50, 38.50), (128.55, 37.60),
        (129.10, 36.90), (129.55, 36.05), (129.45, 35.15), (129.10, 34.95),
        (128.30, 34.75), (127.40, 34.45), (126.50, 34.35), (126.20, 35.10),
        (126.35, 36.30), (126.55, 37.15), (126.40, 37.80), (125.95, 38.35),
        (125.45, 38.85), (124.90, 39.45), (124.60, 39.85),
    ],
    # 大越（968 丁部領稱帝至 1225 禪於陳, 《宋史·交阯傳》；《大越史記全書》）。
    # 北界取順州（高平）以南：順州 1059 年宋始置, 1084 年還屬大越（《宋史·交阯傳》
    # 郭逵之役）, 遼宋快照年份不畫。南界取橫山（1069 年前占城之界, 《宋史·占城傳》）。
    # 西界為山僚, 只畫示意上限。
    "daiyue": [
        (102.90, 22.30), (103.90, 22.75), (105.35, 22.90), (106.35, 22.85),
        (107.00, 22.05), (107.95, 21.50), (108.15, 20.70), (108.15, 19.60),
        (107.90, 18.90), (107.35, 18.30), (106.60, 18.25), (105.90, 19.00),
        (105.30, 19.90), (104.80, 20.60), (104.00, 21.10), (103.40, 21.50),
    ],
    "tang_anbei": [
        (96.0, 44.5), (100.0, 52.5), (108.0, 53.2), (116.0, 50.5),
        (119.0, 47.0), (116.0, 43.4), (108.0, 42.6), (100.0, 43.0),
    ],
    "tang_beiting": [
        (80.0, 43.5), (80.0, 48.0), (88.0, 48.2), (94.8, 47.0),
        (95.5, 44.0), (90.0, 43.0), (84.0, 42.9),
    ],
    "tang_anxi": [
        (74.0, 43.2), (80.0, 44.4), (88.0, 43.8), (94.0, 42.0),
        (94.5, 39.2), (90.0, 36.2), (82.0, 35.6), (76.0, 37.2),
        (73.8, 40.2),
    ],
    "tang_yalu": [
        (119.4, 40.0), (122.0, 43.2), (125.8, 43.2), (126.6, 41.6),
        (125.2, 39.8), (122.6, 38.9), (120.2, 39.0),
    ],
    "tang_silla": [
        (128.0, 35.0), (129.7, 35.2), (129.8, 37.0), (128.1, 36.8),
    ],
    "tang_hehuang": [
        (100.6, 37.2), (103.2, 37.0), (103.4, 35.4), (101.0, 35.0),
        (99.8, 36.0),
    ],
}


def poly_mask(lonlat: list[tuple[float, float]]) -> np.ndarray:
    pts = [tlb.china_px(lat, lon, W, H) for lon, lat in lonlat]
    return tlb.raster_polygon(W, H, pts)


def _seg_x(p1, p2, p3, p4):
    # 與 scripts/audit_war_shape.mjs 嘅 segInt 完全同口徑（符號法，端點觸碰亦算）
    d1 = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0])
    d2 = (p2[0] - p1[0]) * (p4[1] - p1[1]) - (p2[1] - p1[1]) * (p4[0] - p1[0])
    d3 = (p3[0] - p4[0]) * (p1[1] - p3[1]) - (p3[1] - p4[1]) * (p1[0] - p3[0])
    d4 = (p3[0] - p4[0]) * (p2[1] - p3[1]) - (p3[1] - p4[1]) * (p2[0] - p3[0])
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))


def _ring_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def dehook(ring):
    # DP 簡化喺 raster 狹頸（湖濕地 1px 陸橋）會產生自我相交嘅小鉤；
    # 逐個移除較細嘅交叉子環（以直弦跨過狹頸），示意幾何不影響歸屬 hit-test。
    pts = [(float(x), float(y)) for x, y in ring]
    for _ in range(24):
        n = len(pts)
        cut = None
        for i in range(n):
            for j in range(i + 2, n):
                if i == 0 and j == n - 1:
                    continue
                if _seg_x(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]):
                    loop_a = pts[i + 1 : j + 1]
                    loop_b = pts[j + 1 :] + pts[: i + 1]
                    if _ring_area(loop_a) <= _ring_area(loop_b):
                        cut = ("a", i, j)
                    else:
                        cut = ("b", i, j)
                    break
            if cut:
                break
        if not cut:
            break
        kind, i, j = cut
        if kind == "a":
            pts = pts[: i + 1] + pts[j + 1 :]
        else:
            pts = pts[i + 1 : j + 1]
        if len(pts) < 4:
            break
    return pts


def rings_from(mask: np.ndarray, min_area: int, eps: float, keep: int = 6):
    found = []
    for ring in tlb.contours(mask):
        if abs(tlb.ring_area(ring)) < min_area:
            continue
        simp = tlb.simplify(ring, eps)
        if len(simp) < 4:
            continue
        simp = dehook(simp)
        if len(simp) < 4:
            continue
        found.append([[round(x, 1), round(y, 1)] for x, y in simp])
    found.sort(key=lambda r: -abs(tlb.ring_area(r)))
    return found[:keep]


def box_mask(lon0, lat0, lon1, lat1, proj, w, h, n=20) -> np.ndarray:
    edge = []
    for i in range(n):
        t = i / (n - 1)
        edge.append((lon0 + (lon1 - lon0) * t, lat0))
    for i in range(1, n):
        t = i / (n - 1)
        edge.append((lon1, lat0 + (lat1 - lat0) * t))
    for i in range(1, n):
        t = i / (n - 1)
        edge.append((lon1 - (lon1 - lon0) * t, lat1))
    for i in range(1, n - 1):
        t = i / (n - 1)
        edge.append((lon0, lat1 - (lat1 - lat0) * t))
    pts = [proj(lat, lon, w, h) for lon, lat in edge]
    return tlb.raster_polygon(w, h, pts)


def emit_record(rings: dict[str, list]) -> str:
    body = json.dumps(rings, ensure_ascii=False, separators=(",", ":"))
    return body


def main() -> None:
    china = Image.open(ROOT / "public/maps/china_edcp_relief.jpg").convert("RGB")
    china = china.resize((W, H), Image.Resampling.BOX)
    land = tlb.land_mask(china, "china")

    masks: dict[str, np.ndarray] = {}
    for name, poly in POLYS.items():
        masks[name] = poly_mask(poly) & land

    masks["zhili"] = masks["zhili"] & ~masks["rehe"]
    masks["youyun"] = masks["youyun"] & land
    masks["hebei_song"] = masks["zhili"] & ~masks["youyun"]
    masks["shanxi_n"] = masks["shanxi"] & masks["shanxi_n_range"]
    masks["shanxi_s"] = masks["shanxi"] & ~masks["shanxi_n"]
    masks["shanxi_song"] = masks["shanxi"] & ~masks["youyun"]
    masks["shaanxi"] = masks["shaanxi"] & ~masks["hanzhong"]
    masks["qin_guanzhong"] = masks["qin_guanzhong"] & ~masks["hanzhong"]
    masks["shaanxi_rest"] = masks["shaanxi"] & ~masks["yanan"]
    masks["yanan"] = masks["yanan"] & masks["shaanxi"]
    masks["qi_west"] = masks["qi"] & ~masks["qi_east_box"]
    masks["qi_east"] = masks["qi"] & masks["qi_east_box"]
    masks["hubei_n"] = masks["hubei"] & masks["hubei_n_box"]
    masks["hubei_s"] = masks["hubei"] & ~masks["hubei_n"]
    masks["anhui"] = masks["anhui_n"] | masks["anhui_s"]
    masks["jiangsu"] = masks["jiangsu_n"] | masks["jiangsu_s"]
    masks["zhejiang"] = masks["zhejiang_n"] | masks["zhejiang_s"]
    masks["hebei"] = masks["zhili"]
    masks["gansu"] = masks["gansu"] & ~masks["qinghai"] & ~masks["ningxia"]
    masks["hunan"] = masks["hunan"] & ~masks["guangxi"]
    masks["sichuan"] = masks["sichuan"] & ~masks["tibet"]

    tw = box_mask(119.9, 21.85, 122.15, 25.45, tlb.china_px, W, H)
    hn = box_mask(108.5, 18.05, 111.25, 20.25, tlb.china_px, W, H)
    masks["taiwan"] = tw & land
    masks["hainan"] = hn & land

    # 封縫時不走進朝鮮、日本或越南北部。各省遮罩保持原樣，不互相搶像素。
    korea = box_mask(125.7, 34.0, 131.5, 43.5, tlb.china_px, W, H)
    japan_side = box_mask(127.8, 30.2, 146.0, 46.0, tlb.china_px, W, H)
    vietnam = box_mask(102.0, 16.0, 108.3, 21.25, tlb.china_px, W, H)
    grow_land = land & ~korea & ~japan_side & ~vietnam

    def fuse(names: list[str], seal: int = 36) -> np.ndarray:
        """一個政權一塊：併省之後封住髮絲縫，再裁回陸地。不跨海。"""
        merged = np.zeros(land.shape, dtype=bool)
        for name in names:
            part = masks.get(name)
            if part is not None:
                merged |= part
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (seal, seal))
        closed = cv2.morphologyEx(merged.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
        body = ((closed > 0) & grow_land) | (merged & land)
        flood = np.where(body, np.uint8(1), np.uint8(0))
        flood_mask = np.zeros((land.shape[0] + 2, land.shape[1] + 2), np.uint8)
        cv2.floodFill(flood, flood_mask, (0, 0), 2)
        holes = (flood == 0) & grow_land
        return body | holes

    agrarian = [
        "hebei", "shanxi", "shandong", "henan", "shaanxi", "hubei", "hunan",
        "jiangxi", "anhui", "jiangsu", "zhejiang", "fujian", "guangdong",
        "guangxi", "hainan", "sichuan", "hanzhong", "gansu", "ningxia",
    ]
    manchuria = ["hlj", "jl", "ln"]
    inner_m = ["rehe", "chahar", "suiyuan", "neimeng_w"]
    prc_1949 = [name for name in agrarian if name != "hainan"] + [
        "yunnan", "guizhou", "qinghai", *manchuria, *inner_m, "xinjiang",
    ]
    realms = {
        "realm_prc_1949": prc_1949,
        "realm_prc_1951": [*prc_1949, "tibet", "hainan"],
        "realm_qing_1668": [*agrarian, "yunnan", "guizhou", *manchuria, *inner_m],
        "realm_qing_high": [
            *agrarian, "yunnan", "guizhou", "qinghai", *manchuria, *inner_m,
            "steppe", "xinjiang", "tibet", "taiwan",
        ],
        "realm_ming_1368": [
            "jiangsu", "anhui", "zhejiang", "jiangxi", "hubei", "hunan",
            "fujian", "guangdong", "guangxi", "henan", "shandong", "hebei",
            "hainan",
        ],
        "realm_yuan_1368": [*manchuria, "rehe", "steppe"],
        "realm_ming_1420": [*agrarian, "yunnan", "guizhou", "ln", "annam"],
        "realm_sui_581": [
            "hebei", "shanxi", "shandong", "henan", "shaanxi", "gansu",
            "ningxia", "sichuan", "hanzhong", "hubei", "anhui_n", "jiangsu_n",
        ],
        "realm_chen_581": [
            "jiangsu_s", "anhui_s", "zhejiang", "jiangxi", "hunan", "fujian",
            "guangdong", "guangxi",
        ],
        "realm_sui_589": agrarian,
        "realm_tang_660": [
            *agrarian, "tang_anbei", "tang_beiting", "tang_anxi", "tang_yalu",
            "tang_hehuang", "annam",
        ],
        "realm_tang_701": agrarian,
        "realm_yuan_1271": [
            "hebei", "shanxi", "shandong", "henan", "shaanxi", "gansu",
            "ningxia", "qinghai", "sichuan", "yunnan", "hanzhong", *manchuria,
            "rehe", "steppe", "tibet", "xinjiang", *inner_m, "anhui_n",
            "jiangsu_n",
        ],
        "realm_song_1271": [
            "jiangsu_s", "anhui_s", "zhejiang", "jiangxi", "hubei", "hunan",
            "fujian", "guangdong", "guangxi", "hainan",
        ],
        "realm_yuan_1279": [
            *agrarian, "yunnan", "guizhou", "qinghai", *manchuria, "rehe",
            "steppe", "tibet", "xinjiang", *inner_m,
        ],
        "realm_qin_221": [
            "qin_guanzhong", "longxi", "hanzhong", "sichuan", "hubei", "hunan",
            "henan", "shanxi", "hebei", "shandong", "anhui", "jiangsu",
            "zhejiang", "jiangxi", "ln",
        ],
        "realm_qin_214": [
            "qin_guanzhong", "longxi", "hanzhong", "sichuan", "hubei", "hunan",
            "henan", "shanxi", "hebei", "shandong", "anhui", "jiangsu",
            "zhejiang", "jiangxi", "fujian", "guangdong", "guangxi", "annam",
            "ln",
        ],
        "realm_han_202": [
            "qin_guanzhong", "hanzhong", "sichuan", "hubei", "hunan", "henan",
            "shanxi", "hebei", "shandong", "anhui", "jiangsu", "zhejiang",
            "jiangxi", "ln",
        ],
        "realm_han_111": [
            "qin_guanzhong", "longxi", "gansu", "hanzhong", "sichuan", "hubei",
            "hunan", "henan", "shanxi", "hebei", "shandong", "anhui", "jiangsu",
            "zhejiang", "jiangxi", "fujian", "guangdong", "guangxi", "annam",
            "hainan", "yunnan", "ln",
        ],
        "realm_han_25": [
            "henan", "hebei", "shandong", "shanxi", "hubei", "hunan", "jiangxi",
            "anhui", "jiangsu", "zhejiang",
        ],
        "realm_han_36": [
            "qin_guanzhong", "longxi", "hanzhong", "sichuan", "hubei", "hunan",
            "henan", "shanxi", "hebei", "shandong", "anhui", "jiangsu",
            "zhejiang", "jiangxi", "fujian", "guangdong", "guangxi", "ln",
        ],
        "realm_liao": ["youyun", *manchuria, "rehe", "steppe"],
        "realm_song_1004": [
            "hebei_song", "shanxi_song", "shaanxi_rest", "henan", "shandong",
            "longxi", "sichuan", "hanzhong", "jiangsu", "anhui", "zhejiang",
            "jiangxi", "hubei", "hunan", "fujian", "guangdong", "guangxi",
            "hainan",
        ],
        "realm_jin_1141": [
            "youyun", *manchuria, "rehe", "steppe", "hebei", "shanxi",
            "shandong", "henan", "shaanxi", "anhui_n", "jiangsu_n",
        ],
        "realm_song_1141": [
            "jiangsu_s", "anhui_s", "zhejiang", "jiangxi", "hubei", "hunan",
            "fujian", "sichuan", "hanzhong", "guangdong", "guangxi", "hainan",
        ],
        "realm_qing_1644": [*manchuria, "hebei", "shandong"],
        "realm_dashun_1644": ["shaanxi", "shanxi", "henan", "sichuan"],
        "realm_ming_1644": [
            "jiangsu", "anhui", "zhejiang", "jiangxi", "hubei", "hunan",
            "fujian", "guangdong", "guangxi", "hainan", "yunnan", "guizhou",
        ],
    }
    for key, names in realms.items():
        masks[key] = fuse(names)

    small = {
        "yiluo", "zhou_luoyi", "lu", "jingnan", "yanan", "xia_yin",
        "tang_silla", "tang_hehuang", "qi_west", "qi_east", "wei_hedong",
        "hubei_n", "linzi",
    }
    out: dict[str, list] = {}
    skip = {"shanxi_n_range", "hubei_n_box", "qi_east_box"}
    for name, mask in masks.items():
        if name in skip:
            continue
        if name.startswith("realm_"):
            area_min, eps, keep = 1600, 2.6, 4
        elif name in small:
            area_min, eps, keep = 40, 1.5, 8
        else:
            area_min, eps, keep = 220, 2.2, 8
        rings = rings_from(mask, area_min, eps, keep)
        out[name] = rings
        print(f"{name:16} rings={len(rings)} pts={sum(len(r) for r in rings)}")

    header = """/** 各朝勢力範圍。像素對齊 china_edcp_relief 1968×1567。
 * 由 scripts/gen_era_regions.py 依經緯示意塊裁到陸地海岸。
 * 不是東漢三國十八州，也沒有減去 basemapProvinceRings。
 * 海岸跟底圖陸地；內陸邊是該時代的政區大勢，不是縣界。
 * 地理大勢據譚其驤精神；幾何非譚圖逐幅矢量化（見 eraRegionsProvenance.ts）。
 */
export type EraRing = [number, number][]

export const ERA_RINGS: Record<string, EraRing[]> = """
    (ROOT / "src/geo/eraRegions.ts").write_text(
        header + emit_record(out) + "\n",
        encoding="utf-8",
    )

    preview = china.resize((984, 784), Image.Resampling.BOX)
    base = np.asarray(preview).copy()
    for key, color in (
        ("realm_prc_1949", (150, 48, 48)),
        ("realm_prc_1951", (120, 36, 36)),
        ("realm_qing_high", (48, 72, 120)),
        ("realm_ming_1420", (48, 110, 72)),
        ("realm_yuan_1279", (110, 84, 36)),
    ):
        mask = masks[key]
        small_mask = cv2.resize(
            mask.astype(np.uint8), (984, 784), interpolation=cv2.INTER_NEAREST
        ) > 0
        panel = base.copy()
        panel[small_mask] = (
            panel[small_mask].astype(np.uint16) * 4 // 10
            + np.array(color, dtype=np.uint16) * 6 // 10
        ).astype(np.uint8)
        Image.fromarray(panel).save(ROOT / "scripts" / "out" / f"{key}.jpg", quality=80)

    cities = {
        "beijing": (116.41, 39.90),
        "tianjin": (117.20, 39.13),
        "baoding": (115.46, 38.87),
        "datong": (113.30, 40.08),
        "taiyuan": (112.55, 37.87),
        "shenyang": (123.43, 41.80),
        "changchun": (125.32, 43.88),
        "harbin": (126.53, 45.80),
        "chengde": (117.96, 40.97),
        "xian": (108.94, 34.27),
        "yanan": (109.49, 36.65),
        "luoyang": (112.45, 34.62),
        "anyang": (114.35, 36.10),
        "kaifeng": (114.35, 34.80),
        "nanjing": (118.78, 32.06),
        "xuzhou": (117.18, 34.26),
        "hangzhou": (120.16, 30.27),
        "wenzhou": (120.70, 28.00),
        "wuhan": (114.30, 30.59),
        "xiangyang": (112.14, 32.01),
        "changsha": (112.94, 28.23),
        "guangzhou": (113.26, 23.13),
        "nanning": (108.37, 22.82),
        "kunming": (102.83, 24.88),
        "chengdu": (104.07, 30.67),
        "guiyang": (106.63, 26.65),
        "fuzhou": (119.30, 26.08),
        "nanchang": (115.86, 28.68),
        "hefei": (117.23, 31.82),
        "jinan": (117.00, 36.65),
        "lanzhou": (103.83, 36.06),
        "yinchuan": (106.23, 38.49),
        "xining": (101.78, 36.62),
        "urumqi": (87.62, 43.83),
        "lhasa": (91.11, 29.65),
        "taipei": (121.56, 25.04),
        "haikou": (110.32, 20.04),
        "linzi": (118.36, 36.86),
        "qufu": (116.99, 35.60),
        "handan": (114.49, 36.61),
        "yulin": (109.73, 38.27),
        "linfen": (111.52, 36.08),
        "changzhi": (113.12, 36.20),
        "yuncheng": (111.01, 35.03),
        "chaoyang": (120.45, 41.57),
        "chongqing": (106.55, 29.56),
        "mianyang": (104.68, 31.47),
        "guangyuan": (105.84, 32.44),
        "yibin": (104.64, 28.75),
        "wanzhou": (108.38, 30.81),
        "zunyi": (106.90, 27.68),
        "xichang": (102.27, 27.90),
        "jingdezhen": (117.18, 29.27),
        "shangrao": (117.97, 28.45),
        "ji_an": (114.99, 27.11),
        "anshun": (105.93, 26.25),
        "tongren": (109.19, 27.73),
        "kaili": (107.98, 26.58),
        "duyun": (107.52, 26.26),
        "xingyi": (104.90, 25.09),
        "bijie": (105.29, 27.33),
        "liupanshui": (104.85, 26.59),
        "luzhou": (105.44, 28.87),
        "huaihua": (109.98, 27.55),
        "guilin": (110.29, 25.27),
        "shigatse": (88.88, 29.27),
        "qamdo": (97.17, 31.14),
        "nyingchi": (94.36, 29.65),
        "nagqu": (92.06, 31.48),
        "shiquanhe": (80.11, 32.50),
        "golmud": (94.90, 36.42),
        "kangding": (101.96, 30.05),
        "dali": (100.23, 25.59),
        "yushu": (97.01, 33.00),
        "tangshan": (118.18, 39.63),
        "mohe": (122.36, 52.97),
        "heihe": (127.50, 50.24),
        "jiamusi": (130.32, 46.81),
        "qiqihar": (123.97, 47.35),
        "daqing": (125.09, 46.55),
        "mudanjiang": (129.60, 44.55),
        "baicheng": (122.84, 45.62),
        "baishan": (126.42, 41.96),
        "songyuan": (124.83, 45.14),
        "hohhot": (111.75, 40.84),
        "baotou": (109.84, 40.66),
        "xinzhou": (112.73, 38.41),
        "shuozhou": (112.43, 39.33),
        "guangling": (114.27, 39.70),
        "daixian": (112.97, 39.07),
        "baoji": (107.15, 34.37),
        "tongchuan": (108.97, 34.90),
        "tongguan": (110.25, 34.61),
        "shangluo": (109.94, 33.87),
        "longxian": (106.75, 34.64),
        "bengbu": (117.36, 32.93),
        "fuyang": (115.81, 32.90),
        "huainan": (117.00, 32.63),
        "bozhou": (115.78, 33.88),
        "chuzhou": (118.33, 32.30),
        "tianchang": (119.01, 32.65),
        "gaoyou": (119.45, 32.78),
        "anqing": (117.06, 30.53),
        "wuhu": (118.43, 31.35),
        "lu_an": (116.52, 31.76),
        "xuancheng": (118.46, 30.95),
        "chizhou": (117.49, 30.66),
        "tunxi": (118.34, 29.71),
        "wuyuan": (117.92, 29.26),
        "kaihua": (118.42, 29.14),
        "shitai": (117.19, 30.21),
        "he_xian": (118.35, 31.94),
        "hexian_jiangsu": (118.97, 31.74),
        "yixian": (117.99, 29.93),
        "jixi": (118.56, 30.07),
        "guangde": (119.41, 30.9),
        "liyang": (119.48, 31.42),
        "yanggao": (113.99, 40.34),
        "yuxian": (114.76, 39.53),
        "laiyuan": (114.74, 39.85),
        "zhuolu": (115.0, 39.54),
        "yueyang": (113.10, 29.40),
        "quzhou": (118.86, 28.94),
        "shizuishan": (106.72, 39.23),
        "wuzhong": (106.20, 37.50),
        "zhongwei": (105.19, 37.51),
        "guyuan": (106.28, 35.98),
        "tianshui": (105.72, 34.58),
        "qingyang": (107.64, 35.73),
        "dingbian": (107.60, 37.97),
        "changwu": (107.77, 35.20),
    }
    watch = [
        "zhili", "youyun", "hebei_song", "shanxi", "shanxi_n", "shanxi_s",
        "shaanxi", "shaanxi_rest", "yanan", "ln", "jl", "hlj", "rehe",
        "henan", "shandong", "sichuan", "hubei", "hubei_n", "jiangsu_n",
        "jiangsu_s", "zhejiang_n", "zhejiang_s", "guangdong", "guangxi",
        "yunnan", "xinjiang", "tibet", "gansu", "taiwan", "hainan", "qi",
        "yiluo", "shang_yin", "zhou_wei", "lu", "zhao_handan", "zhou_luoyi",
        "jiangxi", "ningxia", "guizhou",
     "anhui_n", "anhui_s", "qin_guanzhong",
    ]
    print("--- cities ---")
    for label, (lon, lat) in cities.items():
        x, y = tlb.china_px(lat, lon, W, H)
        hit = []
        if 0 <= x < W and 0 <= y < H:
            xi, yi = int(x), int(y)
            for name in watch:
                m = masks.get(name)
                if m is not None and m[yi, xi]:
                    hit.append(name)
        print(f"{label:12} {x:7.1f},{y:7.1f}  {','.join(hit) or 'MISS'}")

    japan = Image.open(ROOT / "public/maps/japan_relief.jpg").convert("RGB")
    japan = japan.resize((JP_W, JP_H), Image.Resampling.BOX)
    jland = tlb.land_mask(japan, "japan")

    def jrings(name: str, lon0, lat0, lon1, lat1, min_area=80):
        raw = box_mask(lon0, lat0, lon1, lat1, tlb.japan_px, JP_W, JP_H) & jland
        rings = rings_from(raw, min_area, 2.2, keep=8)
        print(f"jp {name:16} rings={len(rings)} pts={sum(len(r) for r in rings)}")
        return rings

    jp = {
        "matsumae": jrings("matsumae", 139.55, 41.28, 140.65, 42.18, 40),
        "hokkaido": jrings("hokkaido", 139.3, 41.35, 146.2, 45.7, 200),
        "okinawa": jrings("okinawa", 126.65, 26.05, 128.45, 26.95, 30),
        "ryukyu": jrings("ryukyu", 122.9, 24.0, 131.4, 27.2, 20),
    }
    # Amami stays with Satsuma/Kagoshima; drop components north of Okinawa's box
    # by keeping the geographic box tight. ryukyu here is the prefecture chain
    # south of Amami only if the box starts at 27.2 and we then remove Amami.
    amami = box_mask(128.9, 27.7, 130.4, 28.6, tlb.japan_px, JP_W, JP_H)
    ryukyu_mask = box_mask(122.9, 24.0, 131.4, 27.15, tlb.japan_px, JP_W, JP_H) & jland & ~amami
    jp["ryukyu"] = rings_from(ryukyu_mask, 20, 2.0, keep=10)
    print("jp ryukyu clipped", len(jp["ryukyu"]))

    jp_header = """/** 北海道、松前、琉球。像素對齊日本地勢 1482×1477。
 * 由 scripts/gen_era_regions.py 裁到列島海岸；非日本學術歷史地圖矢量化（見 japanEraRingsProvenance.ts）。
 * 1604 只取渡島南部；1869 才是北海道全島；1879 才是沖繩縣。
 */
export type EraRing = [number, number][]

export const JP_ERA_RINGS: Record<string, EraRing[]> = """
    (ROOT / "src/geo/japanEraRings.ts").write_text(
        jp_header + emit_record(jp) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
