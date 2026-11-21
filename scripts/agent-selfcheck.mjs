#!/usr/bin/env node
/**
 * agent-selfcheck.mjs — 排程 agent 收工前的「新增行」自檢。
 *
 * 只看本輪新增的行（git diff <base>，含已 commit 與未 commit 的追蹤檔），查小模型最常犯的四種錯：
 *   1. 簡體字（常見簡體專用字；完整字表仍以 npm run audit:chars 為準）
 *   2. 粵語虛詞（src/ 內一律不准；docs/、scripts/ 允許但不在此檢查範圍）
 *   3. 拉丁亂碼夾在中文前（[A-Za-z]{4,} 後面緊接中日文字）與工具呼叫殘骸
 *   4. 新出現的漢字：列出「base 版本沒有出現過的字」，逐個人工核對碼位
 *      （將／隊／潰／擱／無 常被打成相近的錯字，錯字也是合法 Unicode，只能靠這一步看出來）
 *
 * 用法：node scripts/agent-selfcheck.mjs [base]    base 預設 origin/main
 * 結束碼：1＝第 1–3 項有命中（必須修）；0＝無命中（第 4 項仍要自己看）。
 */
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const commitsOnly = args.includes('--commits')
const base = args.find((a) => !a.startsWith('--')) || 'origin/main'
const git = (...a) =>
  execFileSync('git', a, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

// chars-block-start 簡體字偵測表：本檔的用途就是列出簡體字
const SIMPLIFIED = new Set(
  ('条关实录奥议泽荣说让们这时体线补织国图书军将师众旧举艺显区杀属续归乱号单尽隐稳独异' +
    '战点击统称观认产义习当个转办飞从头记团队长门间东车马岛汉语话设应术阶伤价优运还' +
    '写变读误难边类医银钱响极连进远迁过为则约悬纪证评论许访诉详趋宪协简卖厅圣' +
    '级来这发会对没后开关兴业丛两严乐习书买乱争亏亚仅从仓价众优伙伟传伤伦伪体余佣侠侣' +
    '侥侦侧侨俭债倾偿储兑党兰养兽冲决况净凉减凤击刘则刚创删别剧剑剂劝办务动励劲势勋' +
    '匀华协单卫却厂历压厌县参双变叙叠号叹后吗启员呐咏响哑唤啸喷嘘团园围图坏坛垒垦' +
    '备复够头夹奋奖妆妇妈姗娱孙学宁宝实宠审宪宫寻导寿将尔尘尝层岁岭岳峡币帅师帐帘帮' +
    '广庆库应庙废开异弃张弹强归当录彦彻惊惨惯愿慑扑执扩扫扬换损摄摆撑擞攒敌数斗断' +
    '无旷昙显晋晓暂术杂权条枪枫构标栈样档桥梦检楼欢欧毕毙气汇汤沟泪泽洁洒浅测济浏浑' +
    '涛润涨渐渔湾湿溃滚滞满滤滨灭灵灾灿炉炼烁烂烟烦热爱爷牍牺犹狭狮独狱猎猪猫献' +
    '环现玛珐琐电画畅畴疗疯疮症痴盐监盖盘着矿码砖础础确碍礼祸祯离秃积称稳穷窃窍' +
    '竞笔笋筑签简粮紧纠红约级纪纫纯纲纳纵纷纸纹纺纽线练组细织终绍经结绕绘给络绝统继' +
    '绩绪续维综绿缓编缘缩缴网罗罚职联聪肃肠肤肾胀胁胜脑脚脸腊腾舰舱艰艳艺节芜芦苏苹茧' +
    '荐荡荣药莲获萝萤营萧著蓝蔼虏虑虚虫蚀蚁蛮蜡补衬袄装裆见观规觅视览觉观计订认讨让' +
    '训议讯记讲许论讽设访证评识诈诉词译试诗诚话诞询该详诫诬语误诱说诵请诸诺读课谁调' +
    '谅谈谊谋谍谎谐谓谕谜谢谣谤谦谨谬谱贝贞负贡财责贤败账货质贩贪贫购贮贯贰贱贴贵' +
    '贷贸费贺贼贾资赋赌赏赐赔赖赚赛赞赠赢赵趋跃践踪车轨轩转轮软轰轴轻载轿较辅辆辈' +
    '辉辑输辖辞边辽达迁迈运还这进远违连迟适选递逻遗邓邮邻郑酝酱释里鉴针钉钓钟钢钥钦钱' +
    '钻铁铃铜铭银铺链销锁锅锋错锡键锦镇镜长门闪闭问闯闲间闷闹闻阀阁阅队阳阴阵阶际陆陈' +
    '陕险随隐隶难雾静页顶项顺须顾顿颁颂预领颇频题颜额风飘饥饭饮饰饱饼馆驱驳驻驾驶骂' +
    '骄验骑骗鱼鲁鲜鸟鸡鸣鸦鸭鸿鹅鹰麦黄齐齿龄龙龟').split(''),
)
// 這些字在繁體與日文裡也合法（例如「干」「后」「里」），不納入簡體字表以免誤報
for (const ok of '著余干后里台才占向症岳筑斗彦伙奥') SIMPLIFIED.delete(ok)
// chars-block-end

const CANTONESE = /[嘅咗唔冇喺啲嘢睇哋佢咁嚟啱諗]/
const LATIN_BEFORE_CJK = /[A-Za-z]{4,}(?=[\u4e00-\u9fff])/
const TOOL_ECHO = /<tool_call>|<function=|<parameter=|<\/function>/
const HAN = /[\u4e00-\u9fff]/

// --commits：只掃本輪 commit 訊息。小模型會把簡體字寫進 commit 標題，
// 而原本的自檢只掃檔案，所以 commit 訊息一路沒人查。給 gates 用同一支字表。
if (commitsOnly) {
  let log = ''
  try {
    log = git('log', `${base}..HEAD`, '--format=%B%x00')
  } catch (e) {
    console.error(`git log ${base}..HEAD 失敗：${e.message.split('\n')[0]}`)
    process.exit(2)
  }
  const commitHits = []
  let n = 0
  for (const msg of log.split('\0')) {
    const line = msg.trim()
    if (!line) continue
    n++
    for (const c of line) {
      if (SIMPLIFIED.has(c)) commitHits.push([`commit #${n}`, `簡體字「${c}」`, line.split('\n')[0]])
    }
    if (TOOL_ECHO.test(line)) commitHits.push([`commit #${n}`, '工具呼叫殘骸', line.split('\n')[0]])
    if (/^(<<<<<<<|=======$|>>>>>>>)/m.test(line)) commitHits.push([`commit #${n}`, '衝突標記', line.split('\n')[0]])
  }
  const seenC = new Set()
  for (const [where, why, text] of commitHits) {
    const k = `${where}|${why}`
    if (seenC.has(k)) continue
    seenC.add(k)
    console.log(`✗ ${where}｜${why}\n    ${text.slice(0, 110)}`)
  }
  console.log(`\nagent-selfcheck --commits — 命中 ${seenC.size} 處／${n} 個 commit`)
  process.exit(seenC.size ? 1 : 0)
}

let added = []
let files = []
try {
  files = git('diff', '--name-only', base).split('\n').filter(Boolean)
} catch (e) {
  console.error(`git diff ${base} 失敗：${e.message.split('\n')[0]}`)
  process.exit(2)
}
for (const f of files) {
  if (f === 'scripts/agent-selfcheck.mjs') continue // 本檔的簡體字表本身會全部命中
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|pdf|lock)$/i.test(f)) continue
  if (/(^|\/)package-lock\.json$/.test(f)) continue
  let diff = ''
  try {
    diff = git('diff', '-U0', base, '--', f)
  } catch {
    continue
  }
  let ln = 0
  for (const line of diff.split('\n')) {
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
    if (h) {
      ln = Number(h[1])
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added.push({ f, ln, text: line.slice(1) })
      ln++
    }
  }
}

const hits = []
const newHan = new Map()
const baseChars = new Map()
const baseHan = (f) => {
  if (baseChars.has(f)) return baseChars.get(f)
  let s = new Set()
  try {
    for (const c of git('show', `${base}:${f}`)) if (HAN.test(c)) s.add(c)
  } catch {
    s = new Set()
  }
  baseChars.set(f, s)
  return s
}
// 全站已出現的字：用整個 base 的 src/ 與 docs/ 太慢，改用同檔＋同目錄既有字集
const siteHan = new Set()
try {
  const dirs = [...new Set(files.map((f) => f.split('/').slice(0, -1).join('/')))]
  for (const d of dirs) {
    if (!d) continue
    for (const g of git('ls-tree', '-r', '--name-only', base, '--', d)
      .split('\n')
      .filter(Boolean)
      .slice(0, 40)) {
      if (/\.(ts|tsx|css|md|mjs|json)$/.test(g)) {
        for (const c of baseHan(g)) siteHan.add(c)
      }
    }
  }
} catch {
  /* 缺 base 檔只代表新檔案，略過 */
}

for (const { f, ln, text } of added) {
  const inSrc = f.startsWith('src/')
  const where = `${f}:${ln}`
  for (const c of text) {
    if (SIMPLIFIED.has(c)) hits.push([where, `簡體字「${c}」`, text.trim()])
    if (HAN.test(c) && !baseHan(f).has(c) && !siteHan.has(c)) {
      if (!newHan.has(c)) newHan.set(c, where)
    }
  }
  if (inSrc && CANTONESE.test(text)) {
    hits.push([where, '粵語虛詞（src/ 不准）', text.trim()])
  }
  const lm = text.match(LATIN_BEFORE_CJK)
  if (lm) hits.push([where, `拉丁亂碼「${lm[0]}」`, text.trim()])
  if (TOOL_ECHO.test(text)) hits.push([where, '工具呼叫殘骸', text.trim()])
  if (/^(<<<<<<<|=======$|>>>>>>>)/.test(text)) {
    hits.push([where, '衝突標記', text.trim()])
  }
}

const seen = new Set()
for (const [where, why, text] of hits) {
  const k = `${where}|${why}`
  if (seen.has(k)) continue
  seen.add(k)
  console.log(`✗ ${where}｜${why}\n    ${text.slice(0, 110)}`)
}
if (newHan.size) {
  console.log(
    `\n新出現的漢字（同目錄既有檔未出現）共 ${newHan.size} 個，請逐個核對碼位：`,
  )
  console.log('  ' + [...newHan.keys()].join(''))
  console.log('  （例：看到「将堤潫搁沥」就是錯碼位，應為「將隊潰擱無」）')
}
console.log(
  `\nagent-selfcheck — 新增 ${added.length} 行／${files.length} 檔｜命中 ${seen.size} 處｜新漢字 ${newHan.size}`,
)
process.exit(seen.size ? 1 : 0)
