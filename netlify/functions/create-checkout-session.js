// Creates a real, multi-item Stripe Checkout Session for whatever is
// currently in the customer's basket (see assets/js/cart.js) and returns the
// hosted Stripe checkout URL for the browser to redirect the customer to.
//
// SETUP REQUIRED BEFORE THIS WORKS (done once, by CJ, in Netlify -- never in
// this codebase):
//   Netlify site settings -> Environment variables -> add STRIPE_SECRET_KEY,
//   using the *secret* key from the Stripe Dashboard (Developers -> API keys).
//   Never put the secret key in any file in this repository.
//
// This function only ever trusts Stripe Price IDs sent from the browser
// (e.g. "price_1AbC..."), never a raw price/amount -- Stripe itself looks up
// what that Price ID actually costs, so someone tampering with their
// browser's basket contents cannot change what they are actually charged.
//
// NOTE: an on-screen "tick to accept the disclaimer" checkbox at the Stripe
// Checkout step (folding in the compliance tick-box idea) is a good next
// addition here, but the exact current shape of Stripe's Checkout Sessions
// API for custom consent fields should be double-checked against Stripe's
// own docs at the time it's added, rather than guessed at -- so it has been
// left out of this first version. In the meantime the disclaimer link is
// already shown on the basket page itself before the customer checks out.

// UK VAT tax rate object, created once in the Stripe Dashboard (Settings ->
// Tax -> Tax rates: 20%, exclusive -- added on top of the price shown on the
// site, not included in it). Applied to every line item below so customers
// always pay the listed price plus VAT, matching how prices are shown
// site-wide. If this ever needs to change (a different rate, or per-product
// rates), update it here -- it's the one place tax is applied.
//
// LIVE Tax Rate ID (2026-09-18: swapped back from the temporary test-mode ID
// used for CJ's first real checkout test, which succeeded).
const UK_VAT_TAX_RATE_ID = 'txr_1UGLAtKv2SRkvpcudHprgVYw';

// Shipping: free once the order subtotal (goods only, before VAT) reaches
// £100, otherwise a flat £7.50 -- both amounts in pence, per CJ. The
// subtotal used for this decision is calculated below from Stripe's own
// Price records (looked up server-side), never from anything the browser
// sends, so it can't be spoofed by editing basket data client-side.
// NOTE: VAT is not currently applied to the shipping charge itself -- CJ is
// checking with her accountant whether it should be (UK delivery-charge VAT
// treatment usually follows the goods, but isn't assumed here rather than
// risk getting it wrong). Add `tax_rates`/tax_behavior to the shipping rate
// below once that's confirmed.
const FREE_SHIPPING_THRESHOLD_PENCE = 10000; // £100.00
const STANDARD_SHIPPING_PENCE = 750; // £7.50

const Stripe = require('stripe');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Stripe is not configured yet (missing STRIPE_SECRET_KEY environment variable in Netlify).'
      })
    };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  let items;
  try {
    const body = JSON.parse(event.body || '{}');
    items = body.items;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Basket is empty' }) };
  }

  const line_items = items
    .filter((item) => item && item.priceId)
    .map((item) => ({
      price: String(item.priceId),
      quantity: Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1)),
      tax_rates: [UK_VAT_TAX_RATE_ID]
    }));

  if (line_items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Basket is empty' }) };
  }

  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || 'https://www.thelivingfield.co.uk';

  try {
    // Look up each item's real price directly from Stripe (trusted source)
    // to work out the order subtotal, purely to decide which shipping
    // option to offer -- this never affects what the customer is actually
    // charged for the goods themselves, which Stripe calculates independently
    // from the same price IDs when the session is created below.
    let subtotalPence = 0;
    for (const li of line_items) {
      const priceObj = await stripe.prices.retrieve(li.price);
      if (typeof priceObj.unit_amount === 'number') {
        subtotalPence += priceObj.unit_amount * li.quantity;
      }
    }

    const freeShipping = subtotalPence >= FREE_SHIPPING_THRESHOLD_PENCE;
    const shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: freeShipping ? 0 : STANDARD_SHIPPING_PENCE,
            currency: 'gbp'
          },
          display_name: freeShipping ? 'Free UK shipping' : 'UK shipping'
        }
      }
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['GB'] },
      shipping_options,
      success_url: origin + '/basket/thank-you/',
      cancel_url: origin + '/basket/',
      // This Stripe account (Darklight Design Ltd) is also used for Darklight's
      // own Payment Links, so account-wide branding stays Darklight's -- rather
      // than fight that, this custom_text is attached only to sessions created
      // by this function (i.e. only Living Field checkouts), explaining the
      // Darklight name the customer is about to see on this page. It does not
      // affect Darklight's other Payment Links, which don't go through here.
      custom_text: {
        submit: {
          message: 'Darklight Design Ltd is the company behind The Living Field -- that\'s the name that will appear on your card or bank statement.'
        }
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Stripe checkout could not be started.' })
    };
  }
};
