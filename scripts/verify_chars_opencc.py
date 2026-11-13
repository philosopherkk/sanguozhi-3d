#!/usr/bin/env python3
r"""全庫逐字覆核（opencc）：搵出「喺中文敘述裡必錯」嘅字形（簡體字＋日文新字）。

呢支係**覆核工具，唔係閘門**（2026-11-14 使用者裁定：入庫，但唔入 gates）。
點解唔入 gates：opencc 會把正字報疑（征夷大將軍／范陽／后族／台灣／知床 等），
佢只適合逐條人睇；硬入閘門就會逼人把誤報寫入豁免，等於把閘門改到冇牙——
本專案已記過五次同一根因。真正把關嘅係 `npm run audit:chars`（連同佢嘅 --teeth
同 `audit:teeth-mutations` 嗰 25 項突變）。

點解仲要呢支：audit-chars 嘅 HARD 表係「見到哪個錯字補哪個」＋ opencc 系統性推導
長出来嘅；本支另外用 opencc STCharacters 全表＋手寫日文新字表，並**直接從閘門
原始碼解析 HARD 表**，所以工具同閘門嘅字表唔會分岔。両邊重疊之後多報出嚟嘅嘢
要人判，而「人判」呢一步正正係閘門做唔到嘅。

判準（四層）：
  1. 候選字集 = opencc STCharacters（簡→繁）∪ 手寫日文新字表 ∪ scripts/audit-chars.ts 嘅 HARD 表。
  2. 保護區：『…「…《…》…『』、`code`、URL、WIKI('…')（維基條目名要照原條目標題，
     改咗會斷連結）、以及引文／出處欄（含多行字串：向後回溯所屬欄名）照原典字形——
     呢個係 AGENTS.md 嘅要求。
  3. 含假名嘅行唔再整行跳過（嗰個係上一版嘅洞，azuchiPack「幕府残黨」就係咁逃咗）：
     日文原文嘅字一定挨住假名，我哋嘅中文敘述唔會，所以只報「離任何假名 ≥4 格」嘅字。
  4. KEEP／KEEP_PHRASE 係逐條判讀過保留原形嘅字與專名（理由見 docs/MOBILE_PLAN.md open item G）。

用法：
  pip3 install opencc-python-reimplemented      # 唯一外部依賴（本 repo 冇 pyproject，同 numpy 一樣靠本機）
  npm run verify:chars-opencc                   # 全庫覆核；永遠 exit 0（誤報係預期，唔係失敗）
  python3 scripts/verify_chars_opencc.py --teeth  # 注入壞字，證明工具會咬（咬唔到即 assert 失敗）
  python3 scripts/verify_chars_opencc.py --strict # 有命中即 exit 1（自己清完先好用）

安全（硬性要求）：`--teeth` 嘅注入檔寫落 mkdtemp，**永遠唔喺 repo 落盤**；跑完再用
`git status --porcelain` 前後對照，一旦有變化就當本次失敗。
  （教訓：temp 版係寫 `src/__teeth_tmp__.ts`，中途斷喺會留低喺 src/ 入面，
    會被 `git add -A` 誤收——所以嗰版作廢，呢版唔准重犯。）

本檔入面嘅資料點樣睇（依 AGENTS.md「只換字形、不改用字」嘅判準）：
  - 敘述（呢段註解在内）一律正體書面語。
  - JP／KEEP／KEEP_PHRASE 三張表入面嘅字形**照原形**：佢哋係「原典字形／兩用字／
    可追蹤識別碼（維基條目名、dataset 名）」，正正係規則話唔准郁嘅嗰類；改咗就唔再
    係同一張表，亦會令覆核工具自己變錯。
  - 唯獨 TEETH_TEXT／want 係**我方注入**嘅探針，唔属于原文，所以用 \uXXXX 轉義，
    唔為本檔開「按檔名豁免」。
"""
import os
import re
import subprocess
import sys
import tempfile

# repo 根由腳本位置推導（temp 版硬寫絕對路徑，換部機就跑唔到）
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DD = os.path.join(os.path.dirname(__import__('opencc').__file__), 'dictionary')

ST = {}
for line in open(os.path.join(DD, 'STCharacters.txt'), encoding='utf-8'):
    p = line.split()                       # STCharacters 係 TAB 分隔，split() 先食到
    if len(p) >= 2 and len(p[0]) == 1 and p[1] != p[0]:
        ST[p[0]] = p[1]
assert len(ST) > 3000, f'STCharacters 只解析出 {len(ST)} 條，一定是分隔符號錯了'

# opencc 字典冇、或者方向唔啱嘅日文新字（JIS 新字体）——第一輪就係漏喺呢度
JP = {'両': '兩', '団': '團', '陥': '陷', '廃': '廢', '済': '濟', '権': '權',
      '鉄': '鐵', '収': '收', '黒': '黑', '歳': '歲', '広': '廣', '瀬': '瀨',
      '郷': '鄉', '摂': '攝', '関': '關', '県': '縣', '戸': '戶', '拝': '拜',
      '斎': '齋', '亀': '龜', '塩': '鹽', '覇': '霸', '譲': '讓', '蔵': '藏',
      '択': '擇', '従': '從', '伝': '傳', '豊': '豐', '気': '氣', '価': '價',
      '円': '圓', '転': '轉', '醸': '釀', '庁': '廳', '圧': '壓', '戦': '戰',
      '亜': '亞', '効': '效', '歴': '歷', '満': '滿', '頼': '賴', '焼': '燒',
      '撃': '擊', '捜': '搜', '脳': '腦', '帯': '帶', '曽': '曾', '囲': '圍',
      '毎': '每', '専': '專', '仏': '佛', '剣': '劍', '厳': '嚴', '呉': '吳',
      '歩': '步', '晩': '晚', '麦': '麥', '黙': '默', '抜': '拔', '変': '變',
      '発': '發', '辺': '邊', '竜': '龍', '舎': '捨', '圏': '圈', '繍': '繡',
      '痩': '瘦', '獣': '獸', '塀': '屏', '竪': '豎', '閲': '閱', '桜': '櫻'}

# 直接從閘門解析 HARD 表，避免工具與閘門嘅字表分岔
src = open(os.path.join(REPO, 'scripts', 'audit-chars.ts'), encoding='utf-8').read()
block = re.search(r'const HARD: Record<string, string> = \{(.*?)\n\}', src, re.S)
assert block, '解析不到 HARD 表'
HARD = dict(re.findall(r"(\S)\s*:\s*'(\S+)'", block.group(1)))
assert len(HARD) > 60, f'HARD 表只有 {len(HARD)} 條，解析錯了'

BAD = {}
BAD.update(ST)
BAD.update(JP)
BAD.update(HARD)

# 逐條判讀為「保留原形」：正字／原典字形／兩用字／日文專名（每條都有理由，唔係湊數）
KEEP = set('斗沈台征面卷状区并云余只才布占于后咸范岳群系注采舍挽淀俣猫朴庄愿彦晋游岩栖床'
           '吃庵筑厦携伙湾荆苧梼慭吓晒砗輼衆峰梅悌苅俵里干准丑辟秘尸托予疏緒御偽為栗松'
           '至治與興灯涌仆雇平恒迹猪凶咨灶録徳実国旧図対歴巻'   # 実国録徳：閘門亦視為日文正確字形
           '氷号並弐')
# 判讀過保留嘅專名／引文片段（日文條令名、dataset 名、書誌用語、中文人名）
KEEP_PHRASE = ['打払令', '増鏡', '花営三代記', '迹見赤', '最上德内', '寺内正毅', '木古内',
               '岩内', '王芸生', '猪俣邦憲', '群書類従', '松江重頼', '太田全斎', '仮名手本忠臣蔵',
               '忠臣蔵', '以心伝心', '七転八起', '花より団子', 'CODH 旧国', '旧国・旧郡',
               '旧高旧領', '国立歴史民俗博物館', '蝦夷地対策', '関連記録', '阪巻', '巻第二十六',
               '锁国令', '西伯利亚干涉', '英帕尔战役', '朴茨茅斯和约', '逍遥津之战', '源义朝',
               '源赖朝', '源义平', '大阪の町', '知らぬが仏', '我が田', '近世以後則轉為對免債']
BAD = {k: v for k, v in BAD.items() if k not in KEEP}
assert len(BAD) > 3000, f'候選字集只有 {len(BAD)}，一定解析錯了'

# 跳過（每條都要寫憑什麼）：
#   Meshes/Avatars/.gen./vendor  產生物；audit-*/fetchArticle  偵測表本身含目標字
#   scripts/legacy、docs/legacy  過手嘅交接與分診紀錄，內容就係在記「哪一條被拒、
#     因為哪個簡體字」，改掉等於塗改證據
#   ENRICH_MERGE_*、HANDOVER-*、OVERNIGHT_TASKS  同上，係證據行與日文引文摘錄
#   SCHEDULED_AGENTS  使用者嘅半成品，唔准動
SKIP = re.compile(r'Meshes|Avatars|\.gen\.|vendor/|audit-chars|audit-data|audit_|fetchArticle'
                  r'|scripts/legacy/|docs/legacy/|scripts/qsrc\.py|merge-enrich|SCHEDULED_AGENTS'
                  r'|package-lock|ENTRY_AUDIT|QUOTE_AUDIT'
                  r'|ENRICH_MERGE_|HANDOVER-|OVERNIGHT_TASKS')
KANA = re.compile('[\u3041-\u309f\u30a1-\u30fa\u30fc]')  # ・(U+30FB) 與 ー(U+30FC) 唔係假名字母
SPAN = re.compile(r'[『「《][^』」》\n]{1,60}[』」》]|`[^`\n]{1,24}`|https?://\S+'
                  r'|WIKI(?:_JA)?\(\s*[\'"][^\'"]*[\'"]\s*\)')
# 引文／出處欄：照原典字形（AGENTS.md）。多行字串嘅欄名喺第一行，所以要向後回溯。
CITE_INLINE = re.compile(r'(classicQuote|classicSource|outcomeSource|primary_source|sourceLabel'
                         r'|source_plate|sources|source|entrySource|quoteHeading|quote|cite|url'
                         r'|wikiUrl|zhwikiUrl|wikisource|lemma)\s*[:=]')
CITE_FIELD = re.compile(r'^\s*"?(classicQuote|classicSource|outcomeSource|primary_source|sourceLabel'
                        r'|source_plate|sources|source|entrySource|quoteHeading|quote|cite|url'
                        r'|wikiUrl|zhwikiUrl|wikisource|lemma)"?\s*[:=]')
OTHER_FIELD = re.compile(r'^\s*[A-Za-z_"]+\s*[:=]')
# 内→內 係詞語級規則（「內」喺「德内／岩内／木古内／寺内」呢類日文專名裡保留）
NEI = re.compile(r'(?<![德寺大小木岩])内')

TEETH = '--teeth' in sys.argv
STRICT = '--strict' in sys.argv
# 注入嘅壞字用 \uXXXX：呢啲係我方探針，唔屬於「原文／識別碼」嗰類，所以唔豁免。
# 對照（正體寫法，只俾人睇，唔係資料本體）：誰繼殘 専団済郷両 戦転黒円庁 帯剣舎晩黙抜
TEETH_WANT = ('\u8c01\u7ee7\u6b8b\u5c02\u56e3\u6e08\u90f7\u4e21'
              '\u6226\u8ee2\u9ed2\u5186\u5e81\u5e2f\u5263\u820e'
              '\u6669\u9ed9\u629c')
TEETH_TEXT = '// 注入測試：' + TEETH_WANT + '\n'


def git_status():
    return subprocess.run(['git', 'status', '--porcelain'], cwd=REPO,
                          capture_output=True, text=True).stdout.strip()


status_before = git_status()
probe_dir = None
probe_path = None
if TEETH:
    # 注入檔只能落 mkdtemp。喺 repo 落盤就係之前作廢嗰版嘅做法。
    probe_dir = tempfile.mkdtemp(prefix='verify-chars-opencc-')
    probe_path = os.path.join(probe_dir, 'teeth_probe.ts')
    open(probe_path, 'w', encoding='utf-8').write(TEETH_TEXT)

files = [f for f in subprocess.run(['git', 'ls-files', 'src', 'scripts', 'docs'], cwd=REPO,
                                   capture_output=True, text=True).stdout.split('\n') if f]
files = [f for f in files if f.endswith(('.ts', '.tsx', '.json', '.mjs', '.py', '.css', '.md'))
         and not SKIP.search(f)]
if TEETH:
    files.append(probe_path)          # 絕對路徑：os.path.join 會直接俾佢通過

hits, teeth_hit = [], False
try:
    for rel in files:
        try:
            text = open(rel if os.path.isabs(rel) else os.path.join(REPO, rel),
                        encoding='utf-8').read()
        except (UnicodeDecodeError, OSError):
            continue
        is_probe = os.path.isabs(rel)
        lines = text.split('\n')
        for idx, raw in enumerate(lines):
            if not is_probe:
                in_cite = bool(CITE_INLINE.search(raw))
                if not in_cite:
                    for back in range(idx, max(-1, idx - 80), -1):
                        if CITE_FIELD.match(lines[back]):
                            in_cite = True
                            break
                        if OTHER_FIELD.match(lines[back]):
                            break
                if in_cite:
                    continue
            scanned = raw
            for kw in KEEP_PHRASE:            # 哨兵要唯一：長度相同會互踩（round4 踩過）
                scanned = scanned.replace(kw, '\x01')
            scanned = SPAN.sub(lambda m: '　' * len(m.group(0)), scanned)
            kana_pos = [m.start() for m in KANA.finditer(scanned)]
            for ch in set(scanned) & set(BAD):
                for j in [n for n, c in enumerate(scanned) if c == ch]:
                    if kana_pos and min(abs(j - k) for k in kana_pos) < 4:
                        continue             # 挨住假名＝日文原文字形，唔動
                    if ch == '内' and j and scanned[j - 1] in '德寺大小木岩':
                        continue             # 最上德内／岩内／木古内／寺内：日文專名
                    hits.append((rel, idx + 1, ch, BAD[ch], scanned[max(0, j - 22):j + 24]))
                    if is_probe:
                        teeth_hit = True
                    break
finally:
    if probe_dir:
        import shutil
        shutil.rmtree(probe_dir, ignore_errors=True)

# 零落盤係硬性要求：對照唔到就係工具壞，唔係「冇嘢好報」。
status_after = git_status()
if status_after != status_before:
    print('✗ 呢支工具喺 repo 落咗盤（硬性禁止）：\n' + status_after)
    sys.exit(1)

label = lambda f: '注入樣本' if os.path.isabs(f) else f
# SKIP 係一支會退化嘅嘢：一旦有人寫咗一條食太寬嘅規則，掃描清單會靜悄悄變空，
# 之後成支援覆核就永遠「命中 0 處」。呢度用下限釘住佢（同 audit:map 嘅探針斷言同一手法）。
assert len(files) > 300, f'掃描清單只剩 {len(files)} 檔，SKIP 一定食太寬了'
print(f'掃描 {len(files)} 檔，候選字 {len(BAD)} 種')
print(f'命中 {len(hits)} 處')
if TEETH:
    want = set(TEETH_WANT)
    got = {h[2] for h in hits if os.path.isabs(h[0])}
    print(f'注入測試：注入 {len(want)} 種，咬到 {len(got)} 種 → {"".join(sorted(got))}')
    miss = want - got
    assert not miss, f'注入嘅壞字咬唔到：{"".join(sorted(miss))}——工具係壞嘅'
    assert teeth_hit, '注入樣本完全冇命中——掃描範圍冇計佢'
print()
for rel, i, ch, to, ctx in hits:
    print(f'{label(rel)}:{i}  {ch}→{to}  …{ctx}…')

if STRICT and hits:
    sys.exit(1)
