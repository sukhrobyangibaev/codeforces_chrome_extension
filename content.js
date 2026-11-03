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
    document.body.appendChild(btn);

    const tagBox = document.querySelector('.sidebox:has(.tag-box)');
    if (tagBox) {
      const b = document.createElement('button');
      b.className = 'cfx-tags-btn';
      b.textContent = 'Show tags';
      const caption = tagBox.querySelector('.caption');
      (caption || tagBox.firstElementChild).after(b);
    }
  }, { once: true });
})();
