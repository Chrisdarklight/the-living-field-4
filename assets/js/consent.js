// Minimal cookie-consent banner for Google Analytics (GA4).
// Analytics stays OFF (Consent Mode default = denied, set in each page's <head>)
// until the visitor clicks Accept. The choice is remembered in localStorage
// under 'tlf-consent' ('granted' or 'denied'). Self-contained: injects its own
// styles, so no changes to style.css are needed.
(function () {
  var KEY = 'tlf-consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'granted' || stored === 'denied') return;

  var css = document.createElement('style');
  css.textContent =
    '#tlf-consent{position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;z-index:9999;' +
    'background:#3a382f;color:#f5f1e6;padding:18px 20px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);' +
    'font-family:"Work Sans",sans-serif;font-size:.9rem;line-height:1.45}' +
    '#tlf-consent p{margin:0 0 12px;color:inherit}' +
    '#tlf-consent a{color:#e6cf8f;text-decoration:underline}' +
    '#tlf-consent .tlf-btns{display:flex;gap:10px;flex-wrap:wrap}' +
    '#tlf-consent button{font:inherit;font-weight:500;padding:8px 18px;border-radius:6px;cursor:pointer;border:1px solid #e6cf8f}' +
    '#tlf-consent .tlf-yes{background:#e6cf8f;color:#3a382f}' +
    '#tlf-consent .tlf-no{background:transparent;color:#f5f1e6}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'tlf-consent';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Cookie consent');

  var p = document.createElement('p');
  p.appendChild(document.createTextNode('We use analytics cookies to understand how the site is used and improve it. They stay off unless you accept. See our '));
  var a = document.createElement('a');
  a.href = '/legal/privacy.html';
  a.textContent = 'privacy policy';
  p.appendChild(a);
  p.appendChild(document.createTextNode('.'));

  var btns = document.createElement('div');
  btns.className = 'tlf-btns';
  var yes = document.createElement('button');
  yes.type = 'button'; yes.className = 'tlf-yes'; yes.textContent = 'Accept';
  var no = document.createElement('button');
  no.type = 'button'; no.className = 'tlf-no'; no.textContent = 'Decline';
  btns.appendChild(yes); btns.appendChild(no);

  box.appendChild(p); box.appendChild(btns);

  function choose(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
    if (val === 'granted' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    box.remove();
  }
  yes.addEventListener('click', function () { choose('granted'); });
  no.addEventListener('click', function () { choose('denied'); });

  function show() { document.body.appendChild(box); }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
