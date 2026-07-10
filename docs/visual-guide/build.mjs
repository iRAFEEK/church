// Builds index.html — RTL Arabic visual guide from manifest + captured media.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { SECTIONS } from './manifest.mjs'
const M = 'docs/visual-guide/media'
const arNum = (x)=>String(x).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d])
const has = (f)=>existsSync(`${M}/${f}`)

const PARTS = [
  {from:1,  to:2,  icon:'👋', t:'أهلًا بيك'},
  {from:3,  to:11, icon:'🚪', t:'أول خطوة'},
  {from:12, to:25, icon:'🏠', t:'للأعضاء'},
  {from:26, to:31, icon:'👨‍👩‍👧‍👦', t:'لقائد المجموعة'},
  {from:32, to:50, icon:'🛠️', t:'للمشرفين والقادة'},
  {from:51, to:54, icon:'⚙️', t:'إعدادات الكنيسة'},
  {from:55, to:59, icon:'📖', t:'مرجع سريع'},
]
const secNum = (n)=>parseInt(String(n))  // '5b' → 5

let toc = '', body = ''
for (const part of PARTS){
  const secs = SECTIONS.filter(s=>secNum(s.n)>=part.from && secNum(s.n)<=part.to)
  toc += `<div class="part-label">${part.icon} ${part.t}</div><div class="toc-grid">`
  for (const sec of secs){
    const thumb = has(`s${sec.n}-0.jpg`) ? `<img loading="lazy" src="media/s${sec.n}-0.jpg" alt="">` : `<div class="thumb-icon">${sec.icon}</div>`
    toc += `<a class="toc-card" href="#sec-${sec.n}">${thumb}<div class="toc-meta"><span class="toc-ico">${sec.icon}</span><span class="toc-num">${arNum(secNum(sec.n))}</span></div><div class="toc-t">${sec.t}</div></a>`
  }
  toc += `</div>`

  body += `<div class="part-banner" id="part-${part.from}"><span>${part.icon}</span> ${part.t}</div>`
  for (const sec of secs){
    const titleAudio = has(`a-s${sec.n}-title.m4a`) ? `<button class="say" data-a="media/a-s${sec.n}-title.m4a" aria-label="استمع">🔊</button>` : ''
    body += `<section id="sec-${sec.n}"><header class="sec-h"><span class="sec-ico">${sec.icon}</span><span class="sec-num">${arNum(secNum(sec.n))}</span><h2>${sec.t}</h2>${titleAudio}</header>`
    sec.steps.forEach((st,i)=>{
      const img = has(`s${sec.n}-${i}.jpg`) ? `<figure><img loading="lazy" src="media/s${sec.n}-${i}.jpg" alt=""></figure>` : ''
      const vid = has(`v-s${sec.n}-${i}.webm`) ? `<video controls muted loop playsinline preload="none" poster="media/s${sec.n}-${i}.jpg"><source src="media/v-s${sec.n}-${i}.webm" type="video/webm"></video>` : ''
      const aud = has(`a-s${sec.n}-${i}.m4a`) ? `<button class="say big" data-a="media/a-s${sec.n}-${i}.m4a" aria-label="استمع للشرح">🔊</button>` : ''
      body += `<div class="step">
        <div class="step-row"><span class="n">${arNum(i+1)}</span><span class="s-ico">${st.icon}</span><p>${st.ar}</p>${aud}</div>
        ${img}${vid ? `<div class="vid-wrap"><span class="vid-tag">▶︎ فيديو</span>${vid}</div>` : ''}
      </div>`
    })
    body += `</section>`
  }
}

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>دليل إكليسيا المصوّر</title>
<style>
:root{--amber:#f59e0b;--ink:#1c1b22;--paper:#faf8f4;--card:#fff;--line:#e8e4dc;--muted:#6b6860}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;line-height:1.8}
.wrap{max-width:860px;margin:0 auto;padding:16px}
.hero{text-align:center;padding:38px 12px 26px}
.hero .logo{font-size:64px}.hero h1{font-size:clamp(26px,6vw,40px);margin:.3em 0 .1em}
.hero p{color:var(--muted);font-size:18px;margin:0}
.part-label{font-size:22px;font-weight:800;margin:26px 4px 10px;display:flex;gap:8px;align-items:center}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.toc-card{background:var(--card);border:2px solid var(--line);border-radius:16px;overflow:hidden;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;transition:transform .1s}
.toc-card:active{transform:scale(.97)}
.toc-card img{width:100%;height:88px;object-fit:cover;object-position:top}
.thumb-icon{height:88px;display:flex;align-items:center;justify-content:center;font-size:44px;background:#f3efe8}
.toc-meta{display:flex;justify-content:space-between;align-items:center;padding:6px 10px 0}
.toc-ico{font-size:22px}.toc-num{background:var(--amber);color:#fff;font-weight:800;border-radius:999px;min-width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:15px}
.toc-t{padding:2px 10px 10px;font-size:14.5px;font-weight:700;line-height:1.5}
.part-banner{background:var(--ink);color:#fff;border-radius:18px;padding:16px 20px;font-size:24px;font-weight:800;margin:44px 0 8px;display:flex;gap:10px;align-items:center}
.part-banner span{font-size:30px}
section{background:var(--card);border:2px solid var(--line);border-radius:20px;padding:18px;margin:16px 0}
.sec-h{display:flex;align-items:center;gap:12px;border-bottom:2px dashed var(--line);padding-bottom:12px;margin-bottom:6px}
.sec-ico{font-size:34px}.sec-num{background:var(--amber);color:#fff;font-weight:800;border-radius:999px;min-width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;font-size:19px;flex:none}
.sec-h h2{font-size:clamp(19px,4.5vw,26px);margin:0;flex:1}
.step{padding:16px 0;border-bottom:1px solid var(--line)}.step:last-child{border-bottom:none}
.step-row{display:flex;align-items:center;gap:12px}
.step-row .n{background:#fff;border:3px solid var(--amber);color:var(--amber);font-weight:800;border-radius:999px;min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;flex:none}
.s-ico{font-size:30px;flex:none}
.step-row p{margin:0;font-size:clamp(17px,4vw,21px);font-weight:600;flex:1}
.say{border:none;background:#fef3c7;border-radius:999px;width:52px;height:52px;font-size:24px;cursor:pointer;flex:none;transition:transform .1s}
.say:active{transform:scale(.9)}.say.playing{background:var(--amber)}
figure{margin:14px 0 0}figure img{width:100%;border-radius:14px;border:2px solid var(--line);display:block}
.vid-wrap{position:relative;margin-top:12px}
video{width:100%;border-radius:14px;border:2px solid var(--line);display:block;background:#000}
.vid-tag{position:absolute;top:10px;right:10px;background:var(--amber);color:#fff;font-weight:800;padding:4px 12px;border-radius:999px;font-size:14px;z-index:2}
#top-btn{position:fixed;bottom:18px;left:18px;background:var(--ink);color:#fff;border:none;border-radius:999px;width:58px;height:58px;font-size:26px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:50}
footer{text-align:center;color:var(--muted);padding:34px 0;font-size:15px}
</style></head><body>
<div class="wrap">
  <div class="hero"><div class="logo">⛪</div><h1>دليل إكليسيا المصوّر</h1><p>🔊 اضغط السماعة تسمع الشرح — 👆 اضغط أي صورة تكبر</p></div>
  <nav id="toc">${toc}</nav>
  ${body}
  <footer>⛪ إكليسيا — لمجده</footer>
</div>
<button id="top-btn" onclick="document.getElementById('toc').scrollIntoView({behavior:'smooth'})" aria-label="القائمة">🏠</button>
<script>
const player = new Audio()
let cur = null
document.querySelectorAll('.say').forEach(b=>b.addEventListener('click',()=>{
  if (cur===b && !player.paused){ player.pause(); b.classList.remove('playing'); return }
  document.querySelectorAll('.say.playing').forEach(x=>x.classList.remove('playing'))
  player.src = b.dataset.a; player.play(); b.classList.add('playing'); cur=b
  player.onended = ()=>b.classList.remove('playing')
}))
document.querySelectorAll('figure img').forEach(im=>im.addEventListener('click',()=>{
  im.requestFullscreen ? im.requestFullscreen() : window.open(im.src)
}))
</script>
</body></html>`
writeFileSync('docs/visual-guide/index.html', html)
console.log('index.html built —', Math.round(html.length/1024), 'KB')
