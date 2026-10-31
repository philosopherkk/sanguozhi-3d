#!/usr/bin/env python3
"""Download CODH 旧国 GeoJSON (K01–K85) into src/data/territory/japan_kokugun/vendor/."""

from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/territory/japan_kokugun/vendor"
BASE = "https://geoshape.ex.nii.ac.jp/kg/geojson"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for n in range(1, 86):
        kid = f"K{n:02d}"
        dest = OUT / f"{kid}.geojson"
        if dest.exists() and dest.stat().st_size > 100:
            continue
        url = f"{BASE}/{kid}.geojson"
        print("fetch", url)
        urllib.request.urlretrieve(url, dest)
    print("done", OUT)


if __name__ == "__main__":
    main()
