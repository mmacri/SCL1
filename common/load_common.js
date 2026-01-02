const ensureTrailingSlash = (value = "") => value.endsWith("/") ? value : `${value}/`;

async function injectFragment(targetId, file, basePath) {
  const host = document.getElementById(targetId);
  if (!host) return null;
  const res = await fetch(`${basePath}common/${file}`);
  if (!res.ok) {
    host.innerHTML = '';
    return null;
  }
  const html = (await res.text()).replaceAll('{{BASE}}', basePath);
  host.innerHTML = html;
  return host;
}

document.addEventListener('DOMContentLoaded', async () => {
  const scriptEl = document.currentScript;
  const basePath = ensureTrailingSlash(scriptEl?.dataset.basePath || './');

  await injectFragment('include-header', 'header.html', basePath);
  await injectFragment('include-footer', 'footer.html', basePath);

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');

  if (navToggle && nav) {
    const toggleNav = () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    navToggle.addEventListener('click', toggleNav);
    navToggle.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') toggleNav(); });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }

  if (nav) {
    const current = window.location.pathname.replace(/\\/g, '/');
    nav.querySelectorAll('a').forEach((link) => {
      const href = new URL(link.getAttribute('href'), window.location.href).pathname;
      if (current.endsWith(href) || current.includes(href)) {
        link.classList.add('active');
      }
    });
  }
});
