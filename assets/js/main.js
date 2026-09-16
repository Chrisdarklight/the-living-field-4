// THE LIVING FIELD — shared site behaviour (no build step required)

document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('nav-open');
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) openItem.classList.remove('open');
      });
      item.classList.toggle('open', !isOpen);
    });
  });

  // Horizontal card scrollers — add a right-edge fade + position dots so it's
  // obvious there's more to scroll to, instead of the last card just looking
  // cut off. Works for every .scroller on the page without needing extra markup.
  document.querySelectorAll('.scroller').forEach(function (scroller) {
    var cards = Array.prototype.slice.call(scroller.querySelectorAll('.scroll-card'));
    if (cards.length < 2) return;

    var wrap = document.createElement('div');
    wrap.className = 'scroller-wrap';
    scroller.parentNode.insertBefore(wrap, scroller);
    wrap.appendChild(scroller);

    var fade = document.createElement('div');
    fade.className = 'scroller-fade';
    wrap.appendChild(fade);

    var dots = document.createElement('div');
    dots.className = 'scroller-dots';
    wrap.parentNode.insertBefore(dots, wrap.nextSibling);
    var dotEls = cards.map(function (card, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Scroll to item ' + (i + 1));
      dot.addEventListener('click', function () {
        card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      });
      dots.appendChild(dot);
      return dot;
    });

    function refresh() {
      var hasOverflow = scroller.scrollWidth > scroller.clientWidth + 2;
      dots.style.display = hasOverflow ? '' : 'none';

      var atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
      fade.classList.toggle('is-hidden', !hasOverflow || atEnd);

      // Use scroll progress (0-1) rather than comparing card edge positions —
      // with only a small amount of overflow (e.g. a wide desktop viewport),
      // every card's edge stays far from the scroller's own left edge, which
      // made a raw "closest edge" comparison always pick the first card.
      var maxScroll = scroller.scrollWidth - scroller.clientWidth;
      var progress = maxScroll > 0 ? scroller.scrollLeft / maxScroll : 0;
      var active = Math.round(progress * (cards.length - 1));
      dotEls.forEach(function (dot, i) { dot.classList.toggle('active', i === active); });
    }

    scroller.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    refresh();
  });

  // Product image lightbox — any element with [data-lightbox-src] (product
  // pages use it on the main .pd-image-zoom tile) opens a full-size, uncropped
  // view of that image on click or Enter/Space. One shared overlay is reused
  // for every trigger on the page. Closes on the × button, a click outside
  // the image, or Escape.
  var lightboxTriggers = document.querySelectorAll('[data-lightbox-src]');
  if (lightboxTriggers.length) {
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    var overlayImg = document.createElement('img');
    overlayImg.alt = '';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    overlay.appendChild(overlayImg);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    var lastFocused = null;
    function openLightbox(src, alt) {
      overlayImg.src = src;
      overlayImg.alt = alt || '';
      lastFocused = document.activeElement;
      overlay.classList.add('is-open');
      closeBtn.focus();
    }
    function closeLightbox() {
      overlay.classList.remove('is-open');
      if (lastFocused) lastFocused.focus();
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLightbox();
    });
    closeBtn.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
    });

    lightboxTriggers.forEach(function (trigger) {
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      if (!trigger.hasAttribute('aria-label')) trigger.setAttribute('aria-label', 'Click to enlarge image');
      trigger.addEventListener('click', function () {
        openLightbox(trigger.getAttribute('data-lightbox-src'), trigger.getAttribute('data-lightbox-alt'));
      });
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(trigger.getAttribute('data-lightbox-src'), trigger.getAttribute('data-lightbox-alt'));
        }
      });
    });
  }
});
