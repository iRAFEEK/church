// Generate Arabic voiceover per step via macOS `say` (voice: Majed), output .m4a
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { SECTIONS } from './manifest.mjs'
const MEDIA = 'public/help-guide'
mkdirSync(MEDIA,{recursive:true})
let n = 0
for (const sec of SECTIONS){
  // section title audio
  const tFile = `${MEDIA}/a-s${sec.n}-title.m4a`
  if (!existsSync(tFile)) {
    execSync(`say -v Majed -o /tmp/vg-tts.aiff ${JSON.stringify(sec.t)} && afconvert -f m4af -d aac -b 48000 /tmp/vg-tts.aiff "${tFile}"`)
    n++
  }
  sec.steps.forEach((st,i)=>{
    const f = `${MEDIA}/a-s${sec.n}-${i}.m4a`
    if (existsSync(f)) return
    execSync(`say -v Majed -o /tmp/vg-tts.aiff ${JSON.stringify(st.ar)} && afconvert -f m4af -d aac -b 48000 /tmp/vg-tts.aiff "${f}"`)
    n++
  })
}
console.log('audio files generated:', n)
