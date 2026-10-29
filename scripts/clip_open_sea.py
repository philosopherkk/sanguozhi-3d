#!/usr/bin/env python3
"""Cut existing territory rings back to the open-sea mask.

Inland edges stay on the rings already traced. Only pixels that sit in the
largest connected blue-water body are removed. Does not move routes.
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scripts" / "out"


def load_tighten():
    path = Path(__file__).with_name("tighten_land_borders.py")
    spec = importlib.util.spec_from_file_location("tighten_land_borders", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load tighten_land_borders")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def raster(w: int, h: int, rings) -> np.ndarray:
    im = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(im)
    for ring in rings:
        if len(ring) >= 3:
            draw.polygon([(float(x), float(y)) for x, y in ring], fill=1)
    return np.array(im) > 0


def clip_rings(rings, sea: np.ndarray, min_area: int = 40, eps: float = 1.35):
    h, w = sea.shape
    mask = raster(w, h, rings) & ~sea
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8), connectivity=8
    )
    clean = np.zeros_like(mask)
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            clean[labels == i] = True
    contours, _ = cv2.findContours(
        clean.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    out = []
    for cnt in contours:
        approx = cv2.approxPolyDP(cnt, eps, True)
        pts = [(round(float(p[0][0]), 1), round(float(p[0][1]), 1)) for p in approx]
        if len(pts) >= 3 and abs(_area(pts)) >= min_area:
            out.append(pts)
    out.sort(key=lambda ring: abs(_area(ring)), reverse=True)
    return out, int(clean.sum()), int((raster(w, h, rings)).sum())


def _area(ring) -> float:
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2


def contains(rings, x: float, y: float, w: int, h: int) -> bool:
    xi, yi = int(round(x)), int(round(y))
    if not (0 <= xi < w and 0 <= yi < h):
        return False
    return bool(raster(w, h, rings)[yi, xi])


def paint(base: Image.Image, labels: np.ndarray, path: Path):
    im = np.asarray(base.convert("RGB")).copy()
    rng = np.random.default_rng(3)
    tint = np.zeros_like(im)
    for i in range(1, int(labels.max()) + 1):
        tint[labels == i] = rng.integers(40, 230, size=3)
    on = labels > 0
    im[on] = (im[on] * 0.45 + tint[on] * 0.55).astype(np.uint8)
    small = Image.fromarray(im).resize((im.shape[1] // 2, im.shape[0] // 2))
    path.parent.mkdir(parents=True, exist_ok=True)
    small.save(path, quality=75)


def grab(text: str, i: int) -> tuple[str, int]:
    depth = 0
    j = i
    while j < len(text):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                return text[i : j + 1], j + 1
        j += 1
    raise RuntimeError("unclosed bracket")


def parse_domains(text: str):
    domains = []
    for match in re.finditer(r"id:\s*'([^']+)'", text):
        window = text[match.end() : match.end() + 500]
        name = re.search(r"name:\s*'([^']+)'", window)
        zone = re.search(r"zone:\s*'([^']+)'", window)
        clan = re.search(r"clan:\s*'([^']+)'", window)
        ring_at = text.find("ring:", match.end())
        if not name or not zone or not clan or ring_at < 0 or ring_at - match.end() > 400:
            continue
        bracket = text.find("[", ring_at)
        raw, end = grab(text, bracket)
        ring = json.loads(re.sub(r",(\s*[\]}])", r"\1", raw))
        extra = None
        extra_at = text.find("extraRings:", end, end + 80)
        if extra_at != -1:
            extra_bracket = text.find("[", extra_at)
            raw_extra, _ = grab(text, extra_bracket)
            extra = json.loads(re.sub(r",(\s*[\]}])", r"\1", raw_extra))
        domains.append(
            {
                "id": match.group(1),
                "name": name.group(1),
                "zone": zone.group(1),
                "clan": clan.group(1),
                "ring": ring,
                "extraRings": extra,
            }
        )
    return domains


def main():
    write = "--write" in sys.argv
    mod = load_tighten()
    china_im = Image.open(ROOT / "public/maps/china_edcp_relief.jpg").convert("RGB")
    japan_im = Image.open(ROOT / "public/maps/japan_relief.jpg").convert("RGB")
    china_sea = mod.open_sea(china_im, "china")
    japan_sea = mod.open_sea(japan_im, "japan")
    print(f"sea px china {int(china_sea.sum())} japan {int(japan_sea.sum())}")

    data = json.loads((ROOT / "src/data/basemapProvinceRings.json").read_text())
    w, h = int(data["width"]), int(data["height"])
    assert (w, h) == china_im.size
    new_provinces = {}
    lab = np.zeros((h, w), np.int16)
    problems = []
    for n, (name, rings) in enumerate(data["provinces"].items(), start=1):
        overlap = int((raster(w, h, rings) & china_sea).sum())
        if overlap < 80:
            area = int(raster(w, h, rings).sum())
            clipped, kept, before = rings, area, area
            print(f"china {name}: keep inland ring overlap {overlap}")
        else:
            clipped, kept, before = clip_rings(rings, china_sea)
            if not clipped or kept < before * 0.45:
                problems.append(f"{name} shrink {kept}/{before}")
                clipped = rings
        new_provinces[name] = clipped
        for ring in clipped:
            lab[raster(w, h, [ring])] = n
        sea_left = int((raster(w, h, clipped) & china_sea).sum())
        print(f"china {name}: {before}->{kept} px rings {len(rings)}->{len(clipped)} sea_left {sea_left}")

    for name, (lat, lon, expect) in mod.CHINA_CITIES.items():
        x, y = mod.china_px(lat, lon, w, h)
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < w and 0 <= yi < h) or china_sea[yi, xi]:
            problems.append(f"{name} on sea or off map")
            continue
        got = None
        for prov, i in zip(new_provinces, range(1, len(new_provinces) + 1)):
            if lab[yi, xi] == i:
                got = prov
                break
        if got != expect:
            problems.append(f"{name} -> {got} want {expect}")

    jw, jh = japan_im.size
    text = (ROOT / "src/sengoku/data/tracedDomains.ts").read_text()
    domains = parse_domains(text)
    print(f"domains {len(domains)}")
    jlab = np.zeros((jh, jw), np.int16)
    new_by_id = {}
    for n, d in enumerate(domains, start=1):
        rings = [d["ring"]] + (d["extraRings"] or [])
        overlap = int((raster(jw, jh, rings) & japan_sea).sum())
        if overlap < 80:
            area = int(raster(jw, jh, rings).sum())
            clipped, kept, before = rings, area, area
        else:
            clipped, kept, before = clip_rings(rings, japan_sea, min_area=28)
            if not clipped or kept < before * 0.4:
                problems.append(f"{d['id']} shrink {kept}/{before}")
                clipped = rings
        sea_left = int((raster(jw, jh, clipped) & japan_sea).sum())
        print(
            f"japan {d['id']} {d['name']}: {before}->{kept} px rings {len(rings)}->{len(clipped)} sea_left {sea_left}"
        )
        new_by_id[d["id"]] = {
            "ring": clipped[0],
            "extraRings": clipped[1:] or None,
        }
        for ring in clipped:
            jlab[raster(jw, jh, [ring])] = n

    for meta in mod.japan_domain_meta():
        x, y = mod.japan_px(meta["lat"], meta["lon"], jw, jh)
        xi, yi = int(round(x)), int(round(y))
        if japan_sea[yi, xi]:
            continue
        got = jlab[yi, xi]
        want = int(meta["id"][1:]) + 1
        if got != want:
            problems.append(f"seed {meta['id']} {meta['name']} -> label {got} want {want}")

    # Known open water must not remain inside a ring.
    checks = [
        ("hangzhou", mod.china_px(30.4, 121.6, w, h), lab),
        ("liaodong", mod.china_px(40.5, 121.0, w, h), lab),
        ("pearl", mod.china_px(22.3, 113.7, w, h), lab),
    ]
    for name, (x, y), grid in checks:
        xi, yi = int(round(x)), int(round(y))
        if grid[yi, xi] != 0:
            problems.append(f"{name} still inside a province")
    jchecks = [
        ("tokyo", mod.japan_px(35.45, 139.80, jw, jh)),
        ("seto", mod.japan_px(34.25, 133.50, jw, jh)),
        ("osaka", mod.japan_px(34.45, 135.15, jw, jh)),
        ("ise", mod.japan_px(34.70, 136.75, jw, jh)),
    ]
    for name, (x, y) in jchecks:
        xi, yi = int(round(x)), int(round(y))
        if jlab[yi, xi] != 0:
            problems.append(f"{name} still inside a domain")

    def crop(base, labels, sea, box, path):
        im = np.asarray(base.convert("RGB")).copy()
        rng = np.random.default_rng(3)
        tint = np.zeros_like(im)
        for i in range(1, int(labels.max()) + 1):
            tint[labels == i] = rng.integers(50, 220, size=3)
        on = labels > 0
        im[on] = (im[on] * 0.4 + tint[on] * 0.6).astype(np.uint8)
        spill = on & sea
        im[spill] = (220, 30, 30)
        x0, y0, x1, y1 = box
        Image.fromarray(im[y0:y1, x0:x1]).save(path, quality=85)

    paint(china_im, lab, OUT / "china_clipped.jpg")
    paint(japan_im, jlab, OUT / "japan_clipped.jpg")
    crop(china_im, lab, china_sea, (1320, 500, 1680, 820), OUT / "crop_bohai.jpg")
    crop(china_im, lab, china_sea, (1450, 900, 1760, 1220), OUT / "crop_yangtze.jpg")
    crop(china_im, lab, china_sea, (1100, 1280, 1550, 1567), OUT / "crop_south.jpg")
    crop(japan_im, jlab, japan_sea, (480, 560, 1020, 980), OUT / "crop_honshu.jpg")
    crop(japan_im, jlab, japan_sea, (280, 700, 700, 1120), OUT / "crop_kyushu.jpg")

    li_path = ROOT / "src/data/marchRoutes.ts"
    li_text = li_path.read_text()
    li_match = re.search(r"id: 'li'", li_text)
    li_ring = None
    if li_match:
        ring_at = li_text.find("ring:", li_match.end())
        bracket = li_text.find("[", ring_at)
        raw, _ = grab(li_text, bracket)
        old_li = json.loads(re.sub(r",(\s*[\]}])", r"\1", raw))
        li_clipped, li_kept, li_before = clip_rings([old_li], china_sea, min_area=30, eps=1.2)
        print(f"俚 fringe {li_before}->{li_kept} rings {len(li_clipped)}")
        if li_clipped and li_kept > li_before * 0.5:
            li_ring = li_clipped[0]
        else:
            problems.append("俚 fringe collapsed")
    if problems:
        print("PROBLEMS")
        for row in problems:
            print(" ", row)
        raise SystemExit(1)
    if not write:
        print("preview only")
        return

    payload = {
        "width": w,
        "height": h,
        "provinces": {
            name: [[[float(x), float(y)] for x, y in ring] for ring in rings]
            for name, rings in new_provinces.items()
        },
    }
    (ROOT / "src/data/basemapProvinceRings.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    mod.write_domains(ROOT / "src/sengoku/data/tracedDomains.ts", domains, new_by_id)
    if li_ring is not None:
        updated, ok = mod.replace_ring_after_id(li_text, "li", li_ring)
        if not ok:
            raise SystemExit("failed to update 俚 ring")
        li_path.write_text(updated, encoding="utf-8")
    print("wrote rings")


if __name__ == "__main__":
    main()
