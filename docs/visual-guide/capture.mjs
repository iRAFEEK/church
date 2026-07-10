// Capture runner: real screenshots + videos from the running app (Arabic locale).
// Usage: node docs/visual-guide/capture.mjs [sectionFilter]
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { SECTIONS } from './manifest.mjs'

const BASE = 'http://localhost:4100'
const MEDIA = 'public/help-guide'
const AR = JSON.parse(readFileSync('messages/ar.json','utf8'))
const CREDS = {
  admin:  ['marian.nakhla.4825@sim.ekklesia.test','password123'],
  member: ['mina.salib.4913@sim.ekklesia.test','password123'],
  leader: ['nardin.habib.4832@sim.ekklesia.test','password123'],
}
const filter = process.argv[2]
mkdirSync(MEDIA,{recursive:true})

const arKey = (path)=>path.split('.').reduce((o,k)=>o?.[k], AR)
function sel(page, s){
  if (!s) return null
  if (s.startsWith('T:')) { const v = arKey(s.slice(2)); return page.locator(`text=${v}`).first() }
  if (s.startsWith('txt:')) return page.locator(`text=${s.slice(4)}`).first()
  return page.locator(s).first()
}
async function highlight(page, s){
  if (!s) return
  const loc = sel(page, s)
  try {
    await loc.waitFor({state:'visible', timeout:4000})
    await loc.scrollIntoViewIfNeeded().catch(()=>{})
    const box = await loc.boundingBox(); if (!box) return
    await page.evaluate(({box})=>{
      document.getElementById('vg-hl')?.remove()
      const d = document.createElement('div'); d.id='vg-hl'
      d.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:999999'
      const pad=6
      d.innerHTML = `
        <div style="position:absolute;left:${box.x-pad}px;top:${box.y-pad}px;width:${box.width+pad*2}px;height:${box.height+pad*2}px;border:4px solid #f59e0b;border-radius:12px;box-shadow:0 0 0 4000px rgba(15,15,25,.28),0 0 18px rgba(245,158,11,.9)"></div>
        <svg style="position:absolute;left:${box.x+box.width/2+18}px;top:${box.y+box.height+10}px" width="72" height="64" viewBox="0 0 72 64">
          <defs><marker id="ah" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#f59e0b"/></marker></defs>
          <path d="M64,58 Q40,52 18,10" stroke="#f59e0b" stroke-width="7" fill="none" stroke-linecap="round" marker-end="url(#ah)"/>
        </svg>`
      document.body.appendChild(d)
    },{box})
  } catch { /* highlight best-effort */ }
}
const unhighlight = (page)=>page.evaluate(()=>document.getElementById('vg-hl')?.remove()).catch(()=>{})

async function act(page, arr){
  const [a, s, v, v2] = arr
  const L = ()=>sel(page, s)
  switch(a){
    case 'wait': await page.waitForTimeout(+s); break
    case 'goto': await page.goto(BASE+s, {waitUntil:'domcontentloaded'}); await page.waitForTimeout(1200); break
    case 'click': await L().click({timeout:5000}); break
    case 'clickFirst': await page.locator(s).first().click({timeout:5000}); break
    case 'clickLast': await page.locator(s).last().click({timeout:5000}); break
    case 'clickNth': await page.locator(s).nth(+v).click({timeout:5000}); break
    case 'fill': await L().fill(v,{timeout:5000}); break
    case 'fillFirst': await page.locator(s).first().fill(v,{timeout:5000}); break
    case 'fillLast': await page.locator(s).last().fill(v,{timeout:5000}); break
    case 'fillNth': await page.locator(s).nth(+v).fill(v2,{timeout:5000}); break
    case 'press': await page.keyboard.press(s); break
    case 'scrollY': await page.evaluate((y)=>window.scrollBy({top:+y,behavior:'instant'}), s); break
  }
}

async function login(browser, persona){
  const statePath = `${MEDIA}/.state-${persona}.json`
  if (existsSync(statePath)) return statePath
  const ctx = await browser.newContext({viewport:{width:1280,height:800}})
  await ctx.addCookies([{name:'lang',value:'ar',url:BASE},{name:'NEXT_LOCALE',value:'ar',url:BASE}])
  const page = await ctx.newPage()
  if (persona !== 'out') {
    const [email,pw] = CREDS[persona]
    await page.goto(BASE+'/login',{waitUntil:'domcontentloaded'})
    await page.waitForTimeout(1500)
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[type=password]').fill(pw)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(u=>!u.pathname.includes('/login'),{timeout:20000})
    await page.waitForTimeout(1500)
  }
  await ctx.storageState({path:statePath})
  await ctx.close()
  return statePath
}

async function resolveEntry(page, entry){
  if (entry === 'leaderGroup' || entry === 'leaderGathering' || entry === 'leaderGroupNewGathering') {
    await page.goto(BASE+'/my-group',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2500)
    // /my-group can be a LIST of groups — click into the leader's first group card
    const card = page.locator('main a[href^="/groups/"]').first()
    if (await card.count()) { await card.click(); await page.waitForTimeout(2500) }
    if (entry === 'leaderGroupNewGathering') {
      const href = await page.locator('a[href*="/gathering/new"]').first().getAttribute('href').catch(()=>null)
      if (href) { await page.goto(BASE+href,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1500) }
    } else if (entry === 'leaderGathering') {
      const links = page.locator('a[href*="/gathering/"]:not([href$="/new"])')
      if (await links.count()) { await links.first().click(); await page.waitForTimeout(2500) }
    }
    return
  }
  if (entry === 'memberDetail') {
    await page.goto(BASE+'/admin/members',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2500)
    await page.locator('a[href^="/admin/members/"]').first().click().catch(()=>{})
    await page.waitForTimeout(2500)
    return
  }
  await page.goto(BASE+entry,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1800)
}

const report = []
const browser = await chromium.launch()
for (const sec of SECTIONS) {
  if (filter && String(sec.n) !== filter) continue
  const label = `s${sec.n}`
  try {
    const statePath = await login(browser, sec.persona)
    const ctxOpts = {viewport:{width:1280,height:800}, storageState:statePath}
    if (sec.video) ctxOpts.recordVideo = {dir:`${MEDIA}/.tmpvid`, size:{width:1280,height:800}}
    const ctx = await browser.newContext(ctxOpts)
    await ctx.addCookies([{name:'lang',value:'ar',url:BASE},{name:'NEXT_LOCALE',value:'ar',url:BASE}])
    const page = await ctx.newPage()
    const vidStart = Date.now()
    await resolveEntry(page, sec.entry)
    const stamps = []
    for (let i=0;i<sec.steps.length;i++){
      const st = sec.steps[i]
      const t0 = (Date.now()-vidStart)/1000
      try {
        await highlight(page, st.hi)
        await page.waitForTimeout(400)
        await page.screenshot({path:`${MEDIA}/${label}-${i}.jpg`, type:'jpeg', quality:70})
        for (const a of (st.do||[])) { await act(page, a) }
        await unhighlight(page)
      } catch(e){
        try { await page.screenshot({path:`${MEDIA}/${label}-${i}.jpg`, type:'jpeg', quality:70}) } catch{}
        report.push(`WARN ${label}-${i}: ${e.message?.split('\n')[0]}`)
      }
      stamps.push([t0, (Date.now()-vidStart)/1000])
    }
    await page.waitForTimeout(600)
    const video = sec.video ? await page.video() : null
    await ctx.close()   // finalizes video file
    if (video) {
      const vpath = await video.path()
      for (let i=0;i<sec.steps.length;i++){
        const [a,b] = stamps[i]
        if (b-a < 1.2) continue  // static step, screenshot only
        const out = `${MEDIA}/v-${label}-${i}.mp4`
        try {
          execSync(`ffmpeg -y -loglevel error -i "${vpath}" -ss ${Math.max(0,a-0.2)} -to ${b+0.4} -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -movflags +faststart -an "${out}"`)
        } catch(e){ report.push(`WARN video ${label}-${i}`) }
      }
    }
    console.log(`OK  ${label} (${sec.steps.length} steps${sec.video?' +video':''})`)
  } catch(e){
    report.push(`FAIL ${label}: ${e.message?.split('\n')[0]}`)
    console.log(`FAIL ${label}: ${e.message?.split('\n')[0]}`)
  }
}
await browser.close()
execSync(`rm -rf ${MEDIA}/.tmpvid ${MEDIA}/.state-*.json`)
writeFileSync('docs/visual-guide/capture-report.txt', report.join('\n') || 'all clean')
console.log('DONE.', report.length, 'warnings — see capture-report.txt')
