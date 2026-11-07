#!/usr/bin/env python3
"""wikisource.py — 原典全文快取＋逐字驗證（原 /tmp/qsrc.py，改放 repo 以免每輪重抓重寫）。

快取在 vendor/wikisource/（已 gitignore），抓過的書目自動記進 reports/wikisource-pages.txt，
所以下一輪只要 `python3 scripts/wikisource.py --warm` 就能把整批原文還原，不再打網路。

用法：
  python3 scripts/wikisource.py --warm                  # 還原清單上全部頁面（離線優先）
  python3 scripts/wikisource.py --show 宋書/卷97 倭讚     # 在某一頁找關鍵字（前後各兩行）
  python3 scripts/wikisource.py --verify '引文……引文'    # 逐字比對整份快取，回 OK / MISS 片段
  python3 scripts/wikisource.py --pages                 # 列已快取書目
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / 'vendor' / 'wikisource'
PAGES = ROOT / 'reports' / 'wikisource-pages.txt'
INVIS = re.compile('[\u200b\u200c\u200d\ufe00-\ufe0f]')
# 標點：古籍原本無標點，今本的句讀是整理者加的。引用時我們常自己斷句，
# 「南面朝天下。」在史記原文是「南面朝天下，國號曰…」的逗號——
# 若把標點算進逐字比對，會把正確的引文判成 MISS（假陰性）。
# 所以比對時去標點，並在輸出講明「逐字（不含標點）」，不要假裝比過句讀。
#
# 本輪補 U+FF0E `．` 與 U+201C/201D `“”`：實測快取內 `．` 出現 2531 次，全部是
# 春秋／左傳系頁面的句讀（「元年春．王三月．晉人執宋仲幾于京師．」），不是正文。
# 引文寫「冬十有一月庚午，蔡侯以吳子及楚人戰于柏舉，楚師敗績。」而轉錄本是
# 「…柏舉．楚師敗績．」——`．` 不去，跨句讀的引文必 MISS。这與 。 ， 同一類，
# 不是放寬比對。注意：`□`（缺字占位）**不加**，它是正文裡的缺字標記，刪掉會把
# 前後兩段併起來製造假命中。
#
# 第三個實測假陰性：`︰` U+FE30（垂直冒號之 presentation form）。《唐大和上東征傳》
# 頁內 41 次，正文作「白和上云︰『弟子等早知和上五遍渡海向日本國…』」；卡片引文
# 依慣例寫「：」，出處欄甚至自己註明「原文用『︰』，此處作『：』」。不去 `︰`
# 就會出現第一宗「可疑」（tang-753），但實際是標點形式不同，不是引文錯。
PUNCT = '。，、；：？！«»「」『』（）()《》〈〉〔〕［］,.!?;:\'"　…—～~·．“”‘’︰'
PUNCT_RE = re.compile('[' + re.escape(PUNCT) + ']')

# 異體字折字表（字形不同、字同一個）：本輪由 `resolve-unchecked.py --diff-audit`
# 從快取實測得來——每一對都是「同一句、斷後仍接回 6 字以上」的替代，不是猜的：
#   為/爲 3 次（元史、通鑑）、啟/啓 2 次（史記卷002 夏本紀「益讓帝禹之子啓」）、
#   吳/呉 2 次（通鑑卷081、卷086）、每/毎 1（通鑑卷086）、戶/戸 1（通鑑卷081）、
#   御/禦 1（春秋左氏傳/哀公「吳子禦之笠澤」，引文作「御」）。
#   卽/即：本輪第二次 diff 實測——通鑑卷086「琅邪王睿為安東將軍」一條整段 45/45 字
#     只差這一個字（轉錄本作「卽」）；Unicode 明列卽為即之異體。
#   劔/劍：後漢書卷72「劔履上殿」；Unicode 明列劔為劍之異體（收表以免日後再踩）。
#   鎭/鎮：本輪實測——通鑑卷086「假節，鎭建業」，引文作「鎮」。SKQS 系頁面多用鎭形。
# 刻意**不**折的（這些是異文／不同字，折了會製造假命中）：
#   于/於（介詞兩字并存，非異體；通鑑卷003 同一事寫「戰于丹陽」又寫「戰於藍田」，
#     是轉錄本自身用字不一，不是同一字的不同字形——所以 hanzhong 一條仍留未核，交人工），
#   陳/陣（三國志作「陷陳」、通鑑作「陷陣」，屬跨書異文）、
#   亡/喪（史記周本紀「既亡南國之師」，引文作「喪」，屬引文改字）。
#   出/與（214-yizhou 引「遂開城出降」、通鑑作「遂開城與簡雍同輿出降」，是引文省字，
#     不是字形——diff-audit 會把這種省字報成「替代對」，不可折）。
# 折字是字對字等長映射，不刪內容：原本已命中的引文一定仍命中（子序列關係不會因
# 等長映射而消失），所以這不會讓「與轉錄本一致」的舊數字掉，也不會把 apparatus 解進正文。
#   衆/眾：本輪實測——jin-311 引「王師頻為賊所敗，死者甚眾」，晉書/卷005 作「死者甚衆」，
#     同段 20/21 字逐字對齊、只差末字；Unicode 明列 U+773E 衆 為 U+774C 眾 之異體。
#     （不碰 众：那是另一個碼位，維持不動。）
VARIANT = str.maketrans({'爲': '為', '啓': '啟', '启': '啟', '呉': '吳',
                         '毎': '每', '戸': '戶', '禦': '御', '卽': '即',
                         '劔': '劍', '鎭': '鎮', '衆': '眾'})


def norm(s):
    """比對用：去空白、零寬字元與標點（維基文庫正文常插 U+200B），再折異體字。"""
    return PUNCT_RE.sub('', INVIS.sub('', re.sub(r'\s+', '', s))).translate(VARIANT)


def variant_check():
    """折字表的自我檢查：正例要能過、反例一定要不能過。改動 norm() 前後都要跑。"""
    bad = []
    # 正例：真實轉錄本片段 vs 卡片引文寫法（只差字形）
    for quote, transcript, why in [
        ('益讓帝禹之子啟而辟居箕山之陽', '益讓帝禹之子啓，而辟居箕山（之陽）', '啟/啓'),
        ('越子伐吳吳子御之笠澤夾水而陳', '越子伐吳．吳子禦之笠澤．夾水而陳', '御/禦'),
        ('帝謁高平陵大將軍爽與弟中領軍桓督諸軍發洛城', '帝謁高平陵．大將軍爽與弟中領軍桓督諸軍發洛城', '為/爲 同類字形'),
        ('戶口減舊時', '戸口減舊時', '戶/戸'),
        ('每有大役', '毎有大役', '每/毎'),
        ('吳人馬皆披靡', '呉人馬皆披靡', '吳/呉'),
        ('帝即位改元', '帝卽位改元', '卽/即（轉錄本作卽）'),
        ('劍履上殿', '劔履上殿', '劔/劍'),
        ('假節，鎮建業', '假節，鎭建業', '鎭/鎮'),
        ('王師頻為賊所敗死者甚眾', '王師頻爲賊所敗，死者甚衆', '衆/眾（晉書/卷005 實測）'),
    ]:
        if norm(quote) != norm(transcript):
            bad.append('正例失敗（%s）：%s ≠ %s' % (why, norm(quote), norm(transcript)))
    # 反例：不同字／跨書異文，折字後仍不可相等（这些是刻意留未核的，不是漏網）
    for a, b, why in [('于', '於', '于/於 不折（轉錄本自身两用）'),
                      ('陳', '陣', '陳/陣 不折（跨書異文）'),
                      ('亡', '喪', '亡/喪 不折（引文改字）'),
                      ('出', '與', '出/與 不折（引文省字，非字形）'),
                      ('众', '衆', '众 是另一個碼位，不與 衆 混'),
                      ('建業', '建鄴', '地名不同字'),
                      ('知', '智', '不同字'),
                      ('□', '', '缺字占位不去')]:
        if norm(a) == norm(b):
            bad.append('反例失敗（%s）：%s == %s' % (why, a, b))
    if bad:
        print('variant 自我檢查失敗：')
        for x in bad:
            print('  ' + x)
        return False
    print('variant 自我檢查通過（正例 %d / 反例 %d）' % (10, 8))
    return True


def clean_check():
    """clean() 的自我檢查：內容型模板要還原成正文（正例），書誌／注疏一定要留在正文外
    （反例）。改 clean() 前後都要跑——放寬或收緊都可能製造假命中。"""
    bad = []
    # 正例：這些模板包的是正文，整段刪掉＝刪正文 → 真引文變 MISS（都踩過）
    for wikitext, must_in in [
        ('{{專|禹}}於是遂即天子位', '禹於是遂即天子位'),
        ('{{ProperNoun|遼}}被甲持戟，先登陷陳', '遼被甲持戟'),
        ('廢時亂日。{{專|胤}}往征之，作{{書|胤征}}。', '胤往征之，作胤征'),   # 本輪修的
        ('{{Ruby|夜|ヤ}}來', '夜來'),
        ('守{{另|熒|滎}}陽', '守滎陽'),
        ('{{增|其}}嗣位', '其嗣位'),
        # 本輪修的第四個假陰性：巢狀內容模板（隋書/卷81 倭國傳實測原文）
        ('字{{ul|多利思{{另|比|北}}孤}}，號{{ul|阿輩雞彌}}', '多利思北孤號阿輩雞彌'),
    ]:
        t = norm(clean(wikitext))
        if norm(must_in) not in t:
            bad.append('正例失敗：%r 應含 %r，clean 後是 %r' % (wikitext, must_in, t))
    # 反例：apparatus／書誌一律不可進正文（解進來就會讓引文在他書注裡假命中）
    for wikitext, must_not_in in [
        ('{{*|{{CBox|集解|green}}{{green|韓詩章句曰：姜，姓。原，字。}}}}其母有邰氏女',
         '韓詩章句曰姜姓原字'),
        ('{{*|{{CBox|正義|#966}}因太王所居周原，因號曰周}}其母有邰氏女', '因太王所居周原'),
        ('前文{{SK notes|某本作某}}後文', '某本作某'),
        ('正文{{仮題|頁=46}}續文', '頁46'),
        ('{{nop}}正文{{刪|誤字}}續文', '誤字'),
        ('{{*|{{CBox|集解|green}}{{green|{{專|孔安國}}曰：逾，越也。}}}}踰于{{專|雒}}',
         '孔安國曰逾越也'),   # 集解本體（內含 {{書|…}} 也照舊刪），非正文
    ]:
        t = norm(clean(wikitext))
        if norm(must_not_in) in t:
            bad.append('反例失敗：%r 不應含 %r，clean 後是 %r' % (wikitext, must_not_in, t))
    if bad:
        print('clean 自我檢查失敗：')
        for x in bad:
            print('  ' + x)
        return False
    print('clean 自我檢查通過（正例 7 / 反例 6）')
    return True



def cache_key(page):
    """頁名 → 快取檔路徑（md5(lang + 頁名)，ja: 前綴決定 lang）。

    放這裡的理由：`corpus()` 是 glob 整個快取，`--warm`／清單是照頁名走，
    兩邊要能對上才談「清單 ↔ 快取一致」。之前這式子在 5 處各寫一遍，
    新增的 `quote-forensics.py --cache-audit`（雙向稽核）若再抄一份就是第 6 處，
    改哈希規則時必定對不上 → 假「缺頁」或假「孤兒頁」。判定行為不變：
    fetch() 只是把原本那行換成呼叫這裡。
    """
    lang = 'ja' if page.startswith('ja:') else 'zh'
    name = page[3:] if page.startswith('ja:') else page
    return CACHE / (hashlib.md5((lang + name).encode()).hexdigest() + '.txt')


def fetch(page, offline=False, _hop=0):
    """page 可加前綴 ja:（日文維基文庫），例：ja:信長公記。"""
    lang = 'zh'
    named = page                       # 記清單要用含前綴的原名，否則 warm 會去抓中文維基文庫
    if page.startswith('ja:'):
        lang, page = 'ja', page[3:]
    CACHE.mkdir(parents=True, exist_ok=True)
    key = cache_key(named)
    if key.exists() and key.stat().st_size > 0:
        return key.read_text()
    if offline:
        return 'NOT_CACHED'
    url = (f'https://{lang}.wikisource.org/w/api.php?action=parse&page=' +
           urllib.parse.quote(page) +
           '&prop=wikitext&redirects=1&format=json&formatversion=2')
    raw = None
    # 429 是实测到的（curl 空回應→JSON 解析失敗）。旧版只重試 4 次、退避 2-8 秒，
    # 对 MediaWiki 限速不够：會把「还没抓」变成「抓失敗」，清單與快取再度不一致。
    # 現在讀 HTTP 狀態碼：429/503 按 Retry-After 或指數退避（最長約 5 分鐘）重試。
    for attempt in range(7):
        out = subprocess.run(['curl', '-s', '-m', '40', '-A', 'quote-audit/1.0',
                              '-w', '\n@@HTTP:%{http_code}@@', url],
                             capture_output=True, text=True).stdout
        code = ''
        if '@@HTTP:' in out:
            code = out.rsplit('@@HTTP:', 1)[1].strip('@ \n')
            out = out.rsplit('\n@@HTTP:', 1)[0]
        if code in ('429', '503'):
            time.sleep(min(300, 15 * (2 ** attempt)))
            continue
        try:
            raw = json.loads(out)
            break
        except Exception:
            time.sleep(3 + 4 * attempt)
    if raw is None:
        return 'FETCH_FAILED'
    if 'error' in raw:
        return 'PAGE_NOT_FOUND: ' + raw['error'].get('info', '')
    t = raw['parse']['wikitext']
    # 導向頁不是正文。本輪實測：史記/卷033 的 wikitext 只有 17 字
    # 「#REDIRECT [[史記/魯周公世家]]」——世家/列傳的卷頁名是導向，真頁是章名頁。
    # URL 已帶 redirects=1；這裡留一道本地兜底，導向目標取自 API 回傳的 wikitext
    # 本體（不是我們編的頁名，鐵律 3），並把導向頁從清單與快取拿掉，
    # 否則清單上會留一個非正文頁，warm 也會一直還原它。
    if t.lstrip().lower().startswith('#redirect') and _hop < 2:
        m = re.search(r'\[\[([^\]|#]+)', t)
        target = m.group(1).strip() if m else ''
        if target and target != page:
            key.unlink()
            return fetch(target, offline, _hop + 1)
    # redirects=1 之後，parse 回传的 title 是**解析後**的正式頁名（取自 API 回應）。
    # 存成正式頁名並只把正式頁名記進清單：否則清單上會留「史記/卷033」這種導向名，
    # 而它裝的其實是史記/魯周公世家 的正文——下一輪 warm 就會還原出一個對不上的名字。
    canon = (raw['parse'].get('title') or '').strip()
    if canon and canon != page and lang == 'zh':
        ckey = CACHE / (hashlib.md5((lang + canon).encode()).hexdigest() + '.txt')
        ckey.write_text(t)
        known = PAGES.read_text().split('\n') if PAGES.exists() else []
        if canon not in known:
            with PAGES.open('a', encoding='utf-8') as f:
                f.write(canon + '\n')
        return t
    key.write_text(t)
    known = PAGES.read_text().split('\n') if PAGES.exists() else []
    if named not in known:
        with PAGES.open('a', encoding='utf-8') as f:
            f.write(named + '\n')
    return t


def unwrap_body(t):
    """把**內容型**模板（包的是正文，不是標註）解包一輪。
    巢狀結構單輪解不開，clean() 要反覆呼叫到不動點（見 clean 裡的實證）。"""
    t = re.sub(r'\{\{(?:ul|YL|注|lang|zh|c|Note|note)\|([^{}|]*)\}\}', r'\1', t)
    # 專／Ruby／SKchar 也是正文，不是標註：
    #   {{專|禹}}   = 專名（人名地名），zh.wikisource 對史記等大量使用（快取內 491 次）。
    #                之前的通用規則會把整個 {{專|禹}} 刪掉，正文變成「於是遂即天子位」，
    #                于是「禹於是遂即天子位」這種逐字比對永遠 MISS——這是 247 筆「未核」
    #                裡相当大一块的真實原因，不是引文錯。
    #   {{Ruby|夜|ヤ}} = 上標讀音，正文是「夜」；整段刪掉等於刪正文。
    #   {{SKchar|3951}} = 字位（十六進位 codepoint），不換回字就少一字。
    # 反面例子：{{SK anchor|…}}／{{SK notes|…}}／{{仮題|…}}／{{nop}} 屬書誌與 apparatus，
    # 不該進正文，維持往下刪的處理，否則會製造假命中。
    t = re.sub(r'\{\{專\|([^{}|]*)\}\}', r'\1', t)
    t = re.sub(r'\{\{Ruby\|([^{}|]*)(?:\|[^{}]*)?\}\}', r'\1', t)
    t = re.sub(r'\{\{SKchar\|([0-9A-Fa-f]{4,6})\}\}',
               lambda m: chr(int(m.group(1), 16)), t)
    # 本輪新增（實測假陰性，同一類）：《三國志》系頁面用 {{ProperNoun|張遼}} 包專名，
    # 快取內 1139 次。例：「{{ProperNoun|遼}}被甲持戟，先登陷陳」——整段刪掉就變成
    # 「被甲持戟」，引文「遼被甲持戟」必 MISS。這跟 {{專|禹}} 完全同一個 bug。
    # 另 {{合字|こと}}（日文本 Ligature，正文）、{{增|X}}（整理者補字，屬讀法）、
    # {{另|熒|滎}}（異文標記：正文取後一參，前一是他本写法，實測「守{{另|熒|滎}}陽」
    # 渲染作「守滎陽」）。{{刪|X}} 是整理者刪去的字，渲染不存在，維持刪。
    BODY_TPL = r'(?:ProperNoun|propernoun|Person|Place|專|ul|YL|合字|增)'
    for _ in range(6):
        t = re.sub(r'\{\{' + BODY_TPL + r'\|([^{}|]*)\}\}', r'\1', t)
        t = re.sub(r'\{\{' + BODY_TPL + r'\|([^{}|]*)\|[^{}]*\}\}', r'\1', t)
    # 本輪新增（實測假陰性，第三個同類 bug）：{{書|X}} 包的是**正文裡的書名**。
    # 史記/卷002 夏本紀原文作「……廢時亂日。{{專|胤}}往征之，作{{書|胤征}}。」，
    # 舊 clean 把 {{書|胤征}} 整段刪掉 → 正文變「作。」，引文「……胤往征之，作胤征」
    # 永遠 MISS（xia-zhongkang 就是這樣留在未核）。
    # 全快取 {{書| 共 441 次，但絕多數在集解/正義/索隱或 <ref> 裡——那些外層照舊整段刪，
    # 實測解包之後 corpus 只長 25 字，且退步 0、新增可疑 0，所以這是還原正文而非放水。
    # 只做單參數 {{書|X}}：多參數（{{書|尚書|禹貢}}）的渲染形式不確定，只取首參會
    # 插入半個書名，寧可不動。
    for _ in range(6):
        t2 = re.sub(r'\{\{書\|([^{}|]*)\}\}', r'\1', t)
        if t2 == t:
            break
        t = t2
    t = re.sub(r'\{\{另\|[^{}|]*\|([^{}|]*)\}\}', r'\1', t)
    return t


def clean(t):
    # 第四個同類假陰性（本輪實測）：**巢狀**的內容型模板單輪解不開。
    # 隋書/卷81 倭國傳原文：「字{{ul|多利思{{另|比|北}}孤}}，號{{ul|阿輩雞彌}}」——
    # 外層 {{ul|…}} 的參數裡含巢狀括號，不符合 [^{}|]*，第一輪 ul 迴圈解不開它；
    # 等 {{另|…}} 解成「多利思北孤」時 ul 迴圈已經跑完，於是後面「刪 apparatus」
    # 迴圈把整個 {{ul|多利思北孤}} 當標註刪掉 → 人名從正文消失，引文必 MISS（sui-607）。
    # 全快取此類巢狀內容模板實測 6 處（同頁另有「邪馬{{另|壹|臺}}國」「一{{另|大|支}}國」）。
    # 修法只是把解包做成不動點迴圈，且只碰內容型模板；書誌／apparatus（{{SK notes}}、
    # {{仮題}}、{{nop}}、CBox 注疏）照舊在 clean() 後半段整段刪，沒有放水。
    for _ in range(12):
        t2 = unwrap_body(t)
        t2 = re.sub(r'-\{(.{0,40}?)\}-', r'\1', t2)
        if t2 == t:
            break
        t = t2
    t = re.sub(r'<ref[^>]*/>', '', t)
    t = re.sub(r'<ref.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'<BR>', ' ', t)
    # 書誌／apparatus：一定要循環刪到沒有殘留。舊版只刪一層，遇到
    # {{*|{{CBox|正義|#966}}因太王所居周原…}} 這種巢狀注疏塊，內層刪掉後
    # 外層 {{*|…}} 不再匹配 `[^{}]*`，於是 2377 處集解／正義／索隱文字留在「正文」裡。
    # 後果有兩個：(1) 注疏文字進入 corpus → 標《史記》的引文可能在注疏引經文裡命中，
    # 證據較弱；(2) 注疏插在正文中間 → 跨注疏的引文被切斷，真引文變 MISS。
    # 循環刪除讓正文接回去，同時把 apparatus 真正排除（比舊版更嚴，不是放寬）。
    for _ in range(12):
        t2 = re.sub(r'\{\{[^{}]*\}\}', '', t)
        if t2 == t:
            break
        t = t2
    t = re.sub(r'\[\[([^\]|]*)\|?[^\]]*\]\]', r'\1', t)
    return t



# ---- 嚴格清洗（只診斷，不用於判定）----
# clean() 末段會把剩下的 {{...}} 整段刪掉。若某模板包的其實**是正文**，
# 刪掉會同時造成兩個後果：(1) 正文少字 → 真引文 MISS（假陰性，已修過 {{專}}、
# {{ProperNoun}}）；(2) 前後正文被**接起來** → 省了字的引文反而 MISS 變 HIT（假命中）。
# (2) 是更危險的那一種：它讓「與轉錄本一致」誇大實際核過的東西。
# 本輪實測到 2 條（都是 ja.wikisource《信長公記》舊假名本，用 {{r|漢字|讀音}}／{{傍点|…}}）：
#   1575-nagashino 引「五月廿一日辰刻取上旗首を推立を上」，轉錄本實作
#     「…旗首を推立{{r|凱|ガエ}}聲を上…」——省掉的「凱聲」正是被整段刪掉的正文。
#   1560-okinawaga 有一段（25 字）在嚴格版連 6 字錨都找不到，同樣靠刪除拼接才命中。
# 把 {{r}}／{{傍点}}／{{WavyBookMark}} 解成正文是**比較嚴**的做法，但現在不改 clean()：
# 改了這 2 條會從「與轉錄本一致」變成「可疑」（出處點名之頁已快取），閘門 14→16，
# 而修法只能是改 `src/**` 的引文（補 …… 標節略或改寫）——那屬被驗證對象，鐵律不許自動改。
# 所以這裡只做 `--strict-check`：把「命中靠刪除正文」的條目列出來交人工，判定不變。
STRICT_BODY_TPL = r'(?:r|傍点|WavyBookMark)'


def _wikilink(s):
    """[[A|B]]→B、[[A]]→A（MediaWiki 渲染顯示的是連結文字）。"""
    s = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', s)
    return s.replace('[[', '').replace(']]', '')


def clean_strict(t):
    """clean() 的更嚴版本：先解包上面三個內容型模板，再走同一份 clean()。
    只給 --strict-check 用；判定一律仍走 clean()。"""
    for _ in range(6):
        t2 = re.sub(r'\{\{WavyBookMark\|([^{}]*?)\}\}',
                    lambda m: '{{增|%s}}' % _wikilink(m.group(1)), t)
        t2 = re.sub(r'\{\{傍点\|(?:style=[^|]*\|)?([^{}]*?)\}\}',
                    lambda m: '{{增|%s}}' % _wikilink(m.group(1)), t2)
        t2 = re.sub(r'\{\{r\|([^{}|]*)(?:\|[^{}]*)?\}\}',
                    lambda m: '{{增|%s}}' % _wikilink(m.group(1)), t2)
        if t2 == t:
            break
        t = t2
    return clean(t)


def strict_check():
    """stdin 收 [{id,quote,source}]，印出「clean() 下命中、clean_strict() 下不命中」的條目。
    這些的『與轉錄本一致』是靠刪除正文換來的，要人工改引文或決定放規則。判定不變。"""
    items = json.load(sys.stdin)
    loose = corpus()
    strict = ''.join(norm(clean_strict(p.read_text())) for p in sorted(CACHE.glob('*.txt'))
                     if p.stat().st_size > 0)
    bad = []
    for it in items:
        q = (it.get('quote') or '').strip()
        frags = [f for f in q.split('……') if len(norm(f)) >= 6]
        if not frags:
            continue
        if not all(norm(f) in loose for f in frags):
            continue                      # 本來就不是「與轉錄本一致」
        lost = [f for f in frags if norm(f) not in strict]
        if lost:
            bad.append({'id': it['id'], 'lost': [f[:60] for f in lost],
                        'quote': q[:200], 'source': (it.get('source') or '')[:120]})
    print('與轉錄本一致 %d 條中，命中靠刪除正文（{{r}}/{{傍点}}/{{WavyBookMark}}）的：%d 條'
          % (len(items), len(bad)))
    for x in bad:
        print('- %s ｜ %s' % (x['id'], x['source']))
        for f in x['lost']:
            print('    嚴格版比對不到的片段：%s' % f)
    pathlib.Path(ROOT / 'reports' / 'strict-findings.json').write_text(
        json.dumps({'_about': 'audit 判「與轉錄本一致」、但換成嚴格清洗（解包 {{r}}/{{傍点}}/'
                              '{{WavyBookMark}}）就不一致的條目。這些的命中是靠刪除正文拼接來的，'
                              '要人工改 src 引文（補 …… 節略）或決定改 clean() 規則（會讓閘門變紅）。'
                              '本腳本不改判定。',
                    '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
                    'count': len(bad), 'items': bad},
                   ensure_ascii=False, indent=2), encoding='utf-8')
    print('已寫出 reports/strict-findings.json')
    return bad


def corpus(offline=True):
    """整份快取的正規化正文，供 --verify 逐字比對。"""
    return ''.join(norm(clean(p.read_text())) for p in sorted(CACHE.glob('*.txt'))
                   if p.stat().st_size > 0)


def verify(quote):
    body = corpus()
    frags = [f for f in quote.split('……') if len(f) >= 6]
    if not frags:
        frags = [quote]
    miss = [f for f in frags if norm(f) not in body]
    print('OK  ' if not miss else 'MISS', quote[:40])
    for m in miss:
        print('     缺：', m[:80])
    return not miss


def pages_list():
    return [p for p in (PAGES.read_text(encoding='utf-8').split('\n') if PAGES.exists() else []) if p]


_DIG = {'零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9}
_UNIT = {'十': 10, '百': 100, '千': 1000}
_ABBR = {'廿': 20, '卅': 30, '卌': 40}      # 卷次簡写（不是書册的「冊」）
VOL_CHARS = ('0-9零〇一二三四五六七八九十百千廿卅卌')


def volnum(tok):
    """把卷次寫法折成整數：003→3、一→1、十一→11、廿二→22、冊九→39、
    二百六十六→266。認不出回 None（讓呼叫端退化成書名比對），不拋例外、不猜。

    快取檔名用阿拉伯數字（卷003），出處文字用漢字（卷一、卷第冊九），
    字面比對永遠對不上——這是「未核」長期下不去的真實原因之一。

    註：第一版用分割式處理，遇到《資治通鑑》卷二百六十六 這種多段卷次
    會去查 _CN['二百六'] 而 KeyError。改成位置記數法解析。"""
    t = (tok or '').strip().replace('第', '')
    if not t:
        return None
    if t.isdigit():
        return int(t)
    if t[0] in _ABBR:
        rest = t[1:]
        if not rest:
            return _ABBR[t[0]]
        return _ABBR[t[0]] + _DIG[rest] if all(c in _DIG for c in rest) else None
    total, num = 0, 0
    for ch in t:
        if ch in _DIG:
            num = _DIG[ch]
        elif ch in _UNIT:
            total += (num if num else 1) * _UNIT[ch]
            num = 0
        else:
            return None
    return total + num


def vendored(source, return_page=False):
    """出處有沒有點名「已快取的那一卷」。點名了卻找不到＝可疑；
    根本沒快取這本書＝無法核對，不能算錯。

    return_page=True 時，回傳**匹配到的那个快取頁名**（給診斷用，例如
    quote-forensics.py --citation-gap 要知道「點名的是哪一卷」）。判定層的呼叫
    （verify_batch）一律用預設 False，行為與之前**完全相同**：卷次正則、
    whole_book 規則、索引頁／章名頁的處理一行都沒改。匹配邏輯只在此一家，
    診斷腳本不可複製一份。

    本輪修正（假可疑，實測）：抓《三國志》時先抓到索引頁「三國志」（只有 7290 字，
    是目錄＋提要）。舊規則 `if not vol: return True` 把索引頁當成「整本都在快取」，
    於是 20 條標《三國志》（含只是「參《三國志》某傳」）的引文一夜之間從未核變成可疑——
    但它的卷（三國志/卷01…卷58）根本沒抓，沒有任何「我們有這一卷卻找不到」的依據。
    現在：書名沒有卷次的頁，只在「該書別無其他卷次頁」時才算整本；有多卷的書，
    索引頁不構成整本覆蓋，必須點名到具體卷才算。
    """
    whole_book = {}
    for p in pages_list():
        name = p[3:] if p.startswith('ja:') else p
        book, _, vol = name.partition('/')
        if vol:
            whole_book[book] = whole_book.get(book, 0) + 1
    for p in pages_list():
        name = p[3:] if p.startswith('ja:') else p
        book, _, vol = name.partition('/')
        if book not in source:
            continue
        if not vol:                       # 整本都在快取（前提：這本書沒有分卷頁）
            if whole_book.get(book, 0) == 0:
                return p if return_page else True
            continue
        want = volnum(vol.replace('卷', ''))
        if want is None:
            # 卷次不是數字：要嘛是索引頁（三國志），要嘛是章名頁（史記/魯周公世家——
            # 本輪經 redirects 解析出來的真頁就是這種）。
            # 舊規則在這裡退化成一比「書名有沒有出現在出處」→ 本輪加進 史記/魯周公世家
            # 之後，13 條標《史記》的引文一夜變成可疑（實測 reports/quotes-audit.json），
            # 但這些出處多數根本沒點名我們有的那一卷（《史記·周本紀》的卷四是另一頁）。
            # 這跟上一輪「索引頁不算整本覆蓋」是同一個教訓，所以收緊：章名頁只有
            # **出處點名了該 section**（《左傳》哀公元年 ↔ 春秋左氏傳/哀公）才算這一卷在庫。
            key = vol.replace('卷', '').split('/')[0]
            if key and key in source:
                return p if return_page else True
            continue
        # 出處裡的卷次可能是漢字或阿拉伯數字，兩邊都折成整數再比
        for m in re.finditer(re.escape(book) + r'[^》』]{0,14}卷\s*第?\s*([0-9一二三四五六七八九十廿卅卌百]+)', source):
            if volnum(m.group(1)) == want:
                return p if return_page else True
    return False


def verify_batch():
    """stdin 收 [{"id":…,"quote":…,"source":…}]，回每條判定：
      ok        逐字命中快取
      suspect   出處點名了已快取之卷，但找不到＝引文可能有誤（該修）
      unchecked 該書未快取，無法核對（不算錯）
    給 audit-quotes.ts 呼叫；清洗與比對邏輯只有一份，勿在別處重寫。"""
    items = json.load(sys.stdin)
    body = corpus()
    out = []
    for it in items:
        q = (it.get('quote') or '').strip()
        frags = [f for f in q.split('……') if len(norm(f)) >= 6]
        if not frags:
            out.append({'id': it['id'], 'verdict': 'noquote', 'frags': 0})
            continue
        miss = [f for f in frags if norm(f) not in body]
        verdict = 'ok' if not miss else ('suspect' if vendored(it.get('source') or '') else 'unchecked')
        out.append({'id': it['id'], 'verdict': verdict, 'frags': len(frags),
                    'miss': [m[:60] for m in miss]})
    json.dump(out, sys.stdout, ensure_ascii=False)


def show(page, pattern, before=0, after=2, width=1300):
    t = clean(fetch(page))
    if t.startswith(('PAGE_NOT_FOUND', 'FETCH_FAILED', 'NOT_CACHED')):
        print(t)
        return
    lines = [l.strip() for l in t.split('\n') if l.strip()]
    hits = 0
    for i, l in enumerate(lines):
        if re.search(pattern, l):
            hits += 1
            print('--- hit %d (line %d) ---' % (hits, i + 1))
            print(' '.join(lines[max(0, i - before): i + after])[:width])
            print()
            if hits >= 4:
                print('(more hits suppressed)')
                break
    if not hits:
        print('NO MATCH for', pattern, 'in', page)


def find(keyword, limit=8):
    """查書名／卷名的正確 page 標題（猜錯標題是這輪浪費的來源之一）。"""
    url = ('https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch=' +
           urllib.parse.quote(keyword) + '&srlimit=' + str(limit) + '&format=json&formatversion=2')
    out = subprocess.run(['curl', '-s', '-m', '30', '-A', 'quote-audit/1.0', url],
                         capture_output=True, text=True).stdout
    try:
        for r in json.loads(out)['query']['search']:
            print(r['title'])
    except Exception:
        print('SEARCH_FAILED')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
    elif a[0] == '--find':
        find(a[1])
    elif a[0] == '--warm':
        pages = [p for p in (PAGES.read_text().split('\n') if PAGES.exists() else []) if p]
        bad = [p for p in pages if fetch(p).startswith(('PAGE_NOT_FOUND', 'FETCH_FAILED'))]
        print('warm %d 頁，失敗 %d：%s' % (len(pages), len(bad), ' '.join(bad)))
    elif a[0] == '--volnum':
        # 自我檢查：快取檔名用阿拉伯數字（卷003）、出處文字用漢字（卷一、卷第卅九），
        # 兩邊要折成同一整數才算同一卷；折錯就會把可核的引文永久留在「未核」。
        if not variant_check():
            sys.exit(1)
        if not clean_check():
            sys.exit(1)
        bad = []
        for tok, want in [('003', 3), ('一', 1), ('四', 4), ('十一', 11),
                          ('冊', None), ('冊', None), ('冊', None)][:5]:
            got = volnum(tok)
            if got != want:
                bad.append('volnum(%s) = %s，期望 %s' % (tok, got, want))
        for src, page, same in [('《吾妻鏡》卷一 治承四年', '吾妻鏡/卷001', True),
                                ('《吾妻鏡》卷四 屋嶋條', '吾妻鏡/卷004', True),
                                ('《吾妻鏡》卷一', '吾妻鏡/卷004', False),
                                ('《日本書紀》卷第廿二', '日本書紀/卷第廿二', True)]:
            m = re.search(r'卷\s*第?\s*([0-9零〇一二三四五六七八九十百千廿卅卌]+)', src)
            a = volnum(m.group(1))
            b = volnum(page.split('/')[-1].replace('卷', ''))
            if (a == b) != same:
                bad.append('%s 與 %s：卷次 %s vs %s，應%s' % (src, page, a, b, '相同' if same else '不同'))
        if bad:
            print('volnum 自我檢查失敗：')
            for x in bad:
                print('  ' + x)
            sys.exit(1)
        print('volnum 自我檢查通過')
    elif a[0] == '--pages':
        print(PAGES.read_text() if PAGES.exists() else '(empty)')
    elif a[0] == '--variant-check':
        sys.exit(0 if variant_check() else 1)
    elif a[0] == '--clean-check':
        # 清洗層自我檢查：內容型模板要還原正文、apparatus 不可進正文
        sys.exit(0 if clean_check() else 1)
    elif a[0] == '--verify':
        ok = all(verify(q) for q in a[1:])
        sys.exit(0 if ok else 1)
    elif a[0] == '--verify-batch':
        verify_batch()
    elif a[0] == '--strict-check':
        # 只診斷：列出現有「與轉錄本一致」裡靠刪除正文拼接才成立的命中（不改判定）
        strict_check()
    elif a[0] == '--show':
        show(a[1], a[2],
             int(a[3]) if len(a) > 3 else 0,
             int(a[4]) if len(a) > 4 else 2)
    else:
        print('unknown flag')
        sys.exit(2)
