// Basket / cart logic for The Living Field, shared across every page.
//
// Cart contents live in the browser's own localStorage only -- this is a
// static site with no accounts or database, so the basket persists across
// pages and repeat visits on the same device/browser, but does not sync
// between devices. Nothing here ever touches Stripe directly; when the
// customer checks out, the current basket contents (Stripe Price IDs and
// quantities only -- never a price the browser could tamper with) are sent
// to the create-checkout-session Netlify Function, which asks Stripe for a
// real Checkout Session and returns the hosted checkout URL to redirect to.
(function () {
  'use strict';

  var STORAGE_KEY = 'tlf-cart-v1';

  function readCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* private browsing, storage full, etc. -- fail silently */
    }
    updateBadge();
    document.dispatchEvent(new CustomEvent('tlf-cart-change', { detail: { items: items } }));
  }

  function addToCart(item) {
    if (!item || !item.priceId) return;
    var items = readCart();
    var existing = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].priceId === item.priceId) { existing = items[i]; break; }
    }
    if (existing) {
      existing.qty = Math.max(1, Math.min(99, existing.qty + (item.qty || 1)));
    } else {
      items.push({
        priceId: item.priceId,
        name: item.name || '',
        price: item.price || '',
        image: item.image || '',
        qty: Math.max(1, Math.min(99, item.qty || 1))
      });
    }
    writeCart(items);
  }

  function removeFromCart(priceId) {
    writeCart(readCart().filter(function (i) { return i.priceId !== priceId; }));
  }

  function setQty(priceId, qty) {
    var items = readCart();
    for (var i = 0; i < items.length; i++) {
      if (items[i].priceId === priceId) {
        items[i].qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
        break;
      }
    }
    writeCart(items);
  }

  function clearCart() {
    writeCart([]);
  }

  function cartCount() {
    return readCart().reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function updateBadge() {
    var count = cartCount();
    var badges = document.querySelectorAll('[data-cart-count]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(count);
      badges[i].hidden = count === 0;
    }
  }

  // "Add to basket" buttons anywhere on the site look like:
  // <button type="button" class="btn btn-solid" data-add-to-cart
  //   data-price-id="price_XXXX" data-name="Product Name" data-price="£123.00"
  //   data-image="../../assets/img/product.jpg"><span data-add-label>Add to basket</span></button>
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    addToCart({
      priceId: btn.getAttribute('data-price-id'),
      name: btn.getAttribute('data-name'),
      price: btn.getAttribute('data-price'),
      image: btn.getAttribute('data-image'),
      qty: 1
    });
    var label = btn.querySelector('[data-add-label]') || btn;
    var original = label.textContent;
    label.textContent = 'Added to basket ✓';
    btn.classList.add('is-added');
    window.clearTimeout(btn._tlfResetTimer);
    btn._tlfResetTimer = window.setTimeout(function () {
      label.textContent = original;
      btn.classList.remove('is-added');
    }, 1600);
  });

  document.addEventListener('DOMContentLoaded', updateBadge);
  updateBadge();

  window.TLFCart = {
    read: readCart,
    add: addToCart,
    remove: removeFromCart,
    setQty: setQty,
    clear: clearCart,
    count: cartCount
  };
})();
