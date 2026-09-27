window._stripe = null;
window._cardElement = null;
window._currentPriceId = null;

window.openModal = function(name, service, price, priceId) {
  window._currentPriceId = priceId;
  document.getElementById('m-eyebrow').textContent = service;
  document.getElementById('m-title').textContent = name;
  document.getElementById('m-price').textContent = price;
  document.getElementById('formView').style.display = 'block';
  document.getElementById('successView').style.display = 'none';
  document.getElementById('card-error').style.display = 'none';
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-label').textContent = 'Confirm and Begin Retainer';
  document.getElementById('checkoutModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  if (!window._stripe) {
    window._stripe = Stripe(_stripeKey);
    var elements = window._stripe.elements();
    window._cardElement = elements.create('card');
    window._cardElement.mount('#stripe-card-element');
  }
};

window.closeModal = function() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.body.style.overflow = '';
};

window.handleSubmit = function() {
  var name = document.getElementById('client-name').value.trim();
  var email = document.getElementById('client-email').value.trim();
  var org = document.getElementById('client-org').value.trim();
  var err = document.getElementById('card-error');
  var btn = document.getElementById('submit-btn');
  var label = document.getElementById('submit-label');
  if (!name || !email) {
    err.textContent = 'Please enter your name and email.';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true;
  label.textContent = 'Processing...';
  err.style.display = 'none';
  window._stripe.createPaymentMethod({
    type: 'card',
    card: window._cardElement,
    billing_details: { name: name, email: email }
  }).then(function(result) {
    if (result.error) {
      err.textContent = result.error.message;
      err.style.display = 'block';
      btn.disabled = false;
      label.textContent = 'Confirm and Begin Retainer';
      return;
    }
    fetch('/.netlify/functions/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: result.paymentMethod.id,
        priceId: window._currentPriceId,
        email: email,
        name: name,
        organization: org
      })
    }).then(function(r) {
      return r.json();
    }).then(function(data) {
      if (data.error) {
        err.textContent = data.error;
        err.style.display = 'block';
        btn.disabled = false;
        label.textContent = 'Confirm and Begin Retainer';
        return;
      }
      function showSuccess() {
        document.getElementById('formView').style.display = 'none';
        document.getElementById('successView').style.display = 'block';
      }
      if (data.clientSecret) {
        // Card needs extra verification (3D Secure): finish it before confirming
        window._stripe.confirmCardPayment(data.clientSecret).then(function(res) {
          if (res.error) {
            err.textContent = res.error.message;
            err.style.display = 'block';
            btn.disabled = false;
            label.textContent = 'Confirm and Begin Retainer';
            return;
          }
          showSuccess();
        });
        return;
      }
      showSuccess();
    }).catch(function() {
      err.textContent = 'An error occurred. Please try again.';
      err.style.display = 'block';
      btn.disabled = false;
      label.textContent = 'Confirm and Begin Retainer';
    });
  });
};

document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        window.closeModal();
      
      }    
    });
  }
});

window.sendInquiry = function() {
  var name = document.querySelector('.contact-form .form-input[placeholder="Your name"]').value.trim();
  var org = document.querySelector('.contact-form .form-input[placeholder="Company or firm"]').value.trim();
  var email = document.querySelector('.contact-form .form-input[placeholder="your email address"]').value.trim();
  var message = document.querySelector('.contact-form .form-textarea').value.trim();
  if (!name || !email || !message) {
    alert('Please fill in your name, email and message.');
    return;
  }
  window.location.href = 'mailto:info@lioraholdingsinc.com?subject=Inquiry from ' + encodeURIComponent(name) + '&body=' + encodeURIComponent('Name: ' + name + '\nOrganization: ' + org + '\nEmail: ' + email + '\n\nMessage:\n' + message);
};

