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

  // Product campaign banner: manual controls and measured auto-advance.
  // Pauses with pointer interaction or keyboard focus and respects reduced motion.
  const hero = $('[data-hero-carousel]');
  if (hero) {
    const slides = $$('[data-hero-slide]', hero);
    const selectors = $$('[data-slide-to]', hero);
    let selected = 0;
    let clock = null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function selectSlide(index) {
      selected = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const current = i === selected;
        slide.classList.toggle('is-active', current);
        slide.setAttribute('aria-hidden', String(!current));
        slide.inert = !current;
      });
      selectors.forEach((button, i) => {
        button.classList.toggle('is-active', i === selected);
        button.setAttribute('aria-pressed', String(i === selected));
      });
    }
    function stopRotation() { if (clock) { clearInterval(clock); clock = null; } }
    function startRotation() {
      stopRotation();
      if (!reduceMotion && !document.hidden && !hero.matches(':hover') && !hero.contains(document.activeElement)) {
        clock = setInterval(() => selectSlide(selected + 1), 8500);
      }
    }
    selectors.forEach((button, i) => button.addEventListener('click', () => { selectSlide(i); startRotation(); }));
    $('[data-slide-prev]', hero)?.addEventListener('click', () => { selectSlide(selected - 1); startRotation(); });
    $('[data-slide-next]', hero)?.addEventListener('click', () => { selectSlide(selected + 1); startRotation(); });
    hero.addEventListener('mouseenter', stopRotation);
    hero.addEventListener('mouseleave', startRotation);
    hero.addEventListener('focusin', stopRotation);
    hero.addEventListener('focusout', () => requestAnimationFrame(startRotation));
    document.addEventListener('visibilitychange', startRotation);
    selectSlide(0);
    startRotation();
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
    img.alt = item.dataset.caption + ' — ilustrační fotografie';
    $('.lightbox-description', lightbox).textContent = item.dataset.caption + ' · ilustrační foto';
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

  // Static HTML mode: no server or fake success, prepare mailto message only.
  const form = $('#inquiry-form');
  const status = $('#form-status');
  if (form) {
    const params = new URLSearchParams(location.search);
    const type = form.elements.namedItem('type');
    const locality = form.elements.namedItem('location');
    if (type && params.has('typ')) {
      const v = params.get('typ');
      if ([...type.options].some(o => o.value === v)) type.value = v;
    }
    if (locality && params.has('location')) locality.value = (params.get('location') || '').slice(0,120);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const subject = 'Nezávazná poptávka – ' + String(data.get('type') || '');
      const body = [
        'Dobrý den,', '', 'rád(a) bych požádal(a) o nezávaznou nabídku.', '',
        'Jméno: ' + data.get('name'), 'E-mail: ' + data.get('email'),
        'Telefon: ' + data.get('phone'), 'Produkt: ' + data.get('type'),
        'Lokalita: ' + data.get('location'), '', 'Zpráva:', data.get('message'),
        '', 'S pozdravem', data.get('name')
      ].join('\n');
      if (status) {
        status.hidden = false;
        status.classList.remove('is-error');
        status.textContent = 'Otevře se vaše e-mailová aplikace. V ní prosím zprávu skutečně odešlete; zatím nebyla odeslána.';
      }
      window.location.href = 'mailto:dvorak.zd@seznam.cz?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  // V4 progressive enhancements: accessible reveal, reading progress, and product guide.
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.querySelector('.v4-scroll-progress');
  let rafScheduled = false;
  const drawProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${available > 0 ? Math.min(1, window.scrollY / available) : 0})`;
    document.body.classList.toggle('v4-scrolled', window.scrollY > 110);
    rafScheduled = false;
  };
  window.addEventListener('scroll', () => { if (!rafScheduled) { rafScheduled = true; requestAnimationFrame(drawProgress); } }, { passive: true });
  drawProgress();
  if ('IntersectionObserver' in window && !motionReduced.matches) {
    const targets = document.querySelectorAll('.commerce-head, .showcase-card, .v3-mini-card, .process-grid article, .v3-split, .v4-faq-item, .material-section, .v4-selector');
    const reveal = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('v4-inview'); observer.unobserve(entry.target); }
    }, { threshold: .1, rootMargin: '0px 0px -24px 0px' });
    targets.forEach(el => { el.classList.add('v4-reveal'); reveal.observe(el); });
  }
  const selector = document.querySelector('[data-product-selector]');
  if (selector) {
    const choices = {
      okna: { kicker:'PROSVĚTLENÝ DOMOV', heading:'Okna, která dávají prostoru světlo.', text:'Plastová, hliníková i dřevěná okna. Vyberte provedení pro novostavbu nebo rekonstrukci a pošlete nám základní údaje.', image:'', alt:'Ilustrační dům s velkými okny',href:'okna.html', label:'Prohlédnout okna ↗',quote:'kontakt.html?typ=Plastová+okna#poptavka'},
      dvere: { kicker:'PRVNÍ DOJEM', heading:'Vstup, který má svůj charakter.',text:'Od materiálu až po design. Prohlédněte si možnosti vchodových dveří a slaďte vstup s architekturou domu.',image:'',alt:'Ilustrační vstup do domu',href:'dvere.html',label:'Prohlédnout dveře ↗',quote:'kontakt.html?typ=Dveře#poptavka'},
      pergoly: { kicker:'PROSTOR NAVÍC',heading:'Další místo pro společné chvíle.',text:'Pergoly, zastřešení teras a zimní zahrady. Představte nám prostor, který chcete vytvořit.',image:'',alt:'Ilustrační dům s venkovní terasou',href:'pergoly.html',label:'Prohlédnout pergoly ↗',quote:'kontakt.html?typ=Pergoly#poptavka'}
    };
    // Use already rendered image URL as base and verified illustrative source URLs.
    choices.okna.image = selector.querySelector('[data-selector-image]').src;
    choices.dvere.image = 'https://images.pexels.com/photos/36777846/pexels-photo-36777846.jpeg?auto=compress&cs=tinysrgb&w=1400';
    choices.pergoly.image = 'https://images.pexels.com/photos/35651529/pexels-photo-35651529.jpeg?auto=compress&cs=tinysrgb&w=1400';
    selector.querySelectorAll('[data-select-product]').forEach(button => button.addEventListener('click', () => {
      const item = choices[button.dataset.selectProduct]; if (!item) return;
      selector.querySelectorAll('[data-select-product]').forEach(b => { const active = b === button; b.classList.toggle('is-selected',active); b.setAttribute('aria-pressed',String(active)); });
      const picture=selector.querySelector('[data-selector-image]');picture.src=item.image;picture.alt=item.alt;
      selector.querySelector('[data-selector-kicker]').textContent=item.kicker;
      selector.querySelector('[data-selector-heading]').textContent=item.heading;
      selector.querySelector('[data-selector-text]').textContent=item.text;
      const link=selector.querySelector('[data-selector-link]');link.href=item.href;link.textContent=item.label;
      selector.querySelector('[data-selector-quote]').href=item.quote;
    }));
  }
  document.querySelectorAll('.v4-faq-item').forEach(detail => detail.addEventListener('toggle', () => {
    if (detail.open) detail.closest('.v4-faq-items').querySelectorAll('.v4-faq-item').forEach(other => { if (other !== detail) other.open = false; });
  }));

})();