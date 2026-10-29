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

# (lon, lat) lists. Coasts are finished by the land mask, not by these vertices.
POLYS: dict[str, list[tuple[float, float]]] = {
    "hlj": [
        (121.5, 53.4), (126.5, 53.5), (130.5, 50.2), (135.0, 48.4),
        (134.2, 47.4), (131.2, 47.5), (131.0, 45.4), (127.2, 45.0),
        (125.2, 46.6), (123.2, 47.2), (121.6, 50.2),
    ],
    "jl": [
        (122.6, 46.2), (125.6, 45.2), (131.0, 45.2), (131.2, 43.2),
        (130.0, 42.6), (128.2, 41.9), (125.6, 41.4), (123.4, 42.4),
        (122.6, 44.2),
    ],
    "ln": [
        (119.6, 41.4), (122.2, 42.6), (124.8, 43.0), (125.4, 41.5),
        (124.2, 40.0), (123.6, 39.6), (122.6, 39.15), (121.2, 38.65),
        (120.8, 39.3), (120.6, 40.4), (119.6, 40.8),
    ],
    "rehe": [
        (116.0, 42.6), (119.8, 42.6), (120.4, 41.2), (118.6, 40.3),
        (116.6, 40.2), (115.6, 40.9), (115.4, 41.8),
    ],
    "zhili": [
        (113.8, 39.8), (115.0, 40.7), (116.6, 40.5), (117.8, 40.2),
        (119.2, 39.5), (119.4, 38.6), (118.2, 38.0), (117.4, 38.2),
        (116.6, 37.4), (115.0, 36.4), (114.0, 36.2), (113.5, 37.0),
        (113.6, 38.4),
    ],
    "youyun": [
        (112.6, 40.7), (114.6, 41.3), (117.4, 41.1), (119.4, 40.4),
        (119.8, 39.75), (117.2, 39.55), (115.2, 39.62), (113.8, 39.75),
        (112.7, 40.05),
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
        (110.2, 40.1), (112.2, 40.6), (114.0, 40.2), (114.1, 39.0),
        (113.6, 37.2), (113.4, 35.6), (112.2, 35.05), (110.8, 35.15),
        (110.2, 35.8), (110.2, 37.4), (110.5, 38.8),
    ],
    "shanxi_n_box": [
        (110.2, 40.6), (114.2, 40.6), (114.2, 37.7), (110.2, 37.7),
    ],
    "shaanxi": [
        (105.7, 33.1), (107.4, 33.3), (108.4, 32.7), (110.2, 33.3),
        (110.6, 34.8), (110.4, 36.2), (110.2, 38.0), (109.6, 39.4),
        (107.6, 39.2), (106.6, 37.6), (106.2, 35.4), (105.8, 33.8),
    ],
    "yanan": [
        (107.5, 37.7), (109.4, 37.9), (110.5, 37.4), (110.6, 36.5),
        (109.5, 35.95), (108.2, 35.85), (107.3, 36.45), (107.2, 37.15),
    ],
    "gansu": [
        (93.2, 40.4), (96.2, 42.2), (100.2, 41.2), (103.6, 39.0),
        (104.8, 37.0), (106.4, 36.0), (106.2, 34.6), (104.2, 33.6),
        (101.6, 33.8), (98.2, 39.4), (94.6, 39.6),
    ],
    "ningxia": [
        (105.0, 37.6), (106.9, 39.3), (107.2, 37.8), (106.2, 35.6),
        (105.0, 35.8), (104.6, 36.9),
    ],
    # 青海高原，用來接通新疆、西藏、河西與四川。不是只圈西寧。
    "qinghai": [
        (89.5, 39.3), (95.2, 39.6), (99.2, 39.1), (102.8, 38.2),
        (103.5, 36.3), (102.6, 34.4), (101.2, 32.6), (97.8, 31.9),
        (94.2, 32.3), (91.2, 33.8), (89.6, 36.4),
    ],
    "xinjiang": [
        (73.6, 39.2), (73.6, 42.2), (80.5, 45.4), (87.5, 49.0),
        (95.2, 47.6), (96.0, 42.6), (93.6, 38.8), (88.5, 36.2),
        (80.0, 35.4), (75.5, 36.6), (73.5, 38.2),
    ],
    "tibet": [
        (78.6, 32.2), (82.0, 36.2), (90.0, 36.4), (94.5, 32.8),
        (97.2, 29.6), (98.2, 28.0), (94.5, 27.6), (88.0, 27.4),
        (82.0, 28.6), (78.8, 30.6),
    ],
    "sichuan": [
        (102.8, 32.6), (104.8, 33.0), (106.8, 32.5), (108.8, 32.2),
        (109.6, 31.0), (108.2, 28.3), (106.2, 28.2), (104.2, 28.2),
        (102.9, 28.6), (102.6, 30.2), (102.7, 31.4),
    ],
    "yunnan": [
        (97.8, 28.3), (100.4, 28.4), (102.6, 28.0), (104.4, 27.2),
        (105.6, 25.8), (106.2, 24.2), (105.6, 22.8), (103.2, 22.4),
        (101.2, 21.8), (99.0, 22.6), (97.6, 24.2), (97.5, 26.6),
    ],
    "guizhou": [
        (104.4, 27.5), (107.4, 27.6), (109.3, 27.0), (109.2, 25.2),
        (108.0, 24.6), (106.0, 24.6), (104.6, 25.2), (104.2, 26.4),
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
        (113.6, 29.5), (115.4, 29.9), (117.0, 29.5), (118.0, 28.4),
        (118.2, 27.2), (117.0, 25.8), (115.8, 24.6), (114.4, 24.7),
        (113.6, 25.8), (113.5, 27.6), (113.6, 28.8),
    ],
    "anhui_n": [
        (115.3, 34.5), (117.4, 34.5), (118.5, 33.5), (118.3, 32.55),
        (116.6, 32.45), (115.3, 32.6), (115.1, 33.5),
    ],
    "anhui_s": [
        (115.4, 32.5), (118.3, 32.6), (118.8, 31.2), (118.0, 29.7),
        (116.2, 29.7), (115.5, 30.8), (115.2, 31.8),
    ],
    "jiangsu_n": [
        (116.5, 34.9), (119.5, 34.7), (120.5, 33.5), (119.7, 32.35),
        (118.2, 32.25), (116.8, 33.4), (116.3, 34.3),
    ],
    "jiangsu_s": [
        (118.4, 32.35), (119.8, 32.45), (121.3, 32.05), (121.8, 31.3),
        (121.0, 30.95), (119.4, 31.35), (118.4, 31.6),
    ],
    "zhejiang_n": [
        (118.6, 31.15), (120.4, 31.05), (121.6, 30.55), (121.4, 29.95),
        (120.0, 29.85), (118.8, 30.25),
    ],
    "zhejiang_s": [
        (118.2, 29.9), (120.2, 29.9), (122.0, 28.8), (121.4, 27.2),
        (119.8, 27.4), (118.4, 28.2), (118.0, 29.2),
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
    "steppe": [
        (88.0, 43.2), (96.0, 46.5), (104.0, 49.5), (112.0, 50.5),
        (120.0, 49.0), (124.0, 46.5), (118.0, 43.2), (108.0, 42.2),
        (98.0, 42.0), (90.0, 42.4),
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
        (111.45, 34.98), (113.25, 35.0), (113.35, 34.22), (111.55, 34.12),
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
        (116.55, 35.95), (117.55, 36.05), (117.65, 35.35), (116.65, 35.25),
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
        (106.3, 35.2), (108.2, 35.45), (110.0, 35.1), (110.5, 34.35),
        (109.2, 33.9), (107.2, 33.95), (106.0, 34.4),
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


def rings_from(mask: np.ndarray, min_area: int, eps: float, keep: int = 6):
    found = []
    for ring in tlb.contours(mask):
        if abs(tlb.ring_area(ring)) < min_area:
            continue
        simp = tlb.simplify(ring, eps)
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
    masks["shanxi_n"] = masks["shanxi"] & masks["shanxi_n_box"]
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
    skip = {"shanxi_n_box", "hubei_n_box", "qi_east_box"}
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
 * 地理底圖精神據譚其驤《中國歷史地圖集》。細節有爭議處在各快照 note。
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
    }
    watch = [
        "zhili", "youyun", "hebei_song", "shanxi", "shanxi_n", "shanxi_s",
        "shaanxi", "shaanxi_rest", "yanan", "ln", "jl", "hlj", "rehe",
        "henan", "shandong", "sichuan", "hubei", "hubei_n", "jiangsu_n",
        "jiangsu_s", "zhejiang_n", "zhejiang_s", "guangdong", "guangxi",
        "yunnan", "xinjiang", "tibet", "gansu", "taiwan", "hainan", "qi",
        "yiluo", "shang_yin", "zhou_wei", "lu", "zhao_handan",
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
 * 由 scripts/gen_era_regions.py 裁到列島海岸，不是任意圓。
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
