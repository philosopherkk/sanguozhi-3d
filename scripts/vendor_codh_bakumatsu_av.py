#!/usr/bin/env python3
"""Vendor CODH 幕末期近世村領域 village polygons for staged 藩 (CC BY-SA 4.0).

Harvests Geoshape vector tiles (/av/tile/{z}/{x}/{y}.pbf), assigns villages to 藩
via ryobun substring match (same as geoshape.ex.nii.ac.jp/av/han/ pages).

Run once before build_bakumatsu_han_rings.py. Requires: shapely (optional for QA), mapbox-vector-tile.
"""

from __future__ import annotations

import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/territory/japan_bakumatsu_1867/vendor"
VILLAGES = OUT / "villages"
STAGED = OUT / "staged_han.json"
HAN_CSV_URL = "https://codh.rois.ac.jp/han/dataset/han-20250919.csv"
TILE_BASE = "https://geoshape.ex.nii.ac.jp/av/tile/{z}/{x}/{y}.pbf"
TILE_Z = 8
JP_W, JP_E, JP_S, JP_N = 122.0, 154.0, 24.0, 46.5


def ensure_mvt():
    try:
        import mapbox_vector_tile  # noqa: F401

        return
    except ImportError:
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "mapbox-vector-tile", "-q"]
        )


def lonlat_to_tile(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2**z
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def tile_range(z: int) -> tuple[range, range]:
    x0, y0 = lonlat_to_tile(JP_W, JP_N, z)
    x1, y1 = lonlat_to_tile(JP_E, JP_S, z)
    return range(min(x0, x1), max(x0, x1) + 1), range(min(y0, y1), max(y0, y1) + 1)


def fetch_ryobun(hid: str) -> list[str]:
    url = f"https://geoshape.ex.nii.ac.jp/av/han/{hid}/"
    req = urllib.request.Request(url, headers={"User-Agent": "sanguozhi-3d-vendor/1.0"})
    html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", errors="replace")
    m = re.search(r"let ryobun = (\[[^\]]+\]);", html)
    if not m:
        raise SystemExit(f"ryobun not found on {url}")
    return json.loads(m.group(1))


def download_han_catalog() -> None:
    dest = OUT / "han_catalog.csv"
    if dest.exists() and dest.stat().st_size > 1000:
        return
    print("fetch", HAN_CSV_URL)
    urllib.request.urlretrieve(HAN_CSV_URL, dest)


def load_staged_config() -> dict:
    return json.loads(STAGED.read_text(encoding="utf-8"))


def load_han_names() -> dict[str, str]:
    import csv

    names: dict[str, str] = {}
    with (OUT / "han_catalog.csv").open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            names[row["藩ID"]] = row["藩名"]
    return names


def mvt_to_lonlat(x_tile: int, y_tile: int, z: int, x: float, y: float, extent: int) -> tuple[float, float]:
    lon = (x_tile + x / extent) / 2**z * 360.0 - 180.0
    n = math.pi - 2.0 * math.pi * (y_tile + y / extent) / 2**z
    lat = math.degrees(math.atan(math.sinh(n)))
    return lon, lat


def ring_to_lonlat(
    coords: list,
    x_tile: int,
    y_tile: int,
    z: int,
    extent: int,
) -> list[list[float]]:
    return [list(mvt_to_lonlat(x_tile, y_tile, z, p[0], p[1], extent)) for p in coords]


def assign_han(ryobun: str, matchers: list[tuple[str, list[str]]]) -> str | None:
    for hid, strings in matchers:
        for s in strings:
            if s and s in ryobun:
                return hid
    return None


def main() -> None:
    ensure_mvt()
    import mapbox_vector_tile

    OUT.mkdir(parents=True, exist_ok=True)
    VILLAGES.mkdir(parents=True, exist_ok=True)
    download_han_catalog()
    cfg = load_staged_config()
    han_ids: list[str] = cfg["hanIds"]
    exclude_kuni: set[str] = set(cfg.get("excludeKuniIds") or [])
    names = load_han_names()

    matchers: list[tuple[str, list[str]]] = []
    meta_han: list[dict] = []
    meta_path = OUT / "staged_han_meta.json"
    if meta_path.exists():
        meta_han = json.loads(meta_path.read_text(encoding="utf-8"))
        for m in meta_han:
            matchers.append((m["hanId"], m["ryobun"]))
        print("reuse", meta_path, flush=True)
    else:
        for hid in han_ids:
            ryobun = fetch_ryobun(hid)
            matchers.append((hid, ryobun))
            meta_han.append(
                {
                    "hanId": hid,
                    "name": names.get(hid, hid),
                    "ryobun": ryobun,
                }
            )
            print("ryobun", hid, ryobun, flush=True)
            time.sleep(0.15)
        meta_path.write_text(json.dumps(meta_han, ensure_ascii=False, indent=2), encoding="utf-8")

    collections: dict[str, list[dict]] = {hid: [] for hid in han_ids}
    seen: set[str] = set()
    xr, yr = tile_range(TILE_Z)
    total_tiles = len(xr) * len(yr)
    done = 0
    t0 = time.time()

    for x in xr:
        for y in yr:
            done += 1
            url = TILE_BASE.format(z=TILE_Z, x=x, y=y)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "sanguozhi-3d-vendor/1.0"})
                raw = urllib.request.urlopen(req, timeout=90).read()
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    continue
                raise
            if len(raw) < 8:
                continue
            decoded = mapbox_vector_tile.decode(raw)
            layer = decoded.get("av") or {}
            features = layer.get("features") or []
            extent = layer.get("extent") or 4096
            for feat in features:
                props = feat.get("properties") or {}
                aid = str(props.get("aid") or props.get("vid") or "")
                if not aid or aid in seen:
                    continue
                kuni = str(props.get("kuni_id") or "")
                if kuni in exclude_kuni:
                    continue
                ryobun = str(props.get("ryobun") or "")
                hid = assign_han(ryobun, matchers)
                if not hid:
                    continue
                geom = feat.get("geometry") or {}
                gtype = geom.get("type")
                coords = geom.get("coordinates")
                if gtype == "Polygon":
                    rings = [ring_to_lonlat(coords[0], x, y, TILE_Z, extent)]
                elif gtype == "MultiPolygon":
                    rings = [
                        ring_to_lonlat(part[0], x, y, TILE_Z, extent)
                        for part in coords
                        if part and part[0]
                    ]
                else:
                    continue
                if not rings or len(rings[0]) < 3:
                    continue
                seen.add(aid)
                for ring in rings:
                    if len(ring) < 3:
                        continue
                    collections[hid].append(
                        {
                            "type": "Feature",
                            "properties": {
                                **props,
                                "hanId": hid,
                                "approx": True,
                                "source": "CODH 幕末期近世村領域 CC BY-SA 4.0",
                            },
                            "geometry": {"type": "Polygon", "coordinates": [ring]},
                        }
                    )
            if done % 25 == 0:
                print(
                    f"tiles {done}/{total_tiles} features {sum(len(v) for v in collections.values())}",
                    flush=True,
                )

    for hid, feats in collections.items():
        path = VILLAGES / f"{hid}.geojson"
        fc = {"type": "FeatureCollection", "features": feats}
        path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
        print("wrote", path.name, "features", len(feats))

    print(f"done in {time.time() - t0:.1f}s unique_aids={len(seen)}")


if __name__ == "__main__":
    main()
