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
      quantity: Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1))
    }));

  if (line_items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Basket is empty' }) };
  }

  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || 'https://www.thelivingfield.co.uk';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['GB'] },
      success_url: origin + '/basket/thank-you/',
      cancel_url: origin + '/basket/'
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
