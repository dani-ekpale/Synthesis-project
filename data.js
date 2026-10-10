/* ==========================================================================
   Ekpale Estates — data.js  (Version 1: client-side prototype)
   --------------------------------------------------------------------------
   • Seed property array (used the first time the site loads)
   • localStorage utility layer  -> Ekpale.DB
   • Mock role-based auth        -> Ekpale.Auth
   • Shared config / constants   -> Ekpale.CONFIG

   NOTE: Everything here runs in the browser. The admin passcode below is
   visible to anyone who opens DevTools, so this is a UI prototype ONLY.
   Real authentication arrives with the backend in Version 2.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- Config ---------------------------------------------------- */
  const CONFIG = {
    adminPassword: 'ekpale2026',          // demo passcode for the mock admin login
    fxRate: 11.06,                        // 1 USD = 11.06 GHS (edit as needed)
    keys: {
      properties: 'ekpale_properties',
      leads: 'ekpale_leads',
      isAdmin: 'isAdmin',
      favs: 'ekpale_favs',
      currency: 'ekpale_currency'
    },
    categories: {
      buy:      { label: 'Buy',      status: 'For Sale',   period: ''         },
      rent:     { label: 'Rent',     status: 'For Rent',   period: '/ month'  },
      shortlet: { label: 'Shortlet', status: 'Short Stay', period: '/ day'    }
    },
    types: ['Apartment', 'House', 'Villa', 'Townhouse', 'Penthouse', 'Land', 'Commercial'],
    statuses: ['For Sale', 'For Rent', 'Short Stay', 'Under Offer', 'Sold', 'Let'],
    hiddenStatuses: ['Sold', 'Let'],      // these are hidden from the public portal
    leadStatuses: ['New', 'Contacted', 'Closed']
  };

  /* ---------- Safe storage (falls back to memory if localStorage is blocked) */
  const mem = {};
  const store = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch (e) { return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); }
      catch (e) { mem[key] = String(value); }
    },
    remove(key) {
      try { localStorage.removeItem(key); }
      catch (e) { delete mem[key]; }
    }
  };

  function readJSON(key, fallback) {
    try {
      const raw = store.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) { store.set(key, JSON.stringify(value)); }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Seed data -------------------------------------------------- */
  const HOUR = 3600 * 1000;

  /* ---------- Seed images ------------------------------------------------
     Map a listing title -> image file in the /images folder.
     Edit the filenames here to match each photo, then click
     "Reset demo data" in the admin (or clear localStorage) to apply.
     Listings without an entry keep the generated illustration. */
  const SEED_IMAGES = {
    'The Palms Villa':                'images/pexels-artbovich-7511695.jpg',
    'Legato Heights Penthouse':       'images/pexels-artbovich-6077368.jpg',
    'Osu Skyline Residences':         'images/pexels-artbovich-8146214.jpg',
    'East Legon Courtyard Townhome':  'images/pexels-artbovich-8146330.jpg',
    'Trasacco Valley Executive Home': 'images/pexels-mographe-19239905.jpg',
    'Labone Garden Apartment':        'images/pexels-nadin-sh-78971847-33537442.jpg',
    'Kpeshie Two-Bed Apartment':      'images/pexels-naimbic-2030037.jpg',
    'Airport Residential Apartment':  'images/pexels-the-ghazi-2152398165-36353282.jpg',
    'Cantonments Designer Loft':      'images/pexels-artbovich-8082324.jpg'
  };

  function seedProperties() {
    const now = Date.now();
    const rows = [
      {
        title: 'The Palms Villa', category: 'buy', type: 'Villa', status: 'For Sale',
        location: 'Airport Residential Area', address: 'Airport Residential Area, Accra',
        price: 24800000, beds: 5, baths: 6, sqm: 540, parking: 5, premium: true, hoursAgo: 150,
        description: 'A gated five-bedroom villa on a landscaped plot with a private pool, staff quarters and a double-height living room that opens onto the garden. Quiet street, minutes from the airport and Marina Mall.',
        features: ['Swimming pool', 'Smart home', 'Generator', 'Boys’ quarters', '24/7 security', 'Landscaped garden']
      },
      {
        title: 'Legato Heights Penthouse', category: 'buy', type: 'Penthouse', status: 'For Sale',
        location: 'Cantonments', address: 'Cantonments Rd, Accra',
        price: 14500000, beds: 3, baths: 4, sqm: 320, parking: 3, premium: true, hoursAgo: 140,
        description: 'Full-floor penthouse with a wraparound terrace and open views across the city skyline. Floor-to-ceiling glazing, Italian kitchen and a private lift lobby.',
        features: ['Private terrace', 'Gym', 'Rooftop lounge', 'Backup power', 'Concierge', 'Private lift']
      },
      {
        title: 'Osu Skyline Residences', category: 'buy', type: 'Apartment', status: 'For Sale',
        location: 'Osu', address: 'Oxford Street, Osu, Accra',
        price: 6850000, beds: 3, baths: 3, sqm: 190, parking: 2, premium: false, hoursAgo: 96,
        description: 'Light-filled three-bedroom apartment a short walk from Oxford Street’s restaurants and cafés. Balcony, fitted wardrobes and access to a shared pool and gym.',
        features: ['Balcony', 'Shared pool', 'Gym', 'Fibre internet', 'Lift']
      },
      {
        title: 'East Legon Courtyard Townhome', category: 'buy', type: 'Townhouse', status: 'For Sale',
        location: 'East Legon', address: 'Adjiringanor, East Legon, Accra',
        price: 4200000, beds: 4, baths: 4, sqm: 260, parking: 2, premium: false, hoursAgo: 72,
        description: 'Contemporary four-bedroom townhome in a gated community with a private courtyard and rooftop terrace. Walking distance to schools and the A&C Mall.',
        features: ['Gated estate', 'Rooftop terrace', 'Courtyard', 'Fitted kitchen', 'CCTV']
      },
      {
        title: 'Trasacco Valley Executive Home', category: 'buy', type: 'House', status: 'Under Offer',
        location: 'Trasacco', address: 'Trasacco Valley, Accra',
        price: 9900000, beds: 4, baths: 5, sqm: 420, parking: 4, premium: true, hoursAgo: 60,
        description: 'Elegant four-bedroom home inside Trasacco Valley with mature gardens, a study and an entertainment lounge. Currently under offer — enquire to join the reserve list.',
        features: ['Study', 'Entertainment lounge', 'Generator', 'Water tank', 'Estate security', 'Garden']
      },
      {
        title: 'Labone Garden Apartment', category: 'buy', type: 'Apartment', status: 'For Sale',
        location: 'Labone', address: 'Labone, Accra',
        price: 1950000, beds: 2, baths: 2, sqm: 118, parking: 1, premium: false, hoursAgo: 40,
        description: 'Ground-floor two-bedroom apartment with a private garden terrace in a boutique block of only eight units. Ideal for a first home or investment.',
        features: ['Private garden', 'Boutique block', 'Covered parking', 'Fitted wardrobes']
      },
      {
        title: 'Spintex Starter Studio+', category: 'buy', type: 'Apartment', status: 'For Sale',
        location: 'Spintex', address: 'Spintex Road, Accra',
        price: 620000, beds: 1, baths: 1, sqm: 62, parking: 1, premium: false, hoursAgo: 28,
        description: 'Smart one-bedroom apartment off Spintex Road with a separate kitchen and secure parking. Flexible payment plan available.',
        features: ['Payment plan', 'Secure parking', 'Water tank', 'Gated']
      },
      {
        title: 'Community 25 Residential Plot', category: 'buy', type: 'Land', status: 'For Sale',
        location: 'Tema', address: 'Community 25, Tema',
        price: 480000, beds: 0, baths: 0, sqm: 600, parking: 0, premium: false, hoursAgo: 24,
        description: 'Fully documented 600 m² residential plot in a fast-growing neighbourhood. Flat terrain, road access and utilities nearby. Site visits by appointment.',
        features: ['Registered title', 'Road access', 'Flat terrain', 'Utilities nearby']
      },
      {
        title: 'Kpeshie Two-Bed Apartment', category: 'rent', type: 'Apartment', status: 'For Rent',
        location: 'Kpeshie', address: 'Tse Addo, Accra',
        price: 12000, beds: 2, baths: 2, sqm: 105, parking: 2, premium: false, hoursAgo: 12,
        description: 'Neat two-bedroom apartment close to the beach road with reliable water supply and ample parking. One-year lease preferred.',
        features: ['Air conditioning', 'Parking', 'Water tank', 'Security']
      },
      {
        title: 'East Legon Family House', category: 'rent', type: 'House', status: 'For Rent',
        location: 'East Legon', address: 'East Legon Hills, Accra',
        price: 38000, beds: 4, baths: 4, sqm: 310, parking: 3, premium: true, hoursAgo: 8,
        description: 'Spacious four-bedroom family home with a large lawn, BQ and fully fitted kitchen. Close to international schools.',
        features: ['Large lawn', 'Boys’ quarters', 'Fitted kitchen', 'Generator', 'CCTV']
      },
      {
        title: 'Airport Residential Apartment', category: 'rent', type: 'Apartment', status: 'For Rent',
        location: 'Airport Residential Area', address: 'Airport Residential Area, Accra',
        price: 33000, beds: 3, baths: 3, sqm: 175, parking: 2, premium: false, hoursAgo: 5,
        description: 'Furnished-ready three-bedroom apartment in a secure block with 24/7 power, pool and gym. Perfect for expatriate or corporate tenants.',
        features: ['24/7 power', 'Pool', 'Gym', 'Lift', 'Concierge']
      },
      {
        title: 'Ridge Executive Offices', category: 'rent', type: 'Commercial', status: 'For Rent',
        location: 'Ridge', address: 'Ridge, Accra',
        price: 55000, beds: 0, baths: 3, sqm: 240, parking: 6, premium: false, hoursAgo: 3,
        description: 'Open-plan office suite on the third floor of a modern building with reception area, meeting rooms and dedicated parking bays.',
        features: ['Open plan', 'Meeting rooms', 'Fibre internet', 'Backup power', 'Parking bays']
      },
      {
        title: 'Dome Cosy One-Bed Stay', category: 'shortlet', type: 'Apartment', status: 'Short Stay',
        location: 'Dome', address: 'Kwabenya Rd, Dome, Accra',
        price: 450, beds: 1, baths: 1, sqm: 55, parking: 1, premium: false, hoursAgo: 2,
        description: 'Fully furnished one-bedroom apartment with fast Wi-Fi, a workspace and self check-in. Great for business trips and weekend getaways.',
        features: ['Wi-Fi', 'Self check-in', 'Air conditioning', 'Smart TV', 'Workspace']
      },
      {
        title: 'Cantonments Designer Loft', category: 'shortlet', type: 'Apartment', status: 'Short Stay',
        location: 'Cantonments', address: 'Cantonments, Accra',
        price: 1200, beds: 2, baths: 2, sqm: 120, parking: 2, premium: true, hoursAgo: 1,
        description: 'Designer two-bedroom loft with a rooftop pool, daily housekeeping and a stocked kitchen. Close to embassies and top restaurants.',
        features: ['Rooftop pool', 'Housekeeping', 'Stocked kitchen', 'Wi-Fi', 'Airport pickup']
      },
      {
        title: 'Osu Studio Nights', category: 'shortlet', type: 'Apartment', status: 'Short Stay',
        location: 'Osu', address: 'Osu, Accra',
        price: 380, beds: 1, baths: 1, sqm: 38, parking: 0, premium: false, hoursAgo: 20,
        description: 'Compact, stylish studio in the heart of Osu — steps from nightlife, cafés and the Labadi Road.',
        features: ['Wi-Fi', 'Air conditioning', 'Kitchenette', 'Self check-in']
      },
      {
        title: 'Borteyman Modern Townhouse', category: 'buy', type: 'Townhouse', status: 'For Sale',
        location: 'Borteyman', address: 'Borteyman, Accra',
        price: 2750000, beds: 3, baths: 3, sqm: 185, parking: 2, premium: false, hoursAgo: 220,
        description: 'Newly built three-bedroom townhouse in a gated development with a shared playground and 24-hour security.',
        features: ['Gated estate', 'Playground', 'Fitted kitchen', 'CCTV']
      }
    ];

    return rows.map(function (r, i) {
      const hoursAgo = r.hoursAgo;
      const copy = Object.assign({}, r);
      delete copy.hoursAgo;
      return Object.assign({ id: 'p_seed_' + (i + 1), image: SEED_IMAGES[r.title] || '' }, copy, { createdAt: now - hoursAgo * HOUR });
    });
  }

  /* ---------- DB: properties + leads ------------------------------------ */
  const DB = {
    /* Properties --------------------------------------------------------- */
    getProperties() {
      let list = readJSON(CONFIG.keys.properties, null);
      if (!Array.isArray(list)) {            // first visit (or corrupted data) -> seed
        list = seedProperties();
        writeJSON(CONFIG.keys.properties, list);
      }
      return list;
    },
    saveProperties(list) { writeJSON(CONFIG.keys.properties, list); },
    getProperty(id) { return DB.getProperties().find(function (p) { return p.id === id; }) || null; },
    addProperty(data) {
      const list = DB.getProperties();
      const prop = Object.assign({}, data, { id: uid('p'), createdAt: Date.now() });
      list.unshift(prop);
      DB.saveProperties(list);
      return prop;
    },
    updateProperty(id, patch) {
      const list = DB.getProperties();
      const i = list.findIndex(function (p) { return p.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch, { id: list[i].id, createdAt: list[i].createdAt });
      DB.saveProperties(list);
      return list[i];
    },
    deleteProperty(id) {
      const list = DB.getProperties();
      const next = list.filter(function (p) { return p.id !== id; });
      DB.saveProperties(next);
      return next.length !== list.length;
    },
    isPublic(p) { return CONFIG.hiddenStatuses.indexOf(p.status) === -1; },

    /* Leads (buyer inquiries) -------------------------------------------- */
    getLeads() {
      const list = readJSON(CONFIG.keys.leads, []);
      return Array.isArray(list) ? list : [];
    },
    saveLeads(list) { writeJSON(CONFIG.keys.leads, list); },
    addLead(data) {
      const list = DB.getLeads();
      const lead = Object.assign({}, data, { id: uid('l'), status: 'New', createdAt: Date.now() });
      list.unshift(lead);
      DB.saveLeads(list);
      return lead;
    },
    updateLead(id, patch) {
      const list = DB.getLeads();
      const i = list.findIndex(function (l) { return l.id === id; });
      if (i === -1) return null;
      list[i] = Object.assign({}, list[i], patch);
      DB.saveLeads(list);
      return list[i];
    },
    deleteLead(id) {
      DB.saveLeads(DB.getLeads().filter(function (l) { return l.id !== id; }));
    },

    /* Reset everything back to the seed data ------------------------------ */
    reset() {
      writeJSON(CONFIG.keys.properties, seedProperties());
      writeJSON(CONFIG.keys.leads, []);
      writeJSON(CONFIG.keys.favs, []);
    }
  };

  /* ---------- Favourites (saved homes) ---------------------------------- */
  const Favs = {
    get() { const f = readJSON(CONFIG.keys.favs, []); return Array.isArray(f) ? f : []; },
    has(id) { return Favs.get().indexOf(id) !== -1; },
    toggle(id) {
      const f = Favs.get();
      const i = f.indexOf(id);
      if (i === -1) f.push(id); else f.splice(i, 1);
      writeJSON(CONFIG.keys.favs, f);
      return i === -1;                       // true when now saved
    }
  };

  /* ---------- Mock auth -------------------------------------------------- */
  const Auth = {
    isAdmin() { return store.get(CONFIG.keys.isAdmin) === 'true'; },
    login(passcode) {
      if (passcode === CONFIG.adminPassword) {
        store.set(CONFIG.keys.isAdmin, 'true');   // localStorage.setItem('isAdmin','true')
        return true;
      }
      return false;
    },
    logout() { store.remove(CONFIG.keys.isAdmin); }
  };

  global.Ekpale = { CONFIG: CONFIG, DB: DB, Favs: Favs, Auth: Auth, store: store };
})(window);