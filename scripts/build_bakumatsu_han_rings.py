#!/usr/bin/env python3
"""Dissolve vendored 村→藩 GeoJSON and emit Bakumatsu han paint meshes (CC BY-SA)."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "src/data/territory/japan_bakumatsu_1867/vendor"
VILLAGES = VENDOR / "villages"
STAGED = VENDOR / "staged_han.json"
OUT_MESH = ROOT / "src/bakumatsu/data/bakumatsuHanMeshes.ts"
OUT_COLLECTION = ROOT / "src/data/territory/japan_bakumatsu_1867/collection.geojson"

HAN_SOURCE_PLATE = (
    "CODH／Geoshape『幕末期近世村領域データセット』· doi:10.5638/thagis.34.1.1 · "
    "https://geoshape.ex.nii.ac.jp/av/ · CC BY-SA 4.0"
)
HAN_NOTE_ZH = (
    "示意・非地籍級藩界；村領域來自現代農業集落境界之空間接合（本田／CODH）。旧国≠藩界。"
)


def load_kokugun_build():
    path = ROOT / "scripts/build_japan_kokugun_rings.py"
    spec = importlib.util.spec_from_file_location("build_japan_kokugun_rings", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def ring_area(ring: list[list[float]]) -> float:
    if len(ring) < 3:
        return 0.0
    s = 0.0
    for i in range(len(ring)):
        x0, y0 = ring[i]
        x1, y1 = ring[(i + 1) % len(ring)]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2.0


def sort_rings_largest_first(rings: list[list[list[float]]]) -> list[list[list[float]]]:
    return sorted(rings, key=ring_area, reverse=True)


def load_village_geoms(hid: str) -> list[dict]:
    path = VILLAGES / f"{hid}.geojson"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [f["geometry"] for f in data.get("features") or [] if f.get("geometry")]


def centroid_lonlat(geoms: list[dict]) -> tuple[float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for geom in geoms:
        g = shape(geom)
        if g.is_empty:
            continue
        c = g.centroid
        lons.append(c.x)
        lats.append(c.y)
    if not lons:
        return 0.0, 0.0
    return sum(lons) / len(lons), sum(lats) / len(lats)


def emit_ts(meshes: list[dict]) -> None:
    header = """/** 由 scripts/build_bakumatsu_han_rings.py 自 CODH 村→藩 dissolve 生成。勿手改。CC BY-SA 4.0。 */
import type { SengokuRegionId } from '../../sengoku/types'

export interface BakumatsuHanMesh {
  id: string
  hanId: string
  name: string
  domainId: string
  zone: SengokuRegionId
  ring: [number, number][]
  extraRings?: [number, number][][]
  approx: true
  pointOnly?: true
}

export const BAKUMATSU_HAN_MESHES: BakumatsuHanMesh[] = """
    OUT_MESH.write_text(
        header + json.dumps(meshes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    kg = load_kokugun_build()
    if not VILLAGES.exists():
        raise SystemExit("run scripts/vendor_codh_bakumatsu_av.py first")

    cfg = json.loads(STAGED.read_text(encoding="utf-8"))
    han_ids: list[str] = cfg["hanIds"]
    exclude_poly: set[str] = set(cfg.get("excludePolygonHanIds") or [])
    meta = json.loads((VENDOR / "staged_han_meta.json").read_text(encoding="utf-8"))
    name_by_id = {m["hanId"]: m["name"] for m in meta}

    domains = kg.load_traced_domains()
    domain_zone = {d["id"]: d["zone"] for d in domains}

    meshes: list[dict] = []
    index_features: list[dict] = []

    for hid in han_ids:
        if hid in exclude_poly:
            continue
        geoms = load_village_geoms(hid)
        if not geoms:
            print("skip empty", hid)
            continue
        lon, lat = centroid_lonlat(geoms)
        domain_id = kg.assign_domain(lon, lat, domains)
        zone = domain_zone.get(domain_id, "奧羽")
        name = name_by_id.get(hid, hid)

        rings_px = kg.pixel_rings_from_geometries(geoms, 2.2)
        rings_px = sort_rings_largest_first(rings_px)
        if not rings_px:
            continue
        ring = rings_px[0]
        extra = rings_px[1:] if len(rings_px) > 1 else None
        if len(ring) < 3:
            raise SystemExit(f"{hid} ring too small")

        mesh = {
            "id": hid,
            "hanId": hid,
            "name": name,
            "domainId": domain_id,
            "zone": zone,
            "ring": ring,
            "approx": True,
            **({"extraRings": extra} if extra else {}),
        }
        meshes.append(mesh)
        index_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": hid,
                    "hanId": hid,
                    "name": name,
                    "domainId": domain_id,
                    "villageCount": len(geoms),
                    "source_plate": HAN_SOURCE_PLATE,
                    "approx": True,
                    "note": HAN_NOTE_ZH,
                    "method": "unary_union(村領域) per 藩ID",
                    "year": 1867,
                    "crs": "EPSG:4326 → japan relief 1482×1477",
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )

    if len(meshes) < 10:
        raise SystemExit(f"too few han meshes: {len(meshes)}")

    emit_ts(meshes)
    fc = {
        "type": "FeatureCollection",
        "name": "japan_bakumatsu_1867",
        "features": index_features,
    }
    OUT_COLLECTION.write_text(json.dumps(fc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"meshes={len(meshes)} collection={len(index_features)}")


if __name__ == "__main__":
    main()
