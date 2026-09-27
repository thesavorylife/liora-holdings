// ─────────────────────────────────────────────────────────────────
// Liora Holdings Inc — Netlify Serverless Function
// File location in your project: netlify/functions/create-subscription.js
//
// SETUP INSTRUCTIONS:
// 1. In Netlify Dashboard → Site Settings → Environment Variables, add:
//    STRIPE_SECRET_KEY = sk_live_XXXXXXXXXXXXXXXX  (your Stripe secret key)
//
// 2. In your Stripe Dashboard, create three Products with recurring monthly prices:
//    - Foundation Retainer  → $1,500/month
//    - Strategy Retainer    → $3,500/month
//    - Advisory Retainer    → $6,500/month
//    Copy each Price ID (starts with price_) and paste into your index.html
//
// 3. Install Stripe in your project: npm install stripe
//    (Netlify will handle this automatically via package.json)
// ─────────────────────────────────────────────────────────────────

const Stripe = require('stripe');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { paymentMethodId, priceId, email, name, organization } = body;

  // Validate required fields
  if (!paymentMethodId || !priceId || !email || !name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: paymentMethodId, priceId, email, name' }),
    };
  }

  // Initialize Stripe with your secret key from environment variable
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Step 1: Create or retrieve a Stripe Customer
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      // Attach the new payment method to the existing customer
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } else {
      // Create a new customer
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { organization: organization || '' },
        payment_method: paymentMethodId,
      });
    }

    // Step 2: Set the payment method as default
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Step 3: Create the Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organization: organization || '',
        source: 'lioraholdingsinc.com',
      },
    });

    // Step 4: Check if payment needs additional confirmation (3D Secure / SCA)
    const paymentIntent = subscription.latest_invoice?.payment_intent;

    if (
      paymentIntent &&
      paymentIntent.status === 'requires_action' &&
      paymentIntent.client_secret
    ) {
      // Return client secret so frontend can confirm payment
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent.client_secret,
        }),
      };
    }

    // Card was declined or payment failed: cancel the incomplete subscription and report the error
    if (subscription.status === 'incomplete' && (!paymentIntent || paymentIntent.status !== 'requires_action')) {
      await stripe.subscriptions.cancel(subscription.id);
      const reason = paymentIntent?.last_payment_error?.message || 'Your card could not be charged. Please try another card.';
      return {
        statusCode: 402,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: reason }),
      };
    }

    // Payment succeeded without additional action needed
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: subscription.id,
        status: subscription.status,
      }),
    };

  } catch (err) {
    console.error('Stripe error:', err.message);

    // Return a user-friendly error message
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message || 'An error occurred processing your payment.',
      }),
    };
  }
};
