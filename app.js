/* ==========================================================================
   Ekpale Estates — app.js  (Version 1)
   --------------------------------------------------------------------------
   One script powers both pages. <body data-page="client|admin"> decides
   which half runs.

   1. Shared helpers  (formatting, icons, placeholder art, modals, toasts)
   2. Client portal   (index.html)  — search, filter, grid, detail, inquiry, login
   3. Admin dashboard (admin.html)  — listings CRUD + inquiry leads
   ========================================================================== */
(function () {
  'use strict';

  const { CONFIG, DB, Favs, Auth, store } = window.Ekpale;

  /* ======================================================================
     1. SHARED HELPERS
     ====================================================================== */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Escape any user-supplied text before it goes into innerHTML
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const nf = new Intl.NumberFormat('en-US');
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  /* ---------- Money ---------- */
  const toUSD = (ghs) => Math.round(ghs / CONFIG.fxRate);
  const fmtMoney = (ghs, cur) => (cur === 'USD' ? 'USD ' + nf.format(toUSD(ghs)) : 'GH₵ ' + nf.format(ghs));
  const periodOf = (p) => (CONFIG.categories[p.category] || {}).period || '';

  function priceHTML(p, cur) {
    const other = cur === 'USD' ? 'GHS' : 'USD';
    const per = periodOf(p);
    return '<div class="price">' +
      '<div class="price__row"><span class="price__main">' + fmtMoney(p.price, cur) + '</span>' +
      (per ? '<span class="price__per">' + per + '</span>' : '') + '</div>' +
      '<span class="price__alt">' + fmtMoney(p.price, other) + (per ? ' ' + per : '') + '</span>' +
      '</div>';
  }

  // "GH₵750K" style short numbers for the price filter
  function short(n) {
    if (n >= 1e6) return +(n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return +(n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  /* ---------- Time ---------- */
  function timeAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 2) return 'Just now';
    if (mins < 60) return mins + ' Minutes Ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs === 1 ? '1 Hour Ago' : hrs + ' Hours Ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days === 1 ? '1 Day Ago' : days + ' Days Ago';
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  /* ---------- Icons (stroke SVG paths on a 24x24 grid) ---------- */
  const ICONS = {
    bed:   'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15h18M3 18v2M21 18v2M6 10V7.5A1.5 1.5 0 0 1 7.5 6h3A1.5 1.5 0 0 1 12 7.5V10',
    bath:  'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6.5A2.5 2.5 0 0 1 10 4.7M7 19l-1 2M17 19l1 2',
    area:  'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    car:   'M5 17v-5l2-5h10l2 5v5M3 17h18M7 20v-3M17 20v-3M7.5 13.5h.01M16.5 13.5h.01',
    heart: 'M12 20s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 7.6a5 5 0 0 1 9.3 3C19.5 15.4 12 20 12 20z',
    pin:   'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    edit:  'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
    home:  'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    tag:   'M3 12l9-9h8v8l-9 9-8-8z'
  };
  const ic = (name, size) => {
    const s = size || 18;
    return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
  };

  /* ---------- Placeholder property art (no external images needed) ---------- */
  const PALETTES = [
    ['#1b2559', '#e0a526', '#f7d58a'],
    ['#24365f', '#f08a5d', '#ffd8a8'],
    ['#2d2450', '#e86a5f', '#ffc2a8'],
    ['#16414a', '#7fd1b9', '#d8f3e8'],
    ['#3a2740', '#d98cb3', '#f6d3e4'],
    ['#1f3a5f', '#8fb8f2', '#dbe9ff']
  ];
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function tree(x, y, s) {
    return '<rect x="' + (x - 3 * s) + '" y="' + (y - 8 * s) + '" width="' + (6 * s) + '" height="' + (24 * s) + '" fill="#0a1222"/>' +
           '<circle cx="' + x + '" cy="' + (y - 24 * s) + '" r="' + (24 * s) + '" fill="#0d2527"/>' +
           '<circle cx="' + (x + 12 * s) + '" cy="' + (y - 14 * s) + '" r="' + (16 * s) + '" fill="#10302f"/>';
  }
  function artSVG(p) {
    const h = hashStr(String(p.id || p.title || 'x'));
    const pal = PALETTES[h % PALETTES.length];
    const c1 = pal[0], c2 = pal[1], c3 = pal[2];
    const dark = 'rgba(8,12,30,.80)';
    const slab = 'rgba(8,12,30,.96)';
    const sunX = h % 2 ? 470 : 130;
    let body = '';

    if (p.type === 'Land') {
      body += '<path d="M0 320 Q150 280 300 312 T600 296 V420 H0z" fill="#0f1a2e" opacity=".9"/>';
      body += '<path d="M0 360 Q200 330 380 356 T600 346 V420 H0z" fill="#0a1222"/>';
      body += '<polygon points="170,352 440,352 490,392 110,392" fill="none" stroke="' + c3 + '" stroke-width="2.2" stroke-dasharray="9 8" opacity=".85"/>';
      body += tree(80, 330, 1) + tree(535, 322, 1.1) + tree(500, 340, .7);
      body += '<rect x="296" y="296" width="6" height="58" fill="' + slab + '"/>';
      body += '<rect x="250" y="272" width="98" height="40" rx="4" fill="' + c2 + '"/>';
      body += '<rect x="262" y="284" width="60" height="5" rx="2" fill="rgba(8,12,30,.7)"/><rect x="262" y="295" width="42" height="5" rx="2" fill="rgba(8,12,30,.5)"/>';
    } else if (['Apartment', 'Penthouse', 'Commercial'].indexOf(p.type) !== -1) {
      const w = 150 + (h % 3) * 24, x = (600 - w) / 2, top = 56 + (h % 4) * 12;
      // side buildings for depth
      body += '<rect x="60" y="215" width="105" height="125" fill="rgba(8,12,30,.55)"/>';
      body += '<rect x="440" y="190" width="100" height="150" fill="rgba(8,12,30,.55)"/>';
      for (let i = 0; i < 4; i++) {
        body += '<rect x="' + (74 + (i % 2) * 40) + '" y="' + (232 + Math.floor(i / 2) * 36) + '" width="22" height="16" fill="' + c3 + '" opacity="' + (i % 3 === 0 ? .75 : .18) + '"/>';
        body += '<rect x="' + (454 + (i % 2) * 38) + '" y="' + (208 + Math.floor(i / 2) * 40) + '" width="22" height="16" fill="' + c3 + '" opacity="' + (i % 2 === 0 ? .7 : .16) + '"/>';
      }
      body += '<rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + (340 - top) + '" fill="' + dark + '"/>';
      body += '<rect x="' + (x - 10) + '" y="' + (top - 10) + '" width="' + (w + 20) + '" height="12" fill="' + slab + '"/>';
      const cols = 4, rows = Math.floor((340 - top - 34) / 32), padX = 16, cw = (w - padX * 2) / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const on = (r * 5 + c * 3 + h) % 4 === 0;
          body += '<rect x="' + (x + padX + c * cw + 5) + '" y="' + (top + 20 + r * 32) + '" width="' + (cw - 10) + '" height="17" rx="1.5" fill="' + c3 + '" opacity="' + (on ? .92 : .17) + '"/>';
        }
      }
      body += tree(40, 340, 1) + tree(570, 340, .9);
    } else {
      // House / Villa / Townhouse
      body += '<rect x="110" y="215" width="380" height="125" fill="' + dark + '"/>';
      body += '<rect x="215" y="150" width="210" height="65" fill="' + dark + '"/>';
      body += '<rect x="92" y="204" width="416" height="13" fill="' + slab + '"/>';
      body += '<rect x="198" y="141" width="244" height="11" fill="' + slab + '"/>';
      [[128, 250, 62], [206, 250, 62], [352, 250, 56], [428, 250, 50]].forEach(function (w, i) {
        const on = (i * 3 + h) % 3 !== 0;
        body += '<rect x="' + w[0] + '" y="' + w[1] + '" width="' + w[2] + '" height="46" rx="2" fill="' + c3 + '" opacity="' + (on ? .9 : .2) + '"/>';
      });
      body += '<rect x="284" y="268" width="38" height="72" fill="rgba(8,12,30,1)"/><rect x="288" y="272" width="30" height="68" fill="' + c2 + '" opacity=".55"/>';
      body += '<rect x="236" y="165" width="70" height="34" rx="2" fill="' + c3 + '" opacity=".85"/>';
      body += '<rect x="334" y="165" width="70" height="34" rx="2" fill="' + c3 + '" opacity=".35"/>';
      body += tree(58, 340, 1.1) + tree(548, 340, 1.2) + tree(30, 346, .7);
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>' +
      '<radialGradient id="s"><stop offset="0" stop-color="' + c3 + '" stop-opacity=".9"/><stop offset="1" stop-color="' + c3 + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="600" height="420" fill="url(#g)"/>' +
      '<circle cx="' + sunX + '" cy="105" r="110" fill="url(#s)"/><circle cx="' + sunX + '" cy="105" r="34" fill="' + c3 + '" opacity=".7"/>' +
      body +
      (p.type === 'Land' ? '' : '<rect y="340" width="600" height="80" fill="#0a1020"/><rect y="372" width="600" height="3" fill="' + c3 + '" opacity=".18"/>') +
      '</svg>';
  }
  const artURI = (p) => 'data:image/svg+xml;utf8,' + encodeURIComponent(artSVG(p || {}));

  // Accepts web links, embedded data:image URIs, and local file paths such as
  // images/villa.jpg. Anything with another scheme (javascript:, etc.) is rejected.
  const validImg = (u) => typeof u === 'string' && (
    /^(https?:\/\/|data:image\/)/i.test(u.trim()) ||
    /^(?![a-z][a-z0-9+.-]*:)[^\s<>"']+\.(jpe?g|png|webp|gif|avif|svg)$/i.test(u.trim())
  );

  const imgSrc = (p) => (validImg(p.image) ? p.image.trim() : artURI(p));
  const imgTag = (p, cls) =>
    '<img class="' + (cls || '') + '" src="' + esc(imgSrc(p)) + '" alt="' + esc(p.title + ' — ' + p.type + ' in ' + p.location) +
    '" loading="lazy" data-pid="' + esc(p.id) + '">';

  // If a user-supplied image URL fails to load, swap in the generated placeholder.
  // (error events don't bubble, so listen in the capture phase.)
  function bindImgFallback(root) {
    root.addEventListener('error', function (e) {
      const img = e.target;
      if (img && img.tagName === 'IMG' && img.dataset.pid && !img.dataset.fb) {
        img.dataset.fb = '1';
        img.src = artURI(DB.getProperty(img.dataset.pid) || {});
      }
    }, true);
  }

  /* ---------- Toasts ---------- */
  function toast(msg, kind) {
    let wrap = $('.toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toasts';
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2800);
  }

  /* ---------- Modals ---------- */
  const modalHooks = {};
  const lastFocus = {};
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    lastFocus[id] = document.activeElement;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const first = $('[data-autofocus]', m) || $('input:not([type=hidden]), select, textarea', m) || $('button:not(.modal__close)', m);
    if (first) first.focus({ preventScroll: true });
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('.modal.open')) document.body.classList.remove('no-scroll');
    if (lastFocus[id] && lastFocus[id].focus) lastFocus[id].focus({ preventScroll: true });
    if (modalHooks[id]) modalHooks[id]();
  }
  function closePops() {
    $$('.popover.open').forEach((p) => p.classList.remove('open'));
    $$('[aria-controls][aria-expanded]').forEach((b) => {
      if (b.id && /Btn$/.test(b.id) && b.getAttribute('aria-haspopup')) b.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (e) {
    const closer = e.target.closest('[data-close]');
    if (closer) {
      const modal = closer.closest('.modal');
      if (modal) closeModal(modal.id);
      return;
    }
    if (e.target.classList && e.target.classList.contains('modal')) closeModal(e.target.id);   // backdrop click
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('.popover.open')) { closePops(); return; }
    const open = $$('.modal.open');
    if (open.length) closeModal(open[open.length - 1].id);
  });

  /* ======================================================================
     2. CLIENT PORTAL  (index.html)
     ====================================================================== */
  function initClient() {
    const K = CONFIG.keys;

    /* ---- Price + bedroom filter configuration (all values in GHS) ---- */
    const PRICE_STEPS = {
      buy:      [250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000, 15000000, 25000000],
      rent:     [2000, 5000, 10000, 15000, 20000, 30000, 40000, 60000, 100000],
      shortlet: [200, 500, 1000, 1500, 2500, 5000, 10000]
    };
    const PRICE_PRESETS = {
      buy:      [[null, 750000], [750000, 2000000], [2000000, 5000000], [5000000, 15000000], [15000000, null]],
      rent:     [[null, 5000], [5000, 15000], [15000, 30000], [30000, 60000], [60000, null]],
      shortlet: [[null, 500], [500, 1000], [1000, 2500], [2500, 5000], [5000, null]]
    };
    const MAX_BEDS = 8;

    /* ---- State ---- */
    const state = {
      mode: 'buy', location: '', type: '', beds: 0, min: null, max: null,
      q: '', premium: false, saved: false, sort: 'featured',
      cur: store.get(K.currency) === 'USD' ? 'USD' : 'GHS'
    };
    let detailId = null;

    /* ---- Element refs ---- */
    const el = {
      grid: $('#grid'), empty: $('#empty'), count: $('#resultCount'),
      kicker: $('#resultsKicker'), heading: $('#resultsHeading'),
      location: $('#fLocation'), type: $('#fType'), sort: $('#fSort'),
      minPrice: $('#minPrice'), maxPrice: $('#maxPrice'), presets: $('#presets'),
      priceLabel: $('#priceLabel'), bedsLabel: $('#bedsLabel'), bedsVal: $('#bedsVal'),
      typeChips: $('#typeChips'), stats: $('#stats'),
      keyword: $('#fKeyword'), premium: $('#fPremium'), saved: $('#fSaved'),
      detail: $('#detailContent'), authSlot: $('#authSlot')
    };
    bindImgFallback(document);

    /* ---- Data helpers ---- */
    const publicProps = () => DB.getProperties().filter(DB.isPublic);
    const modeProps   = () => publicProps().filter((p) => p.category === state.mode);

    function getFiltered() {
      const q = state.q.trim().toLowerCase();
      const favs = state.saved ? Favs.get() : null;
      return modeProps().filter((p) => {
        if (state.location && p.location !== state.location) return false;
        if (state.type && p.type !== state.type) return false;
        if (state.beds && p.beds < state.beds) return false;
        if (state.min != null && p.price < state.min) return false;
        if (state.max != null && p.price > state.max) return false;
        if (state.premium && !p.premium) return false;
        if (favs && favs.indexOf(p.id) === -1) return false;
        if (q) {
          const hay = [p.title, p.location, p.address, p.type, p.description, (p.features || []).join(' ')].join(' ').toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }
    function sortList(list) {
      const arr = list.slice();
      switch (state.sort) {
        case 'newest':    arr.sort((a, b) => b.createdAt - a.createdAt); break;
        case 'priceAsc':  arr.sort((a, b) => a.price - b.price); break;
        case 'priceDesc': arr.sort((a, b) => b.price - a.price); break;
        default:          arr.sort((a, b) => (Number(b.premium) - Number(a.premium)) || (b.createdAt - a.createdAt));
      }
      return arr;
    }

    /* ---- Card markup ---- */
    function kickerText(p) {
      const forTxt = p.category === 'buy' ? 'for Sale' : p.category === 'rent' ? 'for Rent' : 'for Short Stay';
      return (p.beds > 0 ? p.beds + ' Bedroom ' : '') + p.type + ' ' + forTxt + ' in ' + p.location;
    }
    function specsHTML(p, max) {
      const items = [];
      if (p.beds > 0)    items.push(['bed',  p.beds,            p.beds === 1 ? 'Bedroom' : 'Bedrooms']);
      if (p.baths > 0)   items.push(['bath', p.baths,           p.baths === 1 ? 'Bathroom' : 'Bathrooms']);
      if (p.sqm > 0)     items.push(['area', nf.format(p.sqm),  'Sq. metres']);
      if (p.parking > 0) items.push(['car',  p.parking,         'Parking']);
      return items.slice(0, max || 3).map((s) =>
        '<div class="spec">' + ic(s[0], 20) + '<div><b>' + esc(s[1]) + '</b><small>' + s[2] + '</small></div></div>'
      ).join('');
    }
    function statusPill(p) {
      return '<span class="pill' + (p.status === 'Under Offer' ? ' pill--offer' : '') + '">' + esc(p.status) + '</span>';
    }
    function cardHTML(p) {
      const fav = Favs.has(p.id);
      return '<article class="card' + (p.premium ? ' card--premium' : '') + '" data-id="' + esc(p.id) + '">' +
        '<div class="card__media">' + imgTag(p, 'card__img') +
          '<div class="card__badges">' + statusPill(p) + '<span class="pill">' + timeAgo(p.createdAt) + '</span></div>' +
          '<button type="button" class="heart' + (fav ? ' is-on' : '') + '" aria-pressed="' + fav + '" aria-label="Save ' + esc(p.title) + '">' + ic('heart', 18) + '</button>' +
          (p.premium ? '<span class="badge-premium">Premium</span>' : '') +
        '</div>' +
        '<div class="card__body">' +
          '<p class="card__kicker">' + esc(kickerText(p)) + '</p>' +
          '<h3 class="card__title">' + esc(p.title) + '</h3>' +
          '<p class="card__addr">' + ic('pin', 14) + esc(p.address || p.location) + '</p>' +
          '<div class="specs">' + specsHTML(p, 3) + '</div>' +
          '<div class="card__foot">' + priceHTML(p, state.cur) +
            '<button type="button" class="btn btn--dark btn--sm card__cta">See details ' + ic('arrow', 15) + '</button></div>' +
        '</div></article>';
    }

    /* ---- Renderers ---- */
    function renderResults() {
      const list = sortList(getFiltered());
      el.grid.innerHTML = list.map(cardHTML).join('');
      el.grid.hidden = list.length === 0;
      el.empty.hidden = list.length !== 0;
      el.count.textContent = list.length === 1 ? '1 property found' : list.length + ' properties found';

      const base = { buy: 'Properties for sale', rent: 'Properties to rent', shortlet: 'Shortlet stays' }[state.mode];
      el.kicker.textContent = CONFIG.categories[state.mode].label + ' · ' + (state.cur === 'USD' ? 'Prices in USD' : 'Prices in GH₵');
      el.heading.textContent = base + (state.location ? ' in ' + state.location : ' across Accra');
    }

    function renderStats() {
      const props = publicProps();
      const areas = new Set(props.map((p) => p.location)).size;
      const premium = props.filter((p) => p.premium).length;
      el.stats.innerHTML =
        '<div class="stat"><strong>' + props.length + '</strong><span>Active listings</span></div>' +
        '<div class="stat"><strong>' + areas + '</strong><span>Areas covered</span></div>' +
        '<div class="stat"><strong>' + premium + '</strong><span>Premium homes</span></div>' +
        '<div class="stat"><strong>1 : ' + CONFIG.fxRate + '</strong><span>USD to GH₵ rate</span></div>';
    }

    function renderTypeChips() {
      const list = modeProps();
      const counts = {};
      list.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
      const chip = (value, label, n) => {
        const active = state.type === value;
        const disabled = !active && value && !n;
        return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-type="' + esc(value) + '" aria-pressed="' + active + '"' + (disabled ? ' disabled' : '') + '>' +
          esc(label) + ' <small>' + n + '</small></button>';
      };
      el.typeChips.innerHTML = chip('', 'All types', list.length) +
        CONFIG.types.map((t) => chip(t, t, counts[t] || 0)).join('');
    }

    function updatePriceLabel() {
      let label = 'Any price';
      if (state.min == null && state.max != null) label = 'Under GH₵' + short(state.max);
      else if (state.min != null && state.max == null) label = 'Over GH₵' + short(state.min);
      else if (state.min != null && state.max != null) label = 'GH₵' + short(state.min) + ' – GH₵' + short(state.max);
      el.priceLabel.textContent = label;
    }
    function updatePresetActive() {
      $$('button', el.presets).forEach((b) => {
        const mn = b.dataset.min === '' ? null : Number(b.dataset.min);
        const mx = b.dataset.max === '' ? null : Number(b.dataset.max);
        b.classList.toggle('active', mn === state.min && mx === state.max);
      });
    }
    function fillPriceUI() {
      const steps = PRICE_STEPS[state.mode];
      const opts = (placeholder) => '<option value="">' + placeholder + '</option>' +
        steps.map((n) => '<option value="' + n + '">GH₵ ' + short(n) + '</option>').join('');
      el.minPrice.innerHTML = opts('No min');
      el.maxPrice.innerHTML = opts('No max');
      el.minPrice.value = state.min == null ? '' : String(state.min);
      el.maxPrice.value = state.max == null ? '' : String(state.max);

      el.presets.innerHTML = PRICE_PRESETS[state.mode].map((r) => {
        const label = r[0] == null ? 'Under GH₵' + short(r[1]) : r[1] == null ? 'Over GH₵' + short(r[0]) : 'GH₵' + short(r[0]) + ' – GH₵' + short(r[1]);
        return '<li><button type="button" data-min="' + (r[0] == null ? '' : r[0]) + '" data-max="' + (r[1] == null ? '' : r[1]) + '">' + label + '</button></li>';
      }).join('');
      updatePresetActive();
      updatePriceLabel();
    }

    function updateBedsUI() {
      el.bedsLabel.textContent = state.beds ? state.beds + '+ beds' : 'Any beds';
      el.bedsVal.textContent = state.beds ? state.beds + '+' : 'Any';
      $$('#bedChips button').forEach((b) => b.classList.toggle('active', Number(b.dataset.beds) === state.beds));
      $('#bedsMinus').disabled = state.beds <= 0;
      $('#bedsPlus').disabled = state.beds >= MAX_BEDS;
    }

    // Re-sync every control with `state` (used on first load, mode change, cross-tab updates)
    function syncControls() {
      $$('.tab').forEach((t) => {
        const on = t.dataset.mode === state.mode;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      $$('#navLinks a').forEach((a) => a.classList.toggle('is-active', a.dataset.mode === state.mode));

      const locs = Array.from(new Set(modeProps().map((p) => p.location))).sort();
      if (state.location && locs.indexOf(state.location) === -1) state.location = '';
      el.location.innerHTML = '<option value="">All locations</option>' +
        locs.map((l) => '<option value="' + esc(l) + '">' + esc(l) + '</option>').join('');
      el.location.value = state.location;

      el.type.innerHTML = '<option value="">Any type</option>' +
        CONFIG.types.map((t) => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('');
      el.type.value = state.type;

      fillPriceUI();
      updateBedsUI();
      renderTypeChips();
    }

    function setMode(mode) {
      if (!CONFIG.categories[mode]) return;
      if (state.mode !== mode) { state.mode = mode; state.min = null; state.max = null; }  // price ranges differ per mode
      syncControls();
      renderResults();
    }

    function setCurrency(cur) {
      state.cur = cur;
      store.set(K.currency, cur);
      $$('[data-cur]').forEach((b) => {
        const on = b.dataset.cur === cur;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderResults();
      const slot = $('[data-price-slot]', el.detail);
      const p = detailId && DB.getProperty(detailId);
      if (slot && p) slot.innerHTML = priceHTML(p, cur);
    }

    function setType(t) {
      state.type = t;
      el.type.value = t;
      renderTypeChips();
      renderResults();
    }

    /* ---- Popovers ---- */
    function togglePop(popId, btn) {
      const pop = document.getElementById(popId);
      const willOpen = !pop.classList.contains('open');
      closePops();
      if (willOpen) { pop.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.field--pop')) closePops();
    });
    $('#priceBtn').addEventListener('click', (e) => togglePop('pricePop', e.currentTarget));
    $('#bedsBtn').addEventListener('click', (e) => togglePop('bedsPop', e.currentTarget));
    $('#priceDone').addEventListener('click', closePops);
    $('#bedsDone').addEventListener('click', closePops);

    /* ---- Filter listeners (instant, no page reload) ---- */
    el.location.addEventListener('change', () => { state.location = el.location.value; renderResults(); });
    el.type.addEventListener('change', () => setType(el.type.value));
    el.sort.addEventListener('change', () => { state.sort = el.sort.value; renderResults(); });
    el.keyword.addEventListener('input', () => { state.q = el.keyword.value; renderResults(); });
    el.premium.addEventListener('change', () => { state.premium = el.premium.checked; renderResults(); });
    el.saved.addEventListener('change', () => { state.saved = el.saved.checked; renderResults(); });

    function onMinMax() {
      state.min = el.minPrice.value === '' ? null : Number(el.minPrice.value);
      state.max = el.maxPrice.value === '' ? null : Number(el.maxPrice.value);
      if (state.min != null && state.max != null && state.min > state.max) {   // keep the range valid
        const t = state.min; state.min = state.max; state.max = t;
        el.minPrice.value = String(state.min);
        el.maxPrice.value = String(state.max);
      }
      updatePresetActive(); updatePriceLabel(); renderResults();
    }
    el.minPrice.addEventListener('change', onMinMax);
    el.maxPrice.addEventListener('change', onMinMax);

    el.presets.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-min]');
      if (!b) return;
      state.min = b.dataset.min === '' ? null : Number(b.dataset.min);
      state.max = b.dataset.max === '' ? null : Number(b.dataset.max);
      el.minPrice.value = state.min == null ? '' : String(state.min);
      el.maxPrice.value = state.max == null ? '' : String(state.max);
      updatePresetActive(); updatePriceLabel(); renderResults();
    });
    $('#priceReset').addEventListener('click', () => {
      state.min = null; state.max = null;
      el.minPrice.value = ''; el.maxPrice.value = '';
      updatePresetActive(); updatePriceLabel(); renderResults();
    });

    function setBeds(n) {
      state.beds = Math.max(0, Math.min(MAX_BEDS, n));
      updateBedsUI(); renderResults();
    }
    $('#bedsMinus').addEventListener('click', () => setBeds(state.beds - 1));
    $('#bedsPlus').addEventListener('click', () => setBeds(state.beds + 1));
    $('#bedsReset').addEventListener('click', () => setBeds(0));
    $('#bedChips').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-beds]');
      if (b) setBeds(Number(b.dataset.beds));
    });

    // Buy / Rent / Shortlet tabs + nav links
    $$('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
    $$('#navLinks a').forEach((a) => a.addEventListener('click', () => {
      setMode(a.dataset.mode);
      $('#nav').classList.remove('nav--open');
      $('#burger').setAttribute('aria-expanded', 'false');
    }));
    $('#burger').addEventListener('click', (e) => {
      const open = $('#nav').classList.toggle('nav--open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    });

    // Property-type chips
    el.typeChips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b || b.disabled) return;
      const t = b.dataset.type;
      setType(t && state.type === t ? '' : t);
    });

    // Currency toggle
    $$('[data-cur]').forEach((b) => b.addEventListener('click', () => setCurrency(b.dataset.cur)));

    // More options
    $('#moreToggle').addEventListener('click', (e) => {
      const more = $('#more');
      more.hidden = !more.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!more.hidden));
    });

    function clearAll() {
      Object.assign(state, { location: '', type: '', beds: 0, min: null, max: null, q: '', premium: false, saved: false });
      el.keyword.value = ''; el.premium.checked = false; el.saved.checked = false;
      syncControls(); renderResults();
    }
    $('#clearAll').addEventListener('click', clearAll);
    $('#emptyReset').addEventListener('click', clearAll);

    $('#searchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      closePops();
      $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* ---- Cards: open details / save ---- */
    function syncFavUI(id, on) {
      $$('.card[data-id="' + id + '"] .heart').forEach((h) => { h.classList.toggle('is-on', on); h.setAttribute('aria-pressed', String(on)); });
      const btn = $('[data-action="fav"]', el.detail);
      if (btn && detailId === id) {
        btn.classList.toggle('is-on', on);
        btn.lastChild.textContent = on ? ' Saved' : ' Save';
      }
    }
    el.grid.addEventListener('click', (e) => {
      const heart = e.target.closest('.heart');
      if (heart) {
        const id = heart.closest('.card').dataset.id;
        const on = Favs.toggle(id);
        syncFavUI(id, on);
        toast(on ? 'Saved to your shortlist' : 'Removed from saved homes');
        if (state.saved) renderResults();
        return;
      }
      const card = e.target.closest('.card');
      if (card) openDetail(card.dataset.id);
    });

    /* ---- Detail modal + inquiry form ---- */
    function openDetail(id) {
      const p = DB.getProperty(id);
      if (!p) return;
      detailId = id;
      el.detail.innerHTML = detailHTML(p);
      openModal('detailModal');
      $('.modal__panel', $('#detailModal')).scrollTop = 0;
    }
    modalHooks.detailModal = function () { detailId = null; };

    function detailHTML(p) {
      const fav = Favs.has(p.id);
      const cells = [];
      if (p.beds > 0)    cells.push(['bed', p.beds, p.beds === 1 ? 'Bedroom' : 'Bedrooms']);
      if (p.baths > 0)   cells.push(['bath', p.baths, p.baths === 1 ? 'Bathroom' : 'Bathrooms']);
      if (p.sqm > 0)     cells.push(['area', nf.format(p.sqm) + ' m²', 'Floor / plot area']);
      if (p.parking > 0) cells.push(['car', p.parking, 'Parking spaces']);
      cells.push(['home', p.type, 'Property type']);
      cells.push(['tag', timeAgo(p.createdAt), 'Listed']);
      const feats = (p.features || []).map((f) => '<li>' + ic('check', 14) + esc(f) + '</li>').join('');

      return '<div class="detail">' +
        '<div class="detail__media">' + imgTag(p, 'detail__img') +
          '<div class="card__badges">' + statusPill(p) + (p.premium ? '<span class="pill pill--gold">Premium</span>' : '') + '</div>' +
        '</div>' +
        '<div class="detail__info">' +

          '<div id="viewDetails">' +
            '<p class="card__kicker">' + esc(kickerText(p)) + '</p>' +
            '<h2 class="detail__title" id="detailTitle">' + esc(p.title) + '</h2>' +
            '<p class="card__addr">' + ic('pin', 15) + esc(p.address || p.location) + '</p>' +
            '<div class="detail__price" data-price-slot>' + priceHTML(p, state.cur) + '</div>' +
            '<div class="spec-grid">' + cells.map((c) =>
              '<div class="spec-cell">' + ic(c[0], 20) + '<div><b>' + esc(c[1]) + '</b><small>' + c[2] + '</small></div></div>').join('') + '</div>' +
            (p.description ? '<h4>About this property</h4><p class="detail__desc">' + esc(p.description) + '</p>' : '') +
            (feats ? '<h4>Features</h4><ul class="feat">' + feats + '</ul>' : '') +
            '<div class="detail__cta">' +
              '<button type="button" class="btn btn--dark" data-action="inquire" data-autofocus>Make an inquiry ' + ic('arrow', 16) + '</button>' +
              '<button type="button" class="btn btn--ghost' + (fav ? ' is-on' : '') + '" data-action="fav">' + ic('heart', 16) + '<span> ' + (fav ? 'Saved' : 'Save') + '</span></button>' +
            '</div>' +
          '</div>' +

          '<div id="viewInquiry" hidden>' +
            '<p class="card__kicker">Inquiry</p>' +
            '<h2 class="detail__title">Ask about ' + esc(p.title) + '</h2>' +
            '<p class="modal__sub">Leave your details and an Ekpale agent will get back to you within one business day.</p>' +
            '<form id="inquiryForm" novalidate>' +
              '<div class="fg"><label for="iqName">Full name</label><input id="iqName" name="name" type="text" autocomplete="name" required><span class="err" data-err="name"></span></div>' +
              '<div class="form-grid">' +
                '<div class="fg"><label for="iqEmail">Email</label><input id="iqEmail" name="email" type="email" autocomplete="email" required><span class="err" data-err="email"></span></div>' +
                '<div class="fg"><label for="iqPhone">Phone</label><input id="iqPhone" name="phone" type="tel" autocomplete="tel" placeholder="+233 24 000 0000" required><span class="err" data-err="phone"></span></div>' +
              '</div>' +
              '<div class="fg"><label for="iqMsg">Message</label><textarea id="iqMsg" name="message" rows="4" maxlength="600" required>' +
                esc('Hi, I’m interested in “' + p.title + '” in ' + p.location + '. Please contact me with more details.') + '</textarea><span class="err" data-err="message"></span></div>' +
              '<div class="modal__actions">' +
                '<button type="button" class="btn btn--ghost" data-action="back">Back</button>' +
                '<button type="submit" class="btn btn--dark" id="iqSubmit">Send inquiry</button>' +
              '</div>' +
            '</form>' +
          '</div>' +

          '<div id="viewSuccess" class="success" hidden></div>' +
        '</div></div>';
    }

    function showView(name) {
      ['viewDetails', 'viewInquiry', 'viewSuccess'].forEach((v) => {
        const node = $('#' + v, el.detail);
        if (node) node.hidden = v !== name;
      });
      $('.modal__panel', $('#detailModal')).scrollTop = 0;
    }

    el.detail.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'inquire') { showView('viewInquiry'); const n = $('#iqName', el.detail); if (n) n.focus(); }
      if (action === 'back') showView('viewDetails');
      if (action === 'done') closeModal('detailModal');
      if (action === 'fav' && detailId) {
        const on = Favs.toggle(detailId);
        syncFavUI(detailId, on);
        toast(on ? 'Saved to your shortlist' : 'Removed from saved homes');
        if (state.saved) renderResults();
      }
    });

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^[+()\d][\d\s()-]{7,17}$/;

    // Simulated async request (stands in for fetch() to a real API in v2)
    function sendInquiry(payload) {
      return new Promise((resolve) => setTimeout(() => resolve(DB.addLead(payload)), 900));
    }

    el.detail.addEventListener('submit', async (e) => {
      const form = e.target.closest('#inquiryForm');
      if (!form) return;
      e.preventDefault();

      $$('.err', form).forEach((n) => { n.textContent = ''; });
      $$('.invalid', form).forEach((n) => n.classList.remove('invalid'));

      const data = {
        name: form.elements.name.value.trim(), email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(), message: form.elements.message.value.trim()
      };
      const errors = {};
      if (data.name.length < 2) errors.name = 'Please enter your full name.';
      if (!EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.';
      if (!PHONE_RE.test(data.phone)) errors.phone = 'Enter a valid phone number.';
      if (data.message.length < 5) errors.message = 'Please add a short message.';

      const keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach((k) => {
          $('[data-err="' + k + '"]', form).textContent = errors[k];
          form.elements[k].classList.add('invalid');
        });
        form.elements[keys[0]].focus();
        return;
      }

      const p = DB.getProperty(detailId);
      if (!p) { toast('Sorry, this listing is no longer available.', 'error'); closeModal('detailModal'); return; }

      const submit = $('#iqSubmit', form);
      submit.disabled = true;
      submit.classList.add('loading');
      try {
        await sendInquiry(Object.assign({}, data, { propertyId: p.id, propertyTitle: p.title }));
        const ok = $('#viewSuccess', el.detail);
        ok.innerHTML = '<div class="success__icon">' + ic('check', 30) + '</div>' +
          '<h2 class="detail__title">Thank you, ' + esc(data.name.split(' ')[0]) + '!</h2>' +
          '<p class="modal__sub">Your inquiry about <strong>' + esc(p.title) + '</strong> has been sent. An Ekpale agent will contact you on ' +
          esc(data.email) + ' or ' + esc(data.phone) + ' shortly.</p>' +
          '<button type="button" class="btn btn--dark" data-action="done">Keep browsing</button>';
        showView('viewSuccess');
      } catch (err) {
        toast('Something went wrong. Please try again.', 'error');
      } finally {
        submit.disabled = false;
        submit.classList.remove('loading');
      }
    });

    /* ---- Mock auth UI ---- */
    function renderAuthSlot() {
      el.authSlot.innerHTML = Auth.isAdmin()
        ? '<a class="btn btn--gold btn--sm" href="admin.html">Dashboard</a>' +
          '<button type="button" class="btn btn--ghost-light btn--sm" data-auth="out">Sign out</button>'
        : '<button type="button" class="btn btn--ghost-light btn--sm" data-auth="in">Sign in</button>';
    }
    el.authSlot.addEventListener('click', (e) => {
      const b = e.target.closest('[data-auth]');
      if (!b) return;
      if (b.dataset.auth === 'in') openModal('loginModal');
      if (b.dataset.auth === 'out') { Auth.logout(); renderAuthSlot(); toast('Signed out'); }
    });
    $('#footerAdmin').addEventListener('click', () => {
      if (Auth.isAdmin()) location.href = 'admin.html'; else openModal('loginModal');
    });
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#loginPass');
      const err = $('#loginErr');
      if (Auth.login(input.value)) {
        err.textContent = '';
        toast('Welcome back — opening dashboard…');
        setTimeout(() => { location.href = 'admin.html'; }, 400);
      } else {
        err.textContent = 'Incorrect passcode. Please try again.';
        input.classList.add('invalid');
        input.select();
      }
    });
    modalHooks.loginModal = function () {
      $('#loginPass').value = '';
      $('#loginErr').textContent = '';
      $('#loginPass').classList.remove('invalid');
    };

    // Keep the portal fresh if the admin edits data in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === null || [K.properties, K.leads, K.isAdmin, K.favs].indexOf(e.key) !== -1) {
        syncControls(); renderResults(); renderStats(); renderAuthSlot();
      }
    });

    /* ---- Boot ---- */
    $('#year').textContent = new Date().getFullYear();
    setCurrency(state.cur);
    syncControls();
    renderResults();
    renderStats();
    renderAuthSlot();
  }

  /* ======================================================================
     3. ADMIN DASHBOARD  (admin.html)
     ====================================================================== */
  function initAdmin() {
    // Mock route guard (the inline <head> script already redirects before paint)
    if (!Auth.isAdmin()) { location.replace('index.html'); return; }

    bindImgFallback(document);
    let editingId = null;
    let confirmResolve = null;

    const f = {
      form: $('#propertyForm'), title: $('#pTitle'), category: $('#pCategory'), type: $('#pType'),
      status: $('#pStatus'), price: $('#pPrice'), priceLbl: $('#pPriceLbl'), location: $('#pLocation'),
      address: $('#pAddress'), beds: $('#pBeds'), baths: $('#pBaths'), sqm: $('#pSqm'), parking: $('#pParking'),
      image: $('#pImage'), desc: $('#pDescription'), features: $('#pFeatures'), premium: $('#pPremium')
    };
    const listingBody = $('#listingBody');
    const leadBody = $('#leadBody');

    // Populate static selects
    f.type.innerHTML = CONFIG.types.map((t) => '<option>' + esc(t) + '</option>').join('');
    f.status.innerHTML = CONFIG.statuses.map((s) => '<option>' + esc(s) + '</option>').join('');

    const options = (list, selected) => list.map((o) =>
      '<option' + (o === selected ? ' selected' : '') + '>' + esc(o) + '</option>').join('');

    /* ---------- Render ---------- */
    function renderStats() {
      const props = DB.getProperties();
      const leads = DB.getLeads();
      const active = props.filter(DB.isPublic);
      const cards = [
        ['Active listings', active.length, 'Visible on the public portal'],
        ['Premium', active.filter((p) => p.premium).length, 'Gold-highlighted listings'],
        ['Total inquiries', leads.length, 'From buyers and renters'],
        ['New inquiries', leads.filter((l) => l.status === 'New').length, 'Awaiting a response']
      ];
      $('#adminStats').innerHTML = cards.map((c) =>
        '<div class="stat-card"><span>' + c[0] + '</span><strong>' + c[1] + '</strong><small>' + c[2] + '</small></div>').join('');
      $('#countListings').textContent = props.length;
      $('#countLeads').textContent = leads.length;

      // location suggestions for the form
      const locs = Array.from(new Set(props.map((p) => p.location))).sort();
      $('#locationList').innerHTML = locs.map((l) => '<option value="' + esc(l) + '">').join('');
    }

    function rowHTML(p) {
      const hidden = !DB.isPublic(p);
      const per = periodOf(p);
      return '<tr data-id="' + esc(p.id) + '" class="' + (hidden ? 'row--hidden' : '') + '">' +
        '<td><div class="cell-prop">' + imgTag(p, 'thumb') +
          '<div><strong>' + esc(p.title) + '</strong><span>' + ic('pin', 12) + esc(p.location) + '</span></div></div></td>' +
        '<td>' + esc(p.type) + '</td>' +
        '<td><span class="tag tag--' + esc(p.category) + '">' + esc((CONFIG.categories[p.category] || {}).label || p.category) + '</span></td>' +
        '<td class="num">' + nf.format(p.price) + (per ? ' <small>' + per + '</small>' : '') + '</td>' +
        '<td><select class="inline-select" data-action="status" aria-label="Status for ' + esc(p.title) + '">' + options(CONFIG.statuses, p.status) + '</select></td>' +
        '<td><label class="switch"><input type="checkbox" data-action="premium" aria-label="Premium: ' + esc(p.title) + '"' + (p.premium ? ' checked' : '') + '><span></span></label></td>' +
        '<td class="muted">' + timeAgo(p.createdAt) + '</td>' +
        '<td class="actions-col"><button type="button" class="icon-btn" data-action="edit" aria-label="Edit ' + esc(p.title) + '" title="Edit">' + ic('edit', 17) + '</button>' +
          '<button type="button" class="icon-btn icon-btn--danger" data-action="delete" aria-label="Delete ' + esc(p.title) + '" title="Delete">' + ic('trash', 17) + '</button></td>' +
        '</tr>';
    }

    function renderListings() {
      const q = $('#lstSearch').value.trim().toLowerCase();
      const cat = $('#lstCat').value;
      const list = DB.getProperties()
        .filter((p) => (!cat || p.category === cat) &&
          (!q || (p.title + ' ' + p.location + ' ' + p.address).toLowerCase().indexOf(q) !== -1))
        .sort((a, b) => b.createdAt - a.createdAt);
      listingBody.innerHTML = list.length
        ? list.map(rowHTML).join('')
        : '<tr><td colspan="8" class="empty-row">No listings found. Click “Add property” to create one.</td></tr>';
    }

    function renderLeads() {
      const leads = DB.getLeads().sort((a, b) => b.createdAt - a.createdAt);
      leadBody.innerHTML = leads.length ? leads.map((l) =>
        '<tr data-id="' + esc(l.id) + '">' +
          '<td class="muted nowrap">' + esc(fmtDateTime(l.createdAt)) + '</td>' +
          '<td><strong>' + esc(l.name) + '</strong><br>' +
            '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a><br>' +
            '<a href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a></td>' +
          '<td>' + esc(l.propertyTitle || '—') + '</td>' +
          '<td class="msg">' + esc(l.message) + '</td>' +
          '<td><select class="inline-select" data-action="lead-status" aria-label="Lead status">' + options(CONFIG.leadStatuses, l.status) + '</select></td>' +
          '<td class="actions-col"><button type="button" class="icon-btn icon-btn--danger" data-action="lead-delete" aria-label="Delete inquiry from ' + esc(l.name) + '" title="Delete">' + ic('trash', 17) + '</button></td>' +
        '</tr>').join('')
        : '<tr><td colspan="6" class="empty-row">No inquiries yet. They appear here when a buyer submits the form on the public site.</td></tr>';
    }

    function renderAll() { renderStats(); renderListings(); renderLeads(); }

    /* ---------- Confirm dialog (promise-based) ---------- */
    function confirmDialog(title, message, okText) {
      $('#confirmTitle').textContent = title;
      $('#confirmMsg').textContent = message;
      $('#confirmOk').textContent = okText || 'Delete';
      openModal('confirmModal');
      return new Promise((resolve) => { confirmResolve = resolve; });
    }
    modalHooks.confirmModal = function () {
      if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); }
    };
    $('#confirmOk').addEventListener('click', () => {
      const r = confirmResolve;
      confirmResolve = null;
      closeModal('confirmModal');
      if (r) r(true);
    });

    /* ---------- Tabs ---------- */
    $$('.admin-tabs button').forEach((b) => b.addEventListener('click', () => {
      $$('.admin-tabs button').forEach((x) => {
        const on = x === b;
        x.classList.toggle('active', on);
        x.setAttribute('aria-selected', String(on));
        $('#tab-' + x.dataset.tab).hidden = !on;
      });
    }));

    /* ---------- Filters ---------- */
    $('#lstSearch').addEventListener('input', renderListings);
    $('#lstCat').addEventListener('change', renderListings);

    /* ---------- Table actions: Update (inline) + Delete ---------- */
    listingBody.addEventListener('change', (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      const id = row.dataset.id;
      if (e.target.dataset.action === 'status') {
        DB.updateProperty(id, { status: e.target.value });
        row.classList.toggle('row--hidden', CONFIG.hiddenStatuses.indexOf(e.target.value) !== -1);
        renderStats();
        toast('Status set to “' + e.target.value + '”');
      }
      if (e.target.dataset.action === 'premium') {
        DB.updateProperty(id, { premium: e.target.checked });
        renderStats();
        toast(e.target.checked ? 'Marked as Premium' : 'Premium removed');
      }
    });
    listingBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const row = btn.closest('tr[data-id]');
      const p = DB.getProperty(row.dataset.id);
      if (!p) return;
      if (btn.dataset.action === 'edit') openForm(p);
      if (btn.dataset.action === 'delete') {
        const yes = await confirmDialog('Delete this listing?', '“' + p.title + '” will be removed permanently. This cannot be undone.');
        if (yes) { DB.deleteProperty(p.id); renderAll(); toast('Listing deleted'); }
      }
    });

    leadBody.addEventListener('change', (e) => {
      if (e.target.dataset.action !== 'lead-status') return;
      DB.updateLead(e.target.closest('tr').dataset.id, { status: e.target.value });
      renderStats();
      toast('Inquiry marked “' + e.target.value + '”');
    });
    leadBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="lead-delete"]');
      if (!btn) return;
      const id = btn.closest('tr').dataset.id;
      const yes = await confirmDialog('Delete this inquiry?', 'The inquiry will be removed permanently.');
      if (yes) { DB.deleteLead(id); renderAll(); toast('Inquiry deleted'); }
    });

    /* ---------- Create / Edit form ---------- */
    function updatePriceLabel() {
      f.priceLbl.textContent = { buy: 'Price (GH₵)', rent: 'Rent per month (GH₵)', shortlet: 'Rate per day (GH₵)' }[f.category.value];
    }
    f.category.addEventListener('change', () => {
      // Nudge status to the new category's default only if it is still a default value
      const defaults = Object.keys(CONFIG.categories).map((k) => CONFIG.categories[k].status);
      if (defaults.indexOf(f.status.value) !== -1) f.status.value = CONFIG.categories[f.category.value].status;
      updatePriceLabel();
    });

    function clearErrors() {
      $$('.err', f.form).forEach((n) => { n.textContent = ''; });
      $$('.invalid', f.form).forEach((n) => n.classList.remove('invalid'));
    }

    function openForm(p) {
      editingId = p ? p.id : null;
      clearErrors();
      $('#formTitle').textContent = p ? 'Edit property' : 'Add property';
      $('#saveBtn').textContent = p ? 'Save changes' : 'Add property';
      const d = p || { title: '', category: 'buy', type: 'Apartment', status: 'For Sale', price: '', location: '', address: '',
        beds: 0, baths: 0, sqm: 0, parking: 0, image: '', description: '', features: [], premium: false };
      f.title.value = d.title;
      f.category.value = d.category;
      f.type.value = d.type;
      f.status.value = d.status;
      f.price.value = d.price;
      f.location.value = d.location;
      f.address.value = d.address || '';
      f.beds.value = d.beds; f.baths.value = d.baths; f.sqm.value = d.sqm; f.parking.value = d.parking;
      f.image.value = d.image || '';
      f.desc.value = d.description || '';
      f.features.value = (d.features || []).join(', ');
      f.premium.checked = !!d.premium;
      updatePriceLabel();
      openModal('propertyModal');
    }
    $('#addBtn').addEventListener('click', () => openForm(null));

    function readForm() {
      const num = (input, parse) => { const v = parse(input.value); return isNaN(v) || v < 0 ? 0 : v; };
      const loc = f.location.value.trim();
      return {
        title: f.title.value.trim(),
        category: f.category.value,
        type: f.type.value,
        status: f.status.value,
        price: Math.round(Number(f.price.value)),
        location: loc,
        address: f.address.value.trim() || (loc ? loc + ', Accra' : ''),
        beds: num(f.beds, parseInt),
        baths: num(f.baths, parseFloat),
        sqm: num(f.sqm, parseInt),
        parking: num(f.parking, parseInt),
        image: f.image.value.trim(),
        description: f.desc.value.trim(),
        features: f.features.value.split(',').map((s) => s.trim()).filter(Boolean),
        premium: f.premium.checked
      };
    }

    f.form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();
      const data = readForm();
      const errors = {};
      if (!data.title) errors.title = 'Title is required.';
      if (!(data.price > 0)) errors.price = 'Enter a price greater than 0.';
      if (!data.location) errors.location = 'Location is required.';
      if (data.image && !validImg(data.image)) errors.image = 'Use a web link (https://…) or a file path like images/photo.jpg';

      const keys = Object.keys(errors);
      if (keys.length) {
        const map = { title: f.title, price: f.price, location: f.location, image: f.image };
        keys.forEach((k) => {
          $('[data-err="' + k + '"]', f.form).textContent = errors[k];
          map[k].classList.add('invalid');
        });
        map[keys[0]].focus();
        return;
      }

      if (editingId) { DB.updateProperty(editingId, data); toast('Listing updated'); }
      else { DB.addProperty(data); toast('Listing added'); }
      closeModal('propertyModal');
      renderAll();
    });

    /* ---------- Misc ---------- */
    $('#resetData').addEventListener('click', async () => {
      const yes = await confirmDialog('Reset demo data?', 'This restores the original sample listings and clears all inquiries and saved homes.', 'Reset');
      if (yes) { DB.reset(); renderAll(); toast('Demo data restored'); }
    });
    $('#logoutBtn').addEventListener('click', () => { Auth.logout(); location.href = 'index.html'; });

    // Stay in sync if the site is changed in another tab (e.g. a buyer sends an inquiry)
    window.addEventListener('storage', (e) => {
      if (e.key === null || e.key === CONFIG.keys.properties || e.key === CONFIG.keys.leads) renderAll();
      if (e.key === CONFIG.keys.isAdmin && !Auth.isAdmin()) location.replace('index.html');
    });

    renderAll();
  }

  /* ---------- Entry point ---------- */
  const page = document.body.dataset.page;
  if (page === 'client') initClient();
  else if (page === 'admin') initAdmin();
})();