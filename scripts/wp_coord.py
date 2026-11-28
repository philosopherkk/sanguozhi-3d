#!/usr/bin/env python3
"""wp_coord.py — 查維基條目的座標，供行軍線／疆域環核對地名位置用。

用法：python3 scripts/wp_coord.py 關原町 [更多條目 ...] [--lang ja]

輸出每行：條目名｜經度E,緯度N｜類型｜維基摘要首句。查不到座標就明說「無座標」，不要自己估。

⚠ 這數字是條目的 **代表點（page lead coordinate）**，不是任意地點：
  · 行政區條目（郡、道、府）的代表點常是治所／廳舍，可以離真正要畫的渡口、關口、戰場數十至上百公里。
    實例：en.wiki `Chosan County`（楚山郡）給 125.31E,40.60N，而鴨綠江渡口楚山約在 126.4E,41.0N，
    差約 100 km——照抄會把渡口畫到內陸山區。
  · 所以拿到數字後仍要交叉核對：同檔其他已知點、鄰域條目座標、地形（渡口必須在江邊）。
  · 對不上時以交叉核對的結果為準，並在報告寫明「條目值 = X，採納值 = Y，理由 = Z」。
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

# 警告走 stderr：指令輸出仍可逐行解析，但人手抄數字時一定睇到呢兩句
print(
    "# 以下數字係條目代表點（行政區條目常係治所），未必係你實際要畫嘅渡口／關口／戰場。"
    "用之前要同同檔已知點交叉核對，對唔上就喺報告寫明取捨。",
    file=sys.stderr,
)
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
    # description 決定呢個數字代表邊個點：county/district 多係治所，town/village 先多數係聚落本身
    kind = (d.get("description") or "無類型描述")[:40]
    print(f"{d.get('title', title)}｜{pos}｜類型={kind}｜{(d.get('extract') or '')[:50]}")
