#!/usr/bin/env python3
"""wp_coord.py — 查維基條目的座標，供行軍線／疆域環核對地名位置用。

用法：python3 scripts/wp_coord.py 關原町 [更多條目 ...] [--lang ja]

輸出每行：條目名｜經度E,緯度N｜維基摘要首句。查不到座標就明說「無座標」，不要自己估。
座標是現代行政地名的代表點，容差要依地名大小給（市街 12–20 km，廣域戰場 25–30 km）。
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, __import__("os").path.dirname(__file__))
from qsrc import ssl_context  # noqa: E402  同一套 CA 處理（macOS python.org 版無內置 CA）

args = sys.argv[1:]
lang = "zh"
if "--lang" in args:
    i = args.index("--lang")
    lang = args[i + 1]
    del args[i : i + 2]
if not args:
    sys.exit(__doc__)

import time

for title in args:
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    req = urllib.request.Request(url, headers={"User-Agent": "historyfirst-agent/1.0"})
    d = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15, context=ssl_context()) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                time.sleep(4 * (attempt + 1))
                continue
            note = "被限流，稍後重跑" if e.code == 429 else "查無條目"
            print(f"{title}｜{note}（HTTP {e.code}）")
            break
        except Exception as e:  # noqa: BLE001
            print(f"{title}｜網路錯誤：{str(e)[:60]}")
            break
    if d is None:
        continue
    c = d.get("coordinates")
    pos = f"{c['lon']:.2f}E,{c['lat']:.2f}N" if c else "無座標（試 --lang ja 或 --lang en）"
    print(f"{d.get('title', title)}｜{pos}｜{(d.get('extract') or '')[:50]}")
