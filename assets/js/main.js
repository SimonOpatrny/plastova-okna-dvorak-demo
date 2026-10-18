/* Dvořák — navigace, galerie, formulář a souhlas s analytikou bez frameworků */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Mobile menu
  const toggle = $('.mobile-toggle');
  const nav = $('#primary-nav');
  function closeMenu() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Otevřít navigaci');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zavřít navigaci' : 'Otevřít navigaci');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    });
    $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (innerWidth > 900) closeMenu(); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }

  // Analytics: GA4 is not downloaded before voluntary permission.
  const gaId = document.body.dataset.ga4?.trim() || '';
  const consentKey = 'dvorak_cookie_consent_v1';
  const cookieBar = $('#cookie-banner');
  let consent = null;
  try { consent = localStorage.getItem(consentKey); } catch (_) {}
  if (!['accept', 'reject'].includes(consent)) consent = null;
  let analyticsActive = false;
  function initAnalytics() {
    if (analyticsActive || !/^G-[A-Z0-9]+$/i.test(gaId)) return;
    analyticsActive = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(script);
  }
  function track(name, data = {}) {
    if (consent === 'accept' && analyticsActive && typeof window.gtag === 'function') {
      window.gtag('event', name, data);
    }
  }
  if (consent === 'accept') initAnalytics();
  if (cookieBar) cookieBar.hidden = consent !== null;
  $$('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => {
    consent = button.dataset.cookieChoice;
    try { localStorage.setItem(consentKey, consent); } catch (_) {}
    cookieBar.hidden = true;
    if (consent === 'accept') initAnalytics();
    else if (analyticsActive) {
      // Existing consent revoked: stop sending future events and discard GA cookies.
      analyticsActive = false;
      delete window.gtag;
      document.cookie.split(';').forEach(row => {
        const name = row.split('=')[0].trim();
        if (name.startsWith('_ga')) document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      });
      // Full teardown of a loaded GA script requires page reload.
      location.reload();
    }
  }));
  $$('[data-open-cookies]').forEach(button => button.addEventListener('click', () => {
    if (cookieBar) { cookieBar.hidden = false; $('[data-cookie-choice="reject"]', cookieBar)?.focus(); }
  }));
  $$('[data-track-call]').forEach(link => link.addEventListener('click', () => track('phone_click', { source_page: document.body.dataset.page || '' })));

  // Gallery filtering + accessible lightbox.
  const gallery = $('#gallery-grid');
  const lightbox = $('#lightbox');
  const galleryItems = gallery ? $$('button.gallery-item', gallery) : [];
  let current = 0;
  let lastTrigger = null;
  const activeItems = () => galleryItems.filter(item => !item.hidden);
  function renderLightbox() {
    if (!lightbox) return;
    const items = activeItems();
    if (!items.length) return;
    current = (current + items.length) % items.length;
    const item = items[current];
    const img = $('img', lightbox);
    img.src = item.dataset.full;
    img.alt = item.dataset.caption + ' — fotografie z původního webu';
    $('.lightbox-description', lightbox).textContent = item.dataset.caption + ' · původní web';
    $('.lightbox-position', lightbox).textContent = (current + 1) + ' / ' + items.length;
  }
  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove('menu-open');
    $('img', lightbox).removeAttribute('src');
    lastTrigger?.focus();
  }
  if (gallery && lightbox) {
    $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
      const cat = button.dataset.filter;
      $$('[data-filter]').forEach(b => { const on = b === button; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      galleryItems.forEach(item => item.hidden = !(cat === 'all' || item.dataset.category === cat));
      closeLightbox();
    }));
    galleryItems.forEach(item => item.addEventListener('click', () => {
      lastTrigger = item;
      current = activeItems().indexOf(item);
      renderLightbox();
      lightbox.hidden = false;
      document.body.classList.add('menu-open');
      $('.lightbox-close', lightbox).focus();
    }));
    $('.lightbox-close', lightbox).addEventListener('click', closeLightbox);
    $('.lightbox-prev', lightbox).addEventListener('click', () => { current--; renderLightbox(); });
    $('.lightbox-next', lightbox).addEventListener('click', () => { current++; renderLightbox(); });
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', e => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') { current++; renderLightbox(); }
      if (e.key === 'ArrowLeft') { current--; renderLightbox(); }
      if (e.key === 'Tab') {
        const buttons = $$('.lightbox-close, .lightbox-prev, .lightbox-next', lightbox);
        const idx = buttons.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) { buttons[buttons.length - 1].focus(); e.preventDefault(); }
        if (!e.shiftKey && idx === buttons.length - 1) { buttons[0].focus(); e.preventDefault(); }
      }
    });
  }

  // Validation and actual POST to PHP endpoint. Never fake a success state.
  const form = $('#inquiry-form');
  const status = $('#form-status');
  if (form && status) {
    function report(message, error = true) {
      status.hidden = false;
      status.classList.toggle('is-error', error);
      status.textContent = message;
      status.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
    function clearErrors() {
      $$('[aria-invalid="true"]', form).forEach(el => el.removeAttribute('aria-invalid'));
      $$('.field-error', form).forEach(el => el.remove());
    }
    function markError(name, message) {
      const input = form.elements.namedItem(name);
      if (!input || !(input instanceof HTMLElement)) return;
      input.setAttribute('aria-invalid', 'true');
      const note = document.createElement('p');
      note.className = 'field-error'; note.textContent = message;
      const field = input.closest('.field, .check-field');
      if (field) field.appendChild(note);
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearErrors();
      if (!form.checkValidity()) {
        const invalid = $$('input:invalid, select:invalid, textarea:invalid', form);
        invalid.forEach(input => markError(input.name, input.validity.valueMissing ? 'Toto pole je povinné.' : 'Zkontrolujte prosím zadanou hodnotu.'));
        invalid[0]?.focus();
        report('Zkontrolujte prosím označená pole.');
        return;
      }
      const submit = $('button[type="submit"]', form);
      submit.disabled = true;
      const original = submit.textContent;
      submit.textContent = 'Odesíláme…';
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin'
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          if (data.errors) Object.entries(data.errors).forEach(([name, message]) => markError(name, message));
          report(data.message || 'Odeslání nebylo úspěšné. Zkuste to znovu.');
          return;
        }
        report(data.message, false);
        form.reset();
        track('form_submit', { form_name: 'nezavazna_poptavka' });
        // The CSRF token rotates after success; reload token from freshly rendered page.
        const reload = await fetch(location.href, { credentials: 'same-origin' });
        const html = await reload.text();
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const token = $('input[name="csrf"]', parsed);
        if (token) $('input[name="csrf"]', form).value = token.value;
        $('input[name="started_at"]', form).value = String(Math.floor(Date.now() / 1000));
      } catch (error) {
        report('Nepodařilo se spojit se serverem. Zkuste to prosím později nebo nás kontaktujte e-mailem.');
      } finally {
        submit.disabled = false;
        submit.textContent = original;
      }
    });
  }
})();
