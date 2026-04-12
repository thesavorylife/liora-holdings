window.openModal = function(name, service, price, priceId) {
  var currentPriceId = priceId;
  window._currentPriceId = priceId;
  document.getElementById('m-eyebrow').textContent = service;
  document.getElementById('m-title').textContent = name;
  document.getElementById('m-price').textContent = price + ' - auto-renews monthly - cancel anytime in writing';
  document.getElementById('formView').style.display = 'block';
  document.getElementById('successView').style.display = 'none';
  document.getElementById('card-error').style.display = 'none';
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-label').textContent = 'Confirm & Begin Retainer';
  document.getElementById('checkoutModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  if (!window._stripe) window.initStripe();
};

window.closeModal = function() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.body.style.overflow = '';
};

window.initStripe = function() {
  window._stripe = Stripe(window._stripeKey);
  var elements = window._stripe.elements();
  window._cardElement = elements.create('card', {
    style: {
      base: {
        fontFamily: "'Cormorant Garamond',serif",
        fontSize: '15px',
        fontWeight: '300',
        color: '#1E1C19',
        '::placeholder': { color: 'rgba(122,114,106,0.5)' }
      },
      invalid: { color: '#b94040' }
    }
  });
  window._cardElement.mount('#stripe-card-element');
  window._cardElement.on('focus', function() {
    document.getElementById('stripe-card-element').classList.add('focused');
  });
  window._cardElement.on('blur', function() {
    document.getElementById('stripe-card-element').classList.remove('focused');
  });
  window._cardElement.on('change', function(e) {
    var err = document.getElementById('card-error');
    err.textContent = e.error ? e.error.message : '';
    err.style.display = e.error ? 'block' : 'none';
  });
};

window.handleSubmit = async function() {
  var name = document.getElementById('client-name').value.trim();
  var email = document.getElementById('client-email').value.trim();
  var org = document.getElementById('client-org').value.trim();
  var err = document.getElementById('card-error');
  var btn = document.getElementById('submit-
