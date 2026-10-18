// Preview-only behavior: never submit personal information from a static demo.
document.addEventListener('submit', function(event) {
  if (event.target.id !== 'inquiry-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const status = document.getElementById('form-status');
  if(status) {
    status.hidden = false;
    status.classList.add('is-error');
    status.textContent = 'Toto je pouze interaktivní náhled. Formulář zatím neodesílá žádné zprávy.';
    status.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
}, true);
