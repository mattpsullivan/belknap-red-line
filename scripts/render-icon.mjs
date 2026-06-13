// Rasterize an icon SVG to PNG via sharp (librsvg). Optional flatten background.
//   node scripts/render-icon.mjs <in.svg> <out.png> <size> [bgHex]
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const [, , src, out, size = '1024', bg] = process.argv
const px = parseInt(size, 10)
let img = sharp(readFileSync(src), { density: 512 }).resize(px, px, {
  fit: 'contain',
  background: '#00000000',
})
if (bg) img = img.flatten({ background: bg })
await img.png().toFile(out)
console.log('wrote', out, px + 'px', bg ? 'bg=' + bg : 'transparent')
