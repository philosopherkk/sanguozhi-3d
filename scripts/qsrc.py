#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""qsrc.py — 對 Wikisource 原文查證引文（三國志 3D 專案的臨時查證工具）。

用法:
  python3 /tmp/qsrc.py 書名/卷N '正则'            # 直接指定子頁
  python3 /tmp/qsrc.py --cite '《三國志·魏書·武帝紀》' '正则'   # 由引文出處解析子頁
  python3 /tmp/qsrc.py --toc 三國志               # 列出索引頁的子頁
  python3 /tmp/qsrc.py --loose 後漢書/卷71 '大賢良師'  # 容忍標點／換字空隙

常用選項:
  -i 忽略大小寫        -C N 上下文字數(預設 40)   -n N 最多幾筆(預設 25)
  --para 印整段        --headings 列章節標題      --anchor X 只搜某節
  --fresh 不用快取     --full 印全文              --candidates 顯示試過的頁名

原文以 ?action=raw 取 wikitext（MediaWiki API 在本機環境會 429），快取於
/tmp/qsrc-cache。卷號會自動試變體：卷58 / 卷058 / 卷001 / 卷第五十八 / 卷五十八。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CACHE = "/tmp/qsrc-cache"
MAPFILE = "/tmp/qsrc-map.json"
UA = "sanguozhi-3d-quote-audit/1.0 (local research script)"
QUIET = False
# 主機的選擇：中文史料用 zh.wikisource.org（預設）；
# 日本史料（日本書紀、吾妻鑑、武家諸法度等）用 --host ja.wikisource.org。
HOST = "zh.wikisource.org"


def cache_key(cand: str) -> str:
    """快取 key 要帶埋主機，否則同名頁喺 zh／ja 兩邊會互相污染。"""
    tag = "" if HOST == "zh.wikisource.org" else "@" + HOST
    return hashlib.sha1((cand + tag).encode()).hexdigest()


# ---------------------------------------------------------------- 卷號換算

CN_DIGITS = {
    "零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "壹": 1, "貳": 2, "參": 3, "肆": 4,
    "伍": 5, "陸": 6, "柒": 7, "捌": 8, "玖": 9,
}


def cn2num(s: str) -> int | None:
    """五十八 -> 58，卅 -> 30。解不了回傳 None。"""
    s = s.strip()
    if s.isdigit():
        return int(s)
    if not s:
        return None
    total = 0
    cur = 0
    seen = False
    for ch in s:
        if ch in CN_DIGITS:
            cur = CN_DIGITS[ch]
            seen = True
        elif ch == "十":
            cur = (cur or 1) * 10
            total += cur
            cur = 0
            seen = True
        elif ch in "百千":
            mult = {"百": 100, "千": 1000}[ch]
            cur = (cur or 1) * mult
            total += cur
            cur = 0
            seen = True
        else:
            return None
    return total + cur if seen else None


CN_ONES = "零一二三四五六七八九"


def num2cn(n: int) -> str:
    if n < 10:
        return CN_ONES[n]
    if n < 20:
        return "十" + (CN_ONES[n % 10] if n % 10 else "")
    if n < 100:
        return CN_ONES[n // 10] + "十" + (CN_ONES[n % 10] if n % 10 else "")
    return str(n)


def path_candidates(page: str) -> list[str]:
    """卷號寫法不統一，全部試一次。"""
    out = [page]

    def push(p: str) -> None:
        if p not in out:
            out.append(p)

    m = re.search(r"(卷第?)([0-9]+|[〇零一二三四五六七八九十百千兩]+)$", page.split("/")[-1])
    if not m:
        return out
    n = cn2num(m.group(2))
    if n is None:
        return out
    stem = page[: page.rfind(m.group(0))]
    for label in (f"卷{n:03d}", f"卷{n:02d}", f"卷{n}", f"卷第{num2cn(n)}", f"卷{num2cn(n)}", f"卷第{n:03d}"):
        push(stem + label)
    return out


# ---------------------------------------------------------------- 抓頁

def ssl_context():
    """macOS 的 python.org 版無內置 CA，依次試 certifi → /etc/ssl/cert.pem → 唔驗證。"""
    import ssl

    cafile = None
    try:
        import certifi

        cafile = certifi.where()
    except Exception:
        for cand in ("/etc/ssl/cert.pem", "/etc/pki/tls/certs/ca-bundle.crt"):
            if os.path.exists(cand):
                cafile = cand
                break
    try:
        return ssl.create_default_context(cafile=cafile) if cafile else ssl.create_default_context()
    except Exception:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        sys.stderr.write("警告：冇 CA 根證，改用唔驗證連線（只讀公開原文）\n")
        return ctx


_CTX = None

# 常用別名：Wikisource 收錄名同常用名唔同
ALIASES = {
    "左傳": "春秋左氏傳",
    "左氏傳": "春秋左氏傳",
    "春秋左傳": "春秋左氏傳",
    "通鑑": "資治通鑑",
    "司馬光通鑑": "資治通鑑",
}


def search_titles(query: str, limit: int = 12) -> list[str]:
    """用 MediaWiki 搜尋 API 搵頁名（ja 史料成日唔知正確標題）。"""
    os.makedirs(CACHE, exist_ok=True)
    url = ("https://" + HOST + "/w/api.php?action=query&list=search&srsearch="
           + urllib.parse.quote(query) + "&srlimit=" + str(limit) + "&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30, context=ssl_context()) as r:
            data = json.loads(r.read().decode("utf-8", "replace"))
        return [hit["title"] for hit in data.get("query", {}).get("search", [])]
    except Exception as e:
        sys.stderr.write("搜尋失敗 " + query + ": " + str(e) + "\n")
        return []

def follow_redirect(page: str, raw: str, fresh: bool = False, depth: int = 0) -> tuple[str, str] | None:
    """Wikisource 嘅 #REDIRECT [[X]] 手動跟一次。"""
    m = re.match(r"\s*#REDIRECT\s*\[\[([^\]|#]+)", raw, re.I)
    if not m or depth > 2:
        return page, raw
    return fetch_raw(m.group(1).strip(), fresh, depth=depth + 1) if depth < 3 else (page, raw)


def fetch_raw(page: str, fresh: bool = False, depth: int = 0) -> tuple[str, str] | None:
    """回傳 (實際頁名, wikitext)。404 就試卷號變體。"""
    global _CTX
    if depth > 3:
        return None
    os.makedirs(CACHE, exist_ok=True)
    if _CTX is None:
        _CTX = ssl_context()
    for cand in path_candidates(page):
        attempt = 0
        key = cache_key(cand)
        fp = os.path.join(CACHE, key + ".txt")
        cached = None
        if os.path.exists(fp) and not fresh:
            cached = open(fp, encoding="utf-8").read()
            if cached == "__404__":
                continue
        else:
            url = "https://" + HOST + "/wiki/" + urllib.parse.quote(cand) + "?action=raw"
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            try:
                with urllib.request.urlopen(req, timeout=30, context=_CTX) as r:
                    cached = r.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt == 0:
                    time.sleep(4)
                    attempt += 1
                    continue
                if e.code in (404, 401):
                    open(fp, "w", encoding="utf-8").write("__404__")
                    continue
                sys.stderr.write(f"抓取失敗 {cand}: HTTP {e.code}\n")
                return None
            except Exception as e:  # 離線等情況，讓呼叫端知道
                sys.stderr.write(f"抓取失敗 {cand}: {e}\n")
                return None
            open(fp, "w", encoding="utf-8").write(cached)
        got = follow_redirect(cand, cached, fresh, depth)
        return got if got else (cand, cached)
    return None


# ---------------------------------------------------------------- 清理 wikitext

def _template(m):
    """有內容嘅模板（例如 {{ProperNoun|曹操}}）要保留內文，否則人名會消失。"""
    body = m.group(1)
    if "=" in body.split("|")[0] or "|" not in body:
        return ""
    tail = body.split("|", 1)[1]
    return "" if "=" in tail else tail


def strip_markup(raw: str) -> str:
    t = re.sub(r"<(ref|references|nowiki|includeonly)[^>]*>.*?</\1>", " ", raw, flags=re.S)
    t = re.sub(r"<ref[^>]*/>", " ", t)
    t = re.sub(r"\{\|.*?\|\}", " ", t, flags=re.S)
    for _ in range(8):  # 模板可以套疊
        new = re.sub(r"\{\{([^{}]*)\}\}", _template, t)
        if new == t:
            break
        t = new
    for _ in range(4):  # -{}- 轉換標記（-{-}- 先拆）
        new = t.replace("-{-", "").replace("-}-", "")
        new = re.sub(r"-\{([^{}]*)\}-", r"\1", new)
        if new == t:
            break
        t = new
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", t)
    t = re.sub(r"^[*=#;:]+|[=]{2,}", " ", t, flags=re.M)  # wiki 標題／清單符
    t = re.sub(r"[{}''\[\]|]", "", t)
    t = t.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return t


def sections(text: str) -> list[tuple[str, str]]:
    """切成 (最近標題, 段落)。段落以空行分隔。"""
    paras, cur, head = [], [], ""
    for line in text.splitlines():
        h = re.match(r"^(={2,6})\s*(.*?)\s*\1\s*$", line.strip())
        if h:
            if cur:
                paras.append((head, "\n".join(cur).strip()))
                cur = []
            head = h.group(2)
            continue
        s = re.match(r"^\|?\s*section\s*=\s*([^|}\n]+)", line.strip(), re.I)
        if s:
            head = s.group(1).strip()
        if line.strip() == "":
            if cur:
                paras.append((head, "\n".join(cur).strip()))
                cur = []
        else:
            cur.append(line)
    if cur:
        paras.append((head, "\n".join(cur).strip()))
    return [(h, p) for h, p in paras if p]


# ---------------------------------------------------------------- 出處解析

LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]")


def clean_label(s: str) -> str:
    s = re.sub(r"-\{[^}]*\}-", lambda m: m.group(0)[2:-2], s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", s)
    return re.sub(r"[\s　·．、（）()「」”“]+", "", s).strip()


def subpages(book: str, fresh: bool = False) -> list[tuple[str, str, str]]:
    """索引頁里的子頁連結： (頁名, 錨點, 標籤)。書名唔啱就試別名。"""
    seen = set()
    for name in (book, ALIASES.get(book, ""), f"春秋{book}"):
        if not name or name in seen:
            continue
        seen.add(name)
        got = fetch_raw(name, fresh)
        if not got:
            continue
        real, raw = got
        root = real.split("/")[0]
        out = []
        for target, anchor, label in LINK_RE.findall(raw):
            target = target.strip()
            if target.startswith("/"):
                page = root + target
            elif target.split("/")[0] == root:
                page = target
            else:
                continue
            out.append((page, (anchor or "").strip(), clean_label(label or target.split("/")[-1])))
        if out:
            return out
    return []


def parse_cite(cite: str) -> tuple[str, list[str], str | None]:
    """《三國志·魏書·武帝紀》 -> (三國志, [魏書, 武帝紀], None)；帶卷號或年號就一併回傳。"""
    m = re.search(r"《([^》]+)》", cite)
    if not m:
        raise SystemExit(f"解析不到《書名》：{cite}")
    parts = [p.strip() for p in re.split(r"[·／/]", m.group(1)) if p.strip()]
    book = parts[0]
    chapters = parts[1:]
    tail = cite[m.end() :].strip()
    vol = re.search(r"卷\s*([0-9〇零一二三四五六七八九十百千兩]+)", tail)
    # 《左傳》襄公三十一年 呢類：》之後嘅編年文字都係線索引
    era = re.match(r"^([\u3400-\u9fff]{1,3}公?年?)\s*([〇零一二三四五六七八九十百千]+|\d+)", tail)
    if era and not vol:
        chapters = chapters + [era.group(1) + era.group(2)]
    return book, chapters, (vol.group(1) if vol else None)


def strip_notes(text: str) -> str:
    """去夾註：通鑑嘅（干支，公元NNN年）、校勘記「X」或作「Y」同双行小注會割斷正文。"""
    t = re.sub(r"（[^（）]{0,24}?公元[\d前後]+年?[^（）]{0,10}）", "", text)
    t = re.sub(r"\([^()]{0,24}?公元[\d前後]+年?[^()]{0,10}\)", "", t)
    t = re.sub(r"「[^」\n]{1,4}」或作「[^」\n]{1,4}」", "", t)
    return t


def cjk_only(q: str) -> str:
    return "".join(c for c in q if not re.match(PUNCT, c))


# 版本異體（同字唔同寫法）：唔當內容差異
VARIANTS = [
    "眾衆", "並并", "間閒", "裏裡", "峰峯", "悅悦", "略畧", "概槩",
    "遍徧", "群羣", "奸姦", "跡蹟", "竈灶", "癥症", "线線", "脈脉",
    "呉吳", "撃擊", "徧遍", "彊強", "郤卻",
]
CLASSES = {}
for grp in VARIANTS:
    for ch in grp:
        CLASSES[ch] = "[" + grp + "]"


def loose_pattern(q: str) -> str:
    """把引文砌成容錯正則：准許標點空隙同版本異體，但內容唔同就照報。"""
    parts = [CLASSES.get(c, re.escape(c)) for c in cjk_only(q)]
    return r"[^一-鿿]{0,6}".join(parts)


def _probe(text: str, chars: list[str]) -> dict:
    """喺 text 搵 chars 嘅最長前綴，報告邊個字開始分岔。"""
    full = re.compile(loose_pattern("".join(chars))).search(text)
    if full:
        return {"m": full, "matched": len(chars)}
    best, best_m = 0, None
    lo, hi = 1, len(chars)
    while lo <= hi:
        mid = (lo + hi) // 2
        mm = re.compile(loose_pattern("".join(chars[:mid]))).search(text)
        if mm:
            best, best_m, lo = mid, mm, mid + 1
        else:
            hi = mid - 1
    return {"m": best_m, "matched": best}


def check_quote(text: str, quote: str) -> dict:
    """逐字查證。引文可以用「……」省略，所以分段順序搵，唔要求成段連寫。"""
    segs = [cjk_only(s) for s in re.split(r"…+|⋯+", quote)]
    segs = [s for s in segs if len(s) >= 3] or [cjk_only(quote)]
    segs = [s for s in segs if s]
    if not segs:
        return {"status": "empty"}
    pos, start_at, total = 0, -1, sum(len(s) for s in segs)
    for idx, seg in enumerate(segs):
        m = re.compile(loose_pattern(seg)).search(text, pos)
        where = None
        if not m:  # 順序編排唔同，喺全文再搵一次
            m2 = re.compile(loose_pattern(seg)).search(text)
            where = "order" if m2 else None
            if m2:
                m = m2
        if not m:
            got = _probe(text, list(seg))
            detail = {"status": "mismatch", "segment": idx + 1, "segments": len(segs)}
            if not got["m"]:
                detail["status"] = "absent" if idx == 0 else "mismatch"
                detail["ours"] = seg[:8]
                return detail
            detail.update(
                chars=len(seg),
                matched=got["matched"],
                ours="".join(list(seg)[got["matched"] : got["matched"] + 6]),
                theirs=re.sub(r"\s+", "", text[got["m"].end() : got["m"].end() + 24])[:24],
            )
            return detail
        if where:
            pos = 0
        elif idx == 0:
            start_at = m.start()
        pos = max(pos, m.end())
    return {"status": "ok", "at": start_at, "chars": total}


def verify_batch(stream) -> list[dict]:
    """stdin 入 JSON：[{id, page?, cite?, quote}] → 逐條查證報告。"""
    global QUIET
    QUIET = True
    items = json.load(stream)
    out = []
    for it in items:
        rec = {"id": it.get("id", "")}
        quote = it.get("quote", "") or it.get("needle", "")
        cands = []
        if it.get("page"):
            cands.append((it["page"], None))
        for c in ([it["cite"]] if it.get("cite") else []) + list(it.get("cites") or []):
            cands.append((None, c))
        best = None
        for page, cite in cands:
            try:
                if not page:
                    page, _a, _w = resolve_cite(cite, scan=True)
                got = fetch_raw(page)
            except SystemExit as e:
                if best is None:
                    best = {"status": "unresolved", "why": str(e)[:120]}
                continue
            if not got:
                continue
            real, raw = got
            text = strip_notes(strip_markup(raw))
            if len(cjk_only(text)) < 200:
                continue
            res = check_quote(text, quote)
            res["page"] = real
            if res["status"] == "ok":
                best = res
                break
            score = res.get("matched", -1 if res["status"] == "absent" else -2)
            if best is None or score > best.get("matched", -3):
                best = res
        if best is None:
            best = {"status": "unresolved", "why": "所有出處都解析唔到"}
        rec.update(best)
        out.append(rec)
    return out


def volume_section(page: str, fresh: bool = False) -> str:
    """卷頁嘅 {{header2|section=...}}，例如「皇甫嵩朱儁列傳　第六十一」。"""
    got = fetch_raw(page, fresh)
    if not got:
        return ""
    _, raw = got
    m = re.search(r"section\s*=\s*(.*?)\s*(?:\||\}\})", raw, re.S)
    return clean_label(m.group(1)) if m else ""


def book_index(book: str, fresh: bool = False) -> dict:
    """{section 標籤: 頁名}，逐卷建立並落盤，可中途死咗再續。"""
    subs = [pg for pg, _, _ in subpages(book, fresh) if pg != book][:200]
    path = os.path.join(CACHE, "idx-" + hashlib.sha1((book + ("" if HOST == "zh.wikisource.org" else "@" + HOST)).encode()).hexdigest()[:12] + ".json")
    idx = {}
    if os.path.exists(path):
        try:
            idx = json.load(open(path, encoding="utf-8"))
        except Exception:
            idx = {}
    todo = [pg for pg in subs if pg not in idx]
    for n, page in enumerate(todo, 1):
        sec = volume_section(page, fresh)
        idx[page] = sec
        if n % 8 == 0 or n == len(todo):
            json.dump(idx, open(path, "w", encoding="utf-8"), ensure_ascii=False)
        time.sleep(0.12)
    return {v: k for k, v in idx.items() if v}


def scan_book(book: str, parts: list[str], fresh: bool = False) -> tuple[str, str] | None:
    """索引冇紀傳名時，用逐卷 section 索引搵啱嘅卷。"""
    idx = book_index(book, fresh)
    cores = []
    for p in parts:
        if not p:
            continue
        cores.append(p)
        cores.append(re.sub(r"(傳|紀|志|書|世家|載記|列傳)+$", "", p))
    for sec, page in idx.items():
        for c in cores:
            if len(c) >= 2 and c in sec:
                return page, sec
    return None


def resolve_cite(cite: str, fresh: bool = False, scan: bool = False) -> tuple[str, str, str]:
    """回傳 (頁名, 錨點, 說明)。找不到時印候選並退出。"""
    book, chapters, vol = parse_cite(cite)
    if vol:
        return f"{book}/卷{vol}", "", "由卷號直接拼頁名"
    amap = {}
    if os.path.exists(MAPFILE):
        amap = json.load(open(MAPFILE, encoding="utf-8"))
    key = clean_label(cite)
    if not fresh and key in amap:
        page, anchor = amap[key]
        if "/" in page:  # 舊快取可能存咗索引頁，忽略之
            return page, anchor, f"對照表 {MAPFILE}"
    # 有啲書直接以紀傳名做子頁（三國志/武帝紀 呢類），試埋
    for tail in chapters[::-1]:
        if fetch_raw(f"{book}/{tail}", fresh):
            return f"{book}/{tail}", "", "子頁名即紀傳名"
    subs = [s for s in subpages(book, fresh) if "/" in s[0]]  # 索引頁自身唔算正文
    if not vol and len(subs) > 3 and not chapters:
        raise SystemExit(f"{book} 要埋卷數（或編年，如《左傳》襄公三十一年）先查得到；索引頁冇正文")
    if not subs:
        raise SystemExit(f"索引頁搵唔到子頁：{book}（試 --toc {book}）")
    parts = [clean_label(c) for c in chapters]
    hits = []
    for page, anchor, label in subs:
        joined = label
        for p in parts:
            if p and (p in joined or joined in p):
                hits.append((page, anchor or label, label))
                break
    if not parts:
        hits = [(p, a, l) for p, a, l in subs]
    if not hits:
        parts_all = [clean_label(c) for c in chapters] or [clean_label(book)]
        if scan and chapters:
            sys.stderr.write(f"索引冇紀傳名，改逐卷掃描 {book}…\n")
            found = scan_book(book, parts, fresh)
            if found:
                page, sec = found
                amap[key] = [page, ""]
                json.dump(amap, open(MAPFILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                return page, "", f"逐卷掃描得 section：{sec}"
        if not QUIET:
            for p, a, l in subs[:24]:
                sys.stderr.write(f"  {p}" + (f"#{a}" if a else "") + f"  {l}")
        raise SystemExit(
            f"未能解析：{cite}（試 --toc {book} 睇子頁，或者 --scan {cite} 逐卷掃 section）"
        )
    page, anchor, label = hits[0]
    amap[key] = [page, anchor]
    json.dump(amap, open(MAPFILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return page, anchor, f"索引標籤：{label}" + (f"（另 {len(hits) - 1} 個候選）" if len(hits) > 1 else "")


# ---------------------------------------------------------------- 搜尋

PUNCT = r"[\s，。、；：！？「」『』『』（）()〈〉《》…—－\-·．]"


def snippet(text: str, m: re.Match, ctx: int, color: bool) -> str:
    a = max(0, m.start() - ctx)
    b = min(len(text), m.end() + ctx)
    pre = ("…" if a else "") + text[a : m.start()]
    hit = text[m.start() : m.end()]
    post = text[m.end() : b] + ("…" if b < len(text) else "")
    mark = f"\033[1m{hit}\033[0m" if color else f"【{hit}】"
    return pre + mark + post


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Wikisource 原文查證（快取 /tmp/qsrc-cache，出處對照 /tmp/qsrc-map.json）",
        epilog="離開碼：0 有匹配｜4 冇匹配｜1 搵唔到頁",
    )
    ap.add_argument("page", nargs="?", help="書名/卷N，例如 後漢書/卷71")
    ap.add_argument("pattern", nargs="?", help="正則（Python re 語法）")
    ap.add_argument("--cite", help="引文出處，例如 '《三國志·魏書·武帝紀》'")
    ap.add_argument("--toc", action="store_true", help="列索引頁的子頁")
    ap.add_argument("--headings", action="store_true", help="列章節標題")
    ap.add_argument("--full", action="store_true", help="印全文（去標記）")
    ap.add_argument("--para", action="store_true", help="匹配時印整段")
    ap.add_argument("--loose", action="store_true", help="容忍標點／異文空隙")
    ap.add_argument("--anchor", help="只搜標題含此字的段落")
    ap.add_argument("-i", "--ignore-case", action="store_true")
    ap.add_argument("-C", "--context", type=int, default=40, help="上下文字數，預設 40")
    ap.add_argument("-n", "--limit", type=int, default=25, help="最多幾筆，預設 25")
    ap.add_argument("--fresh", action="store_true", help="不讀快取")
    ap.add_argument("--candidates", action="store_true", help="顯示試過的頁名")
    ap.add_argument("--scan", action="store_true", help="紀傳名搵唔到時逐卷掃 section（慢，會快取）")
    ap.add_argument("--host", help="Wikisource 主機，預設 zh.wikisource.org；日本史料用 ja.wikisource.org")
    ap.add_argument("--search", metavar="詞", help="用搜尋 API 搵頁名（唔知正確標題時用）")
    ap.add_argument("--verify-batch", action="store_true", help="stdin 入 JSON 批次查證，出 JSON 報告")
    a = ap.parse_args()
    global HOST
    if a.host:
        HOST = a.host

    if a.search:
        hits = search_titles(a.search, a.limit)
        if not hits:
            raise SystemExit("搜尋冇結果：" + a.search + "（" + HOST + "）")
        for t in hits:
            print(t)
        raise SystemExit(0)

    if a.verify_batch:
        json.dump(verify_batch(sys.stdin), sys.stdout, ensure_ascii=False)
        return

    note = ""
    pattern = a.pattern
    if a.cite:
        page, anchor, note = resolve_cite(a.cite, a.fresh, a.scan)
        if pattern is None and a.page:  # 用 --cite 時正則會落入 page 位
            pattern, a.page = a.page, None
    elif a.page:
        page, anchor = a.page, (a.anchor or "")
    else:
        ap.print_help()
        raise SystemExit(2)

    if a.toc:
        subs = subpages(page, a.fresh)
        if not subs:
            raise SystemExit(f"索引頁冇子頁連結：{page}")
        for p, anc, label in subs:
            print(f"{p}" + (f"#{anc}" if anc else "") + f"\t{label}")
        raise SystemExit(0)

    got = fetch_raw(page, a.fresh)
    if not got:
        tried = "、".join(path_candidates(page))
        raise SystemExit(f"搵唔到頁：{page}（試過：{tried}）")
    real, raw = got
    if a.candidates:
        print("試過的頁名：" + "、".join(path_candidates(page)))
    paras = sections(raw)
    heads = [clean_label(h) for h, _ in paras if h]
    print(f"頁：{real}  https://{HOST}/wiki/{urllib.parse.quote(real)}")
    if note:
        print(f"解析：{note}")
    if heads:
        print("章節：" + "｜".join(dict.fromkeys(heads)))
    if a.anchor:
        picked = [(h, p) for h, p in paras if a.anchor in clean_label(h)]
        if picked:
            paras = picked
            print(f"已過濾至「{a.anchor}」：{len(picked)} 段")
        else:
            print(f"注意：冇標題含「{a.anchor}」的段，改用全文搜")
    if a.headings or not pattern:
        if not pattern:
            print("提示：俾正則就可以查證，例如 python3 /tmp/qsrc.py 後漢書/卷71 '大賢良師'")
        raise SystemExit(0)
    if a.full:
        print("\n".join(strip_markup(p) for _, p in paras))
        raise SystemExit(0)

    pat_src = loose_pattern(pattern) if a.loose else pattern
    try:
        rx = re.compile(pat_src, re.I if a.ignore_case else 0)
    except re.error as e:
        raise SystemExit(f"正語法錯誤：{e}")
    if a.loose:
        print(f"容錯正則：{pat_src}")

    color = sys.stdout.isatty()
    total = 0
    shown = 0
    for head, raw_p in paras:
        p = strip_markup(raw_p)
        for m in rx.finditer(p):
            total += 1
            if shown >= a.limit:
                continue
            shown += 1
            body = p if a.para else snippet(p, m, a.context, color)
            tag = clean_label(head) if head else "卷首"
            print(f"\n  ▸ {tag}")
            for line in body.splitlines():
                print("    " + line)
    if not total:
        print(f"\n冇匹配：{pattern}")
        raise SystemExit(4)
    print(f"\n匹配 {total} 處" + (f"（顯示首 {shown} 處）" if shown < total else "") + f"｜全文 {len(''.join(strip_markup(p) for _, p in paras))} 字")


if __name__ == "__main__":
    main()
