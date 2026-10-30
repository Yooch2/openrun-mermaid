// Render the ellipse syntax in every diagram that supports it and save a screenshot.
// usage: node render-screenshot.mjs <mermaid.min.js> <out.png> <title>
import { chromium } from 'playwright';
const [bundle, out, title] = process.argv.slice(2);
const cases = [
  ['flowchart', 'flowchart LR\n  A(-My ellipse shape-) --> B(Round)\n  B --> C(-second-)'],
  ['flowchart (handDrawn)', '---\nconfig:\n  look: handDrawn\n---\nflowchart LR\n  A(-My ellipse shape-) --> B(Round)'],
  ['block', 'block-beta\n  columns 2\n  a(-ellipse-) b["rect"]'],
  ['agentflow', 'agentflow-beta LR\n  A(-ellipse-) --> B[rect]'],
];
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
await p.setContent('<html><body style="margin:0;background:#fff;font-family:-apple-system,sans-serif"></body></html>');
await p.addScriptTag({ path: bundle });
await p.evaluate(() => mermaid.initialize({ startOnLoad: false }));
const res = [];
for (const [name, code] of cases) {
  res.push(await p.evaluate(async ({ name, code }) => {
    try { const { svg } = await mermaid.render('r' + Math.random().toString(36).slice(2), code);
      const d = document.createElement('div'); d.innerHTML = svg;
      return { name, code, svg, ellipses: d.querySelectorAll('ellipse').length + d.querySelectorAll('g.label-container path, path.basic').length, err: null };
    } catch (e) { return { name, code, svg: null, err: String(e.message || e) }; }
  }, { name, code }));
}
await p.evaluate(({ res, title }) => {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  document.body.innerHTML = `<div id="cap" style="display:inline-block;padding:20px"><h2 style="margin:0 0 12px">${title}</h2>
  <div style="display:grid;grid-template-columns:repeat(2,340px);gap:16px">${res.map(r => `
    <div style="border:1px solid #ddd;border-radius:8px;padding:12px">
      <div style="font-weight:600;margin-bottom:6px">${r.name}</div>
      <pre style="background:#f6f8fa;padding:8px;font-size:12px;white-space:pre-wrap;margin:0 0 8px">${esc(r.code.split('---\n').pop())}</pre>
      ${r.err ? `<div style="color:#b91c1c;font-family:monospace;font-size:13px;background:#fef2f2;padding:8px;border-radius:6px">❌ ${esc(r.err)}</div>` : `<div style="max-width:316px">${r.svg}</div>`}
    </div>`).join('')}</div></div>`;
  document.querySelectorAll('#cap svg').forEach(s => { s.style.maxWidth = '100%'; s.style.height = 'auto'; });
}, { res, title });
await p.locator('#cap').screenshot({ path: out });
console.log(JSON.stringify(res.map(r => ({ name: r.name, err: r.err, ellipseEls: r.svg ? (r.svg.match(/<ellipse/g) || []).length : 0 }))));
await b.close();
