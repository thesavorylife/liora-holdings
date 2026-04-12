var _stripe = null;
var _cardElement = null;
var _currentPriceId = null;

window.openModal = function(name, service, price, priceId) {
_currentPriceId = priceId;
document.getElementById(‘m-eyebrow’).textContent = service;
document.getElementById(‘m-title’).textContent = name;
document.getElementById(‘m-price’).textContent = price + ’ - auto-renews monthly - cancel anytime in writing’;
document.getElementById(‘formView’).style.display = ‘block’;
document.getElementById(‘successView’).style.display = ‘none’;
document.getElementById(‘card-error’).style.display = ‘none’;
document.getElementById(‘submit-btn’).disabled = false;
document.getElementById(‘submit-label’).textContent = ‘Confirm & Begin Retainer’;
document.getElementById(‘checkoutModal’).classList.add(‘active’);
document.body.style.overflow = ‘hidden’;
if (!_stripe) {
initStripe();
}
};

window.closeModal = function() {
document.getElementById(‘checkoutModal’).classList.remove(‘active’);
document.body.style.overflow = ‘’;
};

function initStripe() {
_stripe = Stripe(window._stripeKey);
var elements = _stripe.elements();
_cardElement = elements.create(‘card’, {
style: {
base: {
fontFamily: ‘Cormorant Garamond, Georgia, serif’,
fontSize: ‘15px’,
fontWeight: ‘300’,
color: ‘#1E1C19’
},
invalid: {
color: ‘#b94040’
}
}
});
_cardElement.mount(’#stripe-card-element’);
_cardElement.on(‘focus’, function() {
document.getElementById(‘stripe-card-element’).classList.add(‘focused’);
});
_cardElement.on(‘blur’, function() {
document.getElementById(‘stripe-card-element’).classList.remove(‘focused’);
});
_cardElement.on(‘change’, function(e) {
var err = document.getElementById(‘card-error’);
if (e.error) {
err.textContent = e.error.message;
err.style.display = ‘block’;
} else {
err.textContent = ‘’;
err.style.display = ‘none’;
}
});
}

window.handleSubmit = function() {
var name = document.getElementById(‘client-name’).value.trim();
var email = document.getElementById(‘client-email’).value.trim();
var org = document.getElementById(‘client-org’).value.trim();
var err = document.getElementById(‘card-error’);
var btn = document.getElementById(‘submit-btn’);
var label = document.getElementById(‘submit-label’);

if (!name || !email) {
err.textContent = ‘Please enter your full name and email address.’;
err.style.display = ‘block’;
return;
}

btn.disabled = true;
label.textContent = ‘Processing…’;
err.style.display = ‘none’;

_stripe.createPaymentMethod({
type: ‘card’,
card: _cardElement,
billing_details: { name: name, email: email }
}).then(function(result) {
if (result.error) {
err.textContent = result.error.message;
err.style.display = ‘block’;
btn.disabled = false;
label.textContent = ‘Confirm & Begin Retainer’;
return;
}

```
fetch('/.netlify/functions/create-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentMethodId: result.paymentMethod.id,
    priceId: _currentPriceId,
    email: email,
    name: name,
    organization: org
  })
}).then(function(response) {
  return response.json();
}).then(function(data) {
  if (data.error) {
    err.textContent = data.error;
    err.style.display = 'block';
    btn.disabled = false;
    label.textContent = 'Confirm & Begin Retainer';
    return;
  }
  if (data.clientSecret) {
    _stripe.confirmCardPayment(data.clientSecret).then(function(confirm) {
      if (confirm.error) {
        err.textContent = confirm.error.message;
        err.style.display = 'block';
        btn.disabled = false;
        label.textContent = 'Confirm & Begin Retainer';
        return;
      }
      document.getElementById('formView').style.display = 'none';
      document.getElementById('successView').style.display = 'block';
    });
  } else {
    document.getElementById('formView').style.display = 'none';
    document.getElementById('successView').style.display = 'block';
  }
}).catch(function(e) {
  err.textContent = 'An unexpected error occurred. Please try again.';
  err.style.display = 'block';
  btn.disabled = false;
  label.textContent = 'Confirm & Begin Retainer';
});
```

});
};

document.addEventListener(‘DOMContentLoaded’, function() {
var modal = document.getElementById(‘checkoutModal’);
if (modal) {
modal.addEventListener(‘click’, function(e) {
if (e.target === this) {
window.closeModal();
}
});
}
});
