// One-off dev script: rasterises public/icon.svg into every PNG size the
// PWA manifest and index.html need. Not part of the shipped app — run it
// manually with `node scripts/generate-icons.mjs` whenever public/icon.svg
// changes, then commit the regenerated PNGs like any other static asset.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const sourceSvg = path.join(publicDir, 'icon.svg')

// [output filename, pixel size]. 192/512 "any" cover the standard PWA
// manifest sizes; 512 "maskable" is the same source (it was already drawn
// inside the safe zone) but gets its own file because the manifest needs a
// separate <img purpose="maskable"> entry; apple-touch-icon is what iOS
// looks for when a user adds the site to their home screen; the two
// favicons cover browser tabs at typical DPI.
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
  ['favicon-16.png', 16],
]

for (const [filename, size] of targets) {
  await sharp(sourceSvg).resize(size, size).png().toFile(path.join(publicDir, filename))
  console.log(`✓ ${filename} (${size}×${size})`)
}
