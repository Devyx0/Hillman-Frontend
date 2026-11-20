/**
 * Demo site photos for the mock data: drawn as SVG "photos" of Québec houses (siding, roof edge, gutters,
 * downspouts, windows, lawn) so the estimator → crew annotation flow can be shown without real image files.
 * Each returns a data URL usable as `QuotePhoto.src`. Annotations stay separate (`QuotePhoto.shapes`).
 */

export type Scene = 'facade' | 'side' | 'corner' | 'roof' | 'garage'

interface SceneOpts {
  /** Siding colour. */
  siding?: string
  /** Roof / shingle colour. */
  roof?: string
  /** Existing gutter colour in the photo. */
  gutter?: string
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Horizontal siding boards with a light shadow under each board. */
function siding(x: number, y: number, w: number, h: number, colour: string) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colour}"/>`
  for (let yy = y + 18; yy < y + h; yy += 22) s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="#000" stroke-opacity=".09" stroke-width="2"/>`
  return s
}

function windowAt(x: number, y: number, w: number, h: number) {
  return `<g><rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" fill="#f4f1ea"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#f4f1ea" stroke-width="6"/><line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="#f4f1ea" stroke-width="6"/><rect x="${x - 14}" y="${y + h + 6}" width="${w + 28}" height="10" fill="#e5e1d8"/></g>`
}

function downspout(x: number, y1: number, y2: number, colour: string) {
  return `<g><rect x="${x}" y="${y1}" width="18" height="${y2 - y1}" fill="${colour}"/><rect x="${x + 2}" y="${y1}" width="5" height="${y2 - y1}" fill="#fff" fill-opacity=".25"/><path d="M${x} ${y2} l-26 22 h20 l24 -22 z" fill="${colour}"/></g>`
}

function defs(roof: string) {
  return `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc3e6"/><stop offset="1" stop-color="#dfeaf3"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b8aa3"/><stop offset=".55" stop-color="#a9c1d3"/><stop offset="1" stop-color="#5c778c"/></linearGradient>
    <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f9a4b"/><stop offset="1" stop-color="#4f7a33"/></linearGradient>
    <pattern id="shingles" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="${roof}"/><path d="M0 19.5 H40 M20 0 V10 M0 10 H40 M10 10 V20 M30 10 V20" stroke="#000" stroke-opacity=".22" stroke-width="1.5"/></pattern>
    <radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
  </defs>`
}

function shrubs(y: number, xs: number[]) {
  return xs.map((x, i) => `<ellipse cx="${x}" cy="${y}" rx="${60 + (i % 2) * 18}" ry="${38 + (i % 3) * 6}" fill="${i % 2 ? '#3f6b2c' : '#4b7a33'}"/>`).join('')
}

/** One demo site photo. */
export function samplePhoto(scene: Scene, opts: SceneOpts = {}): string {
  const sidingC = opts.siding ?? '#d9cbb2'
  const roofC = opts.roof ?? '#4a4a4f'
  const gutterC = opts.gutter ?? '#f2f2ef'
  const W = 1200
  const H = 900
  let body = ''

  if (scene === 'facade' || scene === 'side') {
    const eave = 250
    body += `<polygon points="80,${eave} 600,${eave - 190} 1120,${eave}" fill="url(#shingles)"/>`
    body += `<rect x="70" y="${eave}" width="1060" height="16" fill="#f4f1ea"/>` // fascia
    body += siding(110, eave + 16, 980, 470, sidingC)
    body += `<rect x="60" y="${eave + 10}" width="1080" height="26" rx="4" fill="${gutterC}"/><rect x="60" y="${eave + 10}" width="1080" height="7" fill="#fff" fill-opacity=".35"/>`
    body += scene === 'facade' ? windowAt(220, eave + 90, 170, 150) + windowAt(810, eave + 90, 170, 150) + `<rect x="530" y="${eave + 220}" width="140" height="266" fill="#5b4636"/><circle cx="650" cy="${eave + 360}" r="7" fill="#d6b36a"/>` : windowAt(300, eave + 110, 200, 140) + windowAt(700, eave + 110, 200, 140)
    body += downspout(1090, eave + 36, eave + 470, gutterC)
    if (scene === 'facade') body += downspout(92, eave + 36, eave + 470, gutterC)
    body += `<rect x="0" y="${eave + 486}" width="${W}" height="${H - eave - 486}" fill="url(#lawn)"/>` + shrubs(eave + 500, [180, 330, 900, 1040])
  } else if (scene === 'corner') {
    const eave = 220
    body += `<polygon points="40,${eave} 520,${eave - 120} 640,${eave}" fill="url(#shingles)"/>`
    body += `<polygon points="640,${eave} 520,${eave - 120} 1180,${eave - 40} 1180,${eave + 40}" fill="url(#shingles)" fill-opacity=".85"/>`
    body += siding(60, eave + 14, 580, 520, sidingC)
    body += `<polygon points="640,${eave + 14} 1180,${eave + 54} 1180,${eave + 600} 640,${eave + 534}" fill="${sidingC}" style="filter:brightness(.82)"/>`
    body += `<rect x="40" y="${eave + 6}" width="606" height="26" rx="4" fill="${gutterC}"/>`
    body += `<polygon points="640,${eave + 6} 1180,${eave + 46} 1180,${eave + 70} 640,${eave + 32}" fill="${gutterC}" style="filter:brightness(.9)"/>`
    body += windowAt(170, eave + 120, 180, 150) + `<polygon points="780,${eave + 140} 960,${eave + 152} 960,${eave + 300} 780,${eave + 286}" fill="url(#glass)" stroke="#f4f1ea" stroke-width="12"/>`
    body += downspout(622, eave + 32, eave + 530, gutterC)
    body += `<rect x="0" y="${eave + 540}" width="${W}" height="${H - eave - 540}" fill="url(#lawn)"/>` + shrubs(eave + 552, [200, 420, 860, 1080])
  } else if (scene === 'roof') {
    body += `<polygon points="0,560 0,330 760,120 1200,300 1200,560" fill="url(#shingles)"/>`
    body += `<rect x="700" y="80" width="130" height="250" fill="#8a4b39"/>${Array.from({ length: 9 }, (_, i) => `<line x1="700" y1="${100 + i * 26}" x2="830" y2="${100 + i * 26}" stroke="#5c3024" stroke-width="3"/>`).join('')}<rect x="690" y="70" width="150" height="22" fill="#6b3a2c"/>`
    body += `<path d="M688 320 h154 v22 h-154 z" fill="#b9bcbe"/>`
    body += `<rect x="0" y="560" width="${W}" height="30" fill="#f4f1ea"/><rect x="0" y="588" width="${W}" height="26" fill="${gutterC}"/>`
    body += siding(0, 614, W, 286, sidingC)
  } else {
    // garage / renovation
    body += `<polygon points="160,300 600,140 1040,300" fill="url(#shingles)"/>`
    body += siding(190, 300, 820, 420, sidingC)
    body += `<rect x="330" y="420" width="540" height="300" fill="#ece8df"/>${Array.from({ length: 5 }, (_, i) => `<line x1="330" y1="${480 + i * 58}" x2="870" y2="${480 + i * 58}" stroke="#c9c3b6" stroke-width="4"/>`).join('')}`
    body += `<rect x="170" y="296" width="860" height="22" rx="4" fill="${gutterC}"/>` + downspout(1000, 318, 720, gutterC)
    body += `<rect x="0" y="720" width="${W}" height="180" fill="#9a9a94"/><rect x="330" y="720" width="540" height="180" fill="#8b8b85"/>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(roofC)}<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="180" cy="120" rx="140" ry="34" fill="#fff" fill-opacity=".55"/><ellipse cx="980" cy="90" rx="170" ry="30" fill="#fff" fill-opacity=".45"/>${body}<rect width="${W}" height="${H}" fill="url(#vignette)"/></svg>`
  return svgUrl(svg)
}
