import { chromium } from 'playwright';
const [bundle, outDir, tag] = process.argv.slice(2);
const fm = '---\nconfig:\n  htmlLabels: false\n---\n';
const cases = [
  ['mindmap', fm + 'mindmap\n  root["the `superstar`!"]'],
  ['kanban', fm + 'kanban\n  todo[Todo]\n    t1["the `superstar`!"]'],
  ['state', fm + 'stateDiagram-v2\n  s1 : the `superstar`!'],
];
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent('<html><body style="margin:0;background:#fff;font-family:sans-serif"></body></html>');
await page.addScriptTag({ path: bundle });
await page.evaluate(() => mermaid.initialize({ startOnLoad: false }));
const blocks = [];
for (const [name, code] of cases) {
  const svg = await page.evaluate(async (c) => (await mermaid.render('d' + Math.random().toString(36).slice(2), c)).svg, code);
  blocks.push({ name, code: code.split('---\n').pop(), svg });
}
await page.evaluate(({ blocks, tag }) => {
  document.body.innerHTML = `<div id="cap" style="display:inline-block;padding:20px">
    <h2 style="margin:0 0 12px">${tag}</h2>
    <div style="display:flex;gap:24px;align-items:flex-start">${blocks.map(b => `
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px;width:260px">
        <div style="font-weight:600;margin-bottom:6px">${b.name} (htmlLabels: false)</div>
        <pre style="background:#f6f8fa;padding:8px;font-size:12px;white-space:pre-wrap;margin:0 0 8px">${b.code.replace(/</g,'&lt;')}</pre>
        <div style="max-width:260px">${b.svg}</div></div>`).join('')}
    </div></div>`;
  document.querySelectorAll('#cap svg').forEach(s => { s.style.maxWidth = '100%'; s.style.height = 'auto'; });
}, { blocks, tag });
await page.locator('#cap').screenshot({ path: `${outDir}/${tag.startsWith('Before') ? 'before' : 'after'}.png` });
const texts = await page.evaluate(() => [...document.querySelectorAll('#cap svg')].map(s => [...s.querySelectorAll('text')].map(t => t.textContent.trim()).filter(Boolean).join(' | ')));
console.log(tag, JSON.stringify(texts));
await browser.close();
