(() => {
  const root = document.documentElement;
  const KEY = 'cfx-dark';

  // Runs before first paint. localStorage is synchronous, so there is no white flash.
  if (localStorage.getItem(KEY) === '1') root.classList.add('cfx-dark');

  // One delegated listener for everything (no per-element listeners).
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.id === 'cfx-theme') {
      const on = root.classList.toggle('cfx-dark');
      localStorage.setItem(KEY, on ? '1' : '0');
      return;
    }

    if (t.classList.contains('cfx-tags-btn')) {
      const box = t.closest('.sidebox');
      const open = box.classList.toggle('cfx-open');
      t.textContent = open ? 'Hide tags' : 'Show tags';
      return;
    }

    if (t.classList.contains('cfx-copy-btn')) {
      const st = t.closest('.problem-statement');
      navigator.clipboard.writeText(statementToMarkdown(st)).then(
        () => flash(t, 'Copied!'),
        () => flash(t, 'Copy failed')
      );
      return;
    }

    // Problemset list: clicking the "show tags" placeholder reveals that row's tags.
    if (t.matches('.problems td > div:has(> a.notice):not(.cfx-open)')) {
      t.classList.add('cfx-open');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.id = 'cfx-theme';
    btn.title = 'Toggle dark mode';
    btn.textContent = '◐';
    // Top-right header, next to the language flags. Scrolls away with the page.
    const flags = document.querySelector('.lang-chooser > div');
    if (flags) flags.prepend(btn);
    else document.body.prepend(btn);

    const tagBox = document.querySelector('.sidebox:has(.tag-box)');
    if (tagBox) {
      const b = document.createElement('button');
      b.className = 'cfx-tags-btn';
      b.textContent = 'Show tags';
      const caption = tagBox.querySelector('.caption');
      (caption || tagBox.firstElementChild).after(b);
    }

    for (const header of document.querySelectorAll('.problem-statement > .header')) {
      const b = document.createElement('button');
      b.className = 'cfx-copy-btn';
      b.textContent = 'Copy statement';
      header.appendChild(b);
    }
  }, { once: true });

  // ===== Statement -> Markdown (only runs when the copy button is clicked) =====

  function flash(btn, text) {
    btn.textContent = text;
    setTimeout(() => { btn.textContent = 'Copy statement'; }, 1500);
  }

  const SKIP = '.MathJax, .MathJax_Preview, .MathJax_Display, .MJX_Assistive_MathML, .section-title, .cfx-copy-btn, style';
  const BLOCK = new Set(['P', 'DIV', 'UL', 'OL', 'CENTER', 'H1', 'H2', 'H3', 'TABLE', 'TR']);

  // Convert statement HTML to text, keeping LaTeX as $...$.
  function toText(node) {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        out += n.nodeValue.replace(/\s+/g, ' ');
        continue;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = n.tagName;

      if (tag === 'SCRIPT') {
        // MathJax keeps the original TeX in <script type="math/tex">.
        const type = n.type || '';
        if (type.startsWith('math/tex')) {
          const tex = n.textContent.trim();
          out += type.includes('display') ? `\n$$${tex}$$\n` : `$${tex}$`;
        }
        continue;
      }
      if (n.matches(SKIP)) continue;

      if (tag === 'BR') out += '\n';
      else if (tag === 'LI') out += '\n- ' + toText(n).trim() + '\n';
      else if (tag === 'PRE') out += '\n```\n' + n.innerText.replace(/\s+$/, '') + '\n```\n';
      else if (tag === 'IMG') out += `[image: ${n.src}]`;
      else if (tag === 'SUP') out += '^{' + toText(n) + '}';
      else if (tag === 'SUB') out += '_{' + toText(n) + '}';
      else if (tag === 'TD' || tag === 'TH') out += toText(n).trim() + ' | ';
      else if (BLOCK.has(tag)) out += '\n' + toText(n) + '\n';
      else out += toText(n);
    }
    return out;
  }

  // If MathJax has not rendered yet, the raw text still has $$$x$$$; normalize it.
  const clean = (s) => s
    .replace(/\${6}([\s\S]+?)\${6}/g, '$$$$$1$$$$')
    .replace(/\${3}([\s\S]+?)\${3}/g, '$$$1$$')
    .split('\n').map((l) => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const section = (st, sel) => {
    const el = st.querySelector(sel);
    return el ? clean(toText(el)) : '';
  };

  const preText = (pre) => {
    const lines = pre.querySelectorAll('.test-example-line');
    const txt = lines.length
      ? Array.from(lines, (l) => l.textContent).join('\n')
      : pre.innerText;
    return txt.replace(/\s+$/, '');
  };

  function statementToMarkdown(st) {
    const parts = [];
    const h = st.querySelector('.header');
    parts.push('# ' + (h.querySelector('.title')?.textContent.trim() || 'Problem'));
    for (const cls of ['.time-limit', '.memory-limit']) {
      const el = h.querySelector(cls);
      if (el) {
        const name = el.querySelector('.property-title')?.textContent.trim() || '';
        parts.push(`${name}: ${el.textContent.replace(name, '').trim()}`);
      }
    }

    // Legend: the first plain <div> after the header.
    const legend = h.nextElementSibling;
    if (legend && !legend.className) parts.push('', clean(toText(legend)));

    const input = section(st, '.input-specification');
    if (input) parts.push('', '## Input', '', input);
    const output = section(st, '.output-specification');
    if (output) parts.push('', '## Output', '', output);

    const ins = st.querySelectorAll('.sample-test .input pre');
    const outs = st.querySelectorAll('.sample-test .output pre');
    ins.forEach((pre, i) => {
      const label = ins.length > 1 ? `## Example ${i + 1}` : '## Example';
      parts.push('', label, '', 'Input:', '```', preText(pre), '```');
      if (outs[i]) parts.push('', 'Output:', '```', preText(outs[i]), '```');
    });

    const note = section(st, '.note');
    if (note) parts.push('', '## Note', '', note);

    return parts.join('\n') + '\n';
  }
})();
