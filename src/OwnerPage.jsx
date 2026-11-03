import { supabase, supabaseConfigured } from './lib/supabase';
import React, { useMemo, useState } from 'react';
import './OwnerPage.css';
import './OwnerPage.update.css';

const categories = [
  {
    id: 'library',
    title: 'Library / Study Room',
    short: 'Library',
    description: 'Libraries and study rooms',
    image: '/spacehunt-owner-library.webp',
    icon: 'book',
  },
  {
    id: 'stay',
    title: 'PG / Hostel / Rooms',
    short: 'PG / Room',
    description: 'PGs, hostels and rental rooms',
    image: '/spacehunt-owner-stay.webp',
    icon: 'bed',
  },
  {
    id: 'coaching',
    title: 'Coaching Institute',
    short: 'Coaching',
    description: 'Coaching institutes',
    image: '/spacehunt-owner-coaching.webp',
    icon: 'cap',
  },
];

const facilityOptions = {
  library: ['AC', 'Wi-Fi', 'CCTV', 'Power backup', 'Locker', 'RO water', 'Newspapers', 'Separate washroom'],
  stay: ['Wi-Fi', 'Meals available', 'AC', 'Attached bathroom', 'Washing machine', 'Power backup', 'RO water', 'Parking', 'Housekeeping'],
  coaching: ['AC classrooms', 'Smart board', 'Library', 'Doubt sessions', 'Test series', 'Study material', 'CCTV', 'Online classes'],
};

const emptyForms = {
  library: { ownerName: '', businessName: '', phone: '', email: '', city: '', area: '', address: '', mapsLink: '', price: '', seatsTotal: '', seatsAvailable: '', openingTime: '', closingTime: '', audience: 'All students', facilities: [], details: '' },
  stay: { ownerName: '', businessName: '', phone: '', email: '', city: '', area: '', address: '', mapsLink: '', stayType: 'PG', price: '', roomsAvailable: '', bedsAvailable: '', audience: 'Boys', food: 'Not included', deposit: '', facilities: [], details: '' },
  coaching: { ownerName: '', businessName: '', phone: '', email: '', city: '', area: '', address: '', mapsLink: '', subjects: '', exams: '', batchTiming: '', classMode: 'Offline', batchSize: '', facilities: [], details: '' },
};

function Icon({ name, size = 24 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'book') return <svg {...common}><path d="M3 5.5c3.4-1.8 6.4-1 9 1.2v14c-2.6-2.2-5.6-3-9-1.2z"/><path d="M21 5.5c-3.4-1.8-6.4-1-9 1.2v14c2.6-2.2 5.6-3 9-1.2z"/><path d="M6 9h3M6 12h3M15 9h3M15 12h3"/></svg>;
  if (name === 'bed') return <svg {...common}><path d="M3 19V6M3 14h18v5M3 10h5a4 4 0 0 1 4 4M12 14V9a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v5"/><path d="M7 8h1"/></svg>;
  if (name === 'cap') return <svg {...common}><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6"/><path d="M22 15c-1 1-1 2-1 3"/></svg>;
  if (name === 'users') return <svg {...common}><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M17 11a3.5 3.5 0 1 0 0-7M17 14.5h1a4 4 0 0 1 4 4V20"/></svg>;
  if (name === 'chart') return <svg {...common}><path d="M3 20h18M5 16l5-5 4 3 6-8"/><path d="M15 6h5v5"/></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  return null;
}

function BrandMark() {
  return <a className="sp-owner-brand" href="/" aria-label="SPACEHUNT Home">
    <span className="sp-owner-brand-icon"><Icon name="book" size={42} /></span>
    <span className="sp-owner-brand-type">SPACE<span>HUNT</span><small>Study · Stay · Learn</small></span>
  </a>;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, min, max, step, help, autoComplete, inputMode, pattern }) {
  return <label className="sp-owner-form-field">
    <span>{label}{required ? ' *' : ' (Optional)'}</span>
    <input type={type} required={required} min={min} max={max} step={step} value={value ?? ''} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} pattern={pattern} />
    {help && <small className="sp-owner-field-help">{help}</small>}
  </label>;
}

function SelectField({ label, value, onChange, options, required = false, help }) {
  return <label className="sp-owner-form-field">
    <span>{label}{required ? ' *' : ' (Optional)'}</span>
    <select required={required} value={value} onChange={onChange}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    {help && <small className="sp-owner-field-help">{help}</small>}
  </label>;
}

function TextAreaField({ label, value, onChange, placeholder, rows = 4 }) {
  return <label className="sp-owner-form-field sp-owner-wide">
    <span>{label} (Optional)</span>
    <textarea rows={rows} value={value ?? ''} onChange={onChange} placeholder={placeholder} />
  </label>;
}

function FacilityPicker({ category, value, onToggle }) {
  return <fieldset className="sp-owner-options sp-owner-wide">
    <legend>FACILITIES / FEATURES (Select all that apply)</legend>
    <div className="sp-owner-option-grid">
      {facilityOptions[category].map((item) => <label className="sp-owner-option" key={item}>
        <input type="checkbox" checked={value.includes(item)} onChange={() => onToggle(item)} />
        <span>{item}</span>
      </label>)}
    </div>
  </fieldset>;
}

function isGoogleMapsLink(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isShortMapsLink = host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'));
    const isGoogleMapsPage = host === 'maps.google.com' || ((host === 'google.com' || host.endsWith('.google.com')) && url.pathname.includes('/maps'));
    return url.protocol === 'https:' && (isShortMapsLink || isGoogleMapsPage);
  } catch {
    return false;
  }
}

export default function OwnerPage({ accountControls }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [photoNames, setPhotoNames] = useState([]);
  const [forms, setForms] = useState(() => JSON.parse(JSON.stringify(emptyForms)));
  const selected = useMemo(() => categories.find((item) => item.id === activeCategory) || null, [activeCategory]);
  const form = activeCategory ? forms[activeCategory] : null;

  const update = (key, value) => setForms((previous) => ({
    ...previous,
    [activeCategory]: { ...previous[activeCategory], [key]: value },
  }));

  const toggleFacility = (item) => {
    const current = form.facilities || [];
    update('facilities', current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]);
  };

  const chooseCategory = (id) => {
    setActiveCategory(id);
    setSaved(false);
    setError('');
    setPhotoNames([]);
    window.setTimeout(() => document.getElementById('sp-owner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const startListing = () => {
    if (!activeCategory) {
      setActiveCategory('library');
      setSaved(false);
      window.setTimeout(() => document.getElementById('sp-owner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      document.getElementById('sp-owner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  async function submitListing(event) {
    event.preventDefault();
    setError('');
    setSaved(false);

    if (!isGoogleMapsLink(form.mapsLink)) {
      setError('कृपया Google Maps का सही HTTPS share link डालें। Google Maps में Share → Copy link चुनें।');
      document.getElementById('sp-owner-map-link')?.focus();
      return;
    }

    const numericPrice = Number(form.price);

    if (activeCategory === 'library' && (numericPrice < 500 || numericPrice > 2000)) {
      setError('Library की मासिक प्रति-सीट फीस ₹500 से ₹2,000 के बीच रखें।');
      return;
    }

    if (activeCategory === 'stay' && numericPrice < 1500) {
      setError('PG / Room का मासिक किराया कम से कम ₹1,500 होना चाहिए।');
      return;
    }

    if (!supabaseConfigured || !supabase) {
      setError('Supabase configure नहीं है। अपनी .env.local settings जाँचें।');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setError('Listing देने से पहले कृपया अपने account में login करें।');
        return;
      }

      const user = authData.user;
      const publicData = { ...form };

      delete publicData.ownerName;
      delete publicData.phone;
      delete publicData.email;
      delete publicData.address;

      const { data: listing, error: listingError } = await supabase
        .from('space_listings')
        .insert({
          owner_id: user.id,
          category: activeCategory,
          title: String(form.businessName || '').trim(),
          city: String(form.city || '').trim(),
          area: String(form.area || '').trim(),
          price: numericPrice,
          public_data: publicData,
          status: 'pending',
        })
        .select('id')
        .single();

      if (listingError) throw listingError;

      const { error: privateError } = await supabase
        .from('space_listing_private')
        .insert({
          listing_id: listing.id,
          owner_id: user.id,
          owner_name: String(form.ownerName || '').trim(),
          phone: String(form.phone || '').trim(),
          email: String(form.email || '').trim() || null,
          full_address: String(form.address || '').trim(),
        });

      if (privateError) {
        // Avoid leaving a listing behind if its private contact record failed.
        await supabase
          .from('space_listings')
          .delete()
          .eq('id', listing.id)
          .eq('owner_id', user.id);

        throw privateError;
      }

      setSaved(true);
    } catch (error) {
      console.error('SpaceHunt listing submission failed:', error);
      setError(
        error?.message
          ? `Listing save नहीं हुई: ${error.message}`
          : 'Listing save नहीं हुई। Internet और Supabase settings जाँचें।'
      );
    }
  }

  const mapField = <div className="sp-owner-map-block sp-owner-wide">
    <label className="sp-owner-form-field" htmlFor="sp-owner-map-link">
      <span>GOOGLE MAPS LOCATION LINK *</span>
      <input id="sp-owner-map-link" type="url" required value={form?.mapsLink || ''} onChange={(event) => update('mapsLink', event.target.value.trim())} placeholder="https://maps.app.goo.gl/..." />
      <small className="sp-owner-field-help">Google Maps में Share → Copy link चुनें और यहाँ paste करें।</small>
    </label>
    <a className="sp-owner-map-open" href="https://www.google.com/maps" target="_blank" rel="noreferrer">⌖ Open Google Maps in a new tab</a>
  </div>;

  return <main className="sp-owner-page">
    <header className="sp-owner-header">
      <BrandMark />
      <button className="sp-owner-menu-btn" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span></span><span></span><span></span></button>
      <nav className={menuOpen ? 'sp-owner-nav is-open' : 'sp-owner-nav'}>
        <a href="/" onClick={() => setMenuOpen(false)}>⌂ <span>Home</span></a>
        <a href="/explore" onClick={() => setMenuOpen(false)}>▦ <span>Explore Spaces</span></a>
        <a className="sp-owner-nav-cta" href="#sp-owner-categories" onClick={() => setMenuOpen(false)}><b>＋</b> List Your Space</a>
        {accountControls}
      </nav>
    </header>

    <section className="sp-owner-hero">
      <div className="sp-owner-hero-visual" aria-hidden="true"></div>
      <div className="sp-owner-hero-inner">
        <div className="sp-owner-eyebrow"><span className="sp-owner-store-icon">♜</span> FOR SPACE OWNERS</div>
        <h1>List Your Space on <em>SPACEHUNT</em></h1>
        <p className="sp-owner-hero-copy">Reach students looking for trusted libraries, comfortable stays and quality coaching in their city.</p>
        <a className="sp-owner-primary" href="#sp-owner-categories"><span>＋</span> Choose Your Category <b>→</b></a>
      </div>
    </section>

    <section className="sp-owner-categories" id="sp-owner-categories">
      <div className="sp-owner-section-title"><span></span><h2>What Can You List?</h2><span></span></div>
      <div className="sp-owner-category-grid">
        {categories.map((category) => <button type="button" key={category.id} className={`sp-owner-category-card ${activeCategory === category.id ? 'is-selected' : ''}`} onClick={() => chooseCategory(category.id)} style={{ '--card-image': `url("${category.image}")` }}>
          <span className="sp-owner-card-icon"><Icon name={category.icon} size={34}/></span>
          <span className="sp-owner-card-copy"><strong>{category.title}</strong><small>{category.description}</small></span>
          <span className="sp-owner-card-arrow">→</span>
        </button>)}
      </div>
    </section>

    {selected && <section className="sp-owner-form-section" id="sp-owner-form">
      <div className="sp-owner-form-intro">
        <h2>Listing details</h2>
        <p>Complete the {selected.short} details. Fields marked * are required. Listings appear after approval.</p>
      </div>

      <div className="sp-owner-form-card">
        {saved ? <div className="sp-owner-success" role="status">
          <span>✓</span><h3>Listing submitted</h3>
          <p>Your {selected.short} listing has been sent for review. It will appear to students after approval.</p>
          <button type="button" onClick={() => setSaved(false)}>EDIT DETAILS</button>
        </div> : <>
          <div className="sp-owner-form-heading"><div><h3>{selected.title}</h3></div></div>
          <div className="sp-owner-type-tabs" aria-label="Choose listing type">
            {categories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => { setActiveCategory(category.id); setSaved(false); setError(''); setPhotoNames([]); }}>{category.short}</button>)}
          </div>

          <form onSubmit={submitListing}>
            <div className="sp-owner-fields">
              <Field label="OWNER / CONTACT NAME" required value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} placeholder="Your full name" autoComplete="name" />
              <Field label={activeCategory === 'library' ? 'LIBRARY NAME' : activeCategory === 'stay' ? 'PROPERTY / PG NAME' : 'COACHING INSTITUTE NAME'} required value={form.businessName} onChange={(event) => update('businessName', event.target.value)} placeholder="Name shown to students" />
              <Field label="MOBILE / WHATSAPP NUMBER" required type="tel" inputMode="tel" pattern="[0-9+() -]{10,18}" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" help="Use a number on which students or our review team can contact you." />
              <Field label="EMAIL ADDRESS" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@example.com" autoComplete="email" />
              <Field label="CITY" required value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Your city" autoComplete="address-level2" />
              <Field label="AREA / LOCALITY" required value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="Area, colony or nearby landmark" />
              <Field label="FULL STREET ADDRESS" required value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Building, street and nearby landmark" autoComplete="street-address" />
              {mapField}

              {activeCategory === 'library' && <>
                <Field label="MONTHLY FEE PER SEAT (₹)" required type="number" min="500" max="2000" step="50" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="500 to 2000" help="Allowed range: ₹500–₹2,000 per seat per month." />
                <Field label="TOTAL SEATS" required type="number" min="1" step="1" value={form.seatsTotal} onChange={(event) => update('seatsTotal', event.target.value)} placeholder="e.g. 60" />
                <Field label="SEATS CURRENTLY AVAILABLE" required type="number" min="0" step="1" value={form.seatsAvailable} onChange={(event) => update('seatsAvailable', event.target.value)} placeholder="e.g. 12" />
                <SelectField label="WHO CAN JOIN?" value={form.audience} onChange={(event) => update('audience', event.target.value)} options={['All students', 'Boys only', 'Girls only']} required />
                <Field label="OPENING TIME" value={form.openingTime} onChange={(event) => update('openingTime', event.target.value)} type="time" />
                <Field label="CLOSING TIME" value={form.closingTime} onChange={(event) => update('closingTime', event.target.value)} type="time" />
                <FacilityPicker category="library" value={form.facilities} onToggle={toggleFacility} />
                <TextAreaField label="STUDY RULES / EXTRA DETAILS" value={form.details} onChange={(event) => update('details', event.target.value)} placeholder="Study hours, silence rules, AC timings, discounts or other useful details..." />
              </>}

              {activeCategory === 'stay' && <>
                <SelectField label="PROPERTY TYPE" value={form.stayType} onChange={(event) => update('stayType', event.target.value)} options={['PG', 'Hostel', 'Single room', 'Shared room', 'Flat / Apartment']} required />
                <Field label="MONTHLY RENT (₹)" required type="number" min="1500" step="100" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="Minimum 1500" help="Starting rent ₹1,500 per month. Enter the actual rent; no upper cap." />
                <Field label="ROOMS AVAILABLE" required type="number" min="1" step="1" value={form.roomsAvailable} onChange={(event) => update('roomsAvailable', event.target.value)} placeholder="e.g. 4" />
                <Field label="BEDS AVAILABLE" type="number" min="1" step="1" value={form.bedsAvailable} onChange={(event) => update('bedsAvailable', event.target.value)} placeholder="e.g. 8" />
                <SelectField label="SUITABLE FOR" value={form.audience} onChange={(event) => update('audience', event.target.value)} options={['Boys', 'Girls', 'Families', 'All']} required />
                <SelectField label="FOOD / MEALS" value={form.food} onChange={(event) => update('food', event.target.value)} options={['Not included', 'Included in rent', 'Available at extra cost']} />
                <Field label="SECURITY DEPOSIT (₹)" type="number" min="0" step="100" value={form.deposit} onChange={(event) => update('deposit', event.target.value)} placeholder="If applicable" />
                <FacilityPicker category="stay" value={form.facilities} onToggle={toggleFacility} />
                <TextAreaField label="HOUSE RULES / EXTRA DETAILS" value={form.details} onChange={(event) => update('details', event.target.value)} placeholder="Notice period, visitor rules, electricity charges, meal timings, etc." />
              </>}

              {activeCategory === 'coaching' && <>
                <Field label="SUBJECTS / COURSES TAUGHT" required value={form.subjects} onChange={(event) => update('subjects', event.target.value)} placeholder="e.g. General Studies, Mathematics, English" />
                <Field label="EXAMS / TARGET STUDENTS" value={form.exams} onChange={(event) => update('exams', event.target.value)} placeholder="e.g. UPSC, SSC, RPSC, REET" />
                <Field label="BATCH TIMINGS" required value={form.batchTiming} onChange={(event) => update('batchTiming', event.target.value)} placeholder="e.g. Morning 7–9, Evening 5–7" />
                <SelectField label="CLASS MODE" value={form.classMode} onChange={(event) => update('classMode', event.target.value)} options={['Offline', 'Online', 'Hybrid']} required />
                <Field label="APPROX. STUDENTS PER BATCH" type="number" min="1" step="1" value={form.batchSize} onChange={(event) => update('batchSize', event.target.value)} placeholder="e.g. 30" />
                <FacilityPicker category="coaching" value={form.facilities} onToggle={toggleFacility} />
                <TextAreaField label="COURSE DETAILS / EXTRA INFORMATION" value={form.details} onChange={(event) => update('details', event.target.value)} placeholder="Mention teaching approach, demo class, faculty experience or other useful information..." />
              </>}

              <label className="sp-owner-form-field sp-owner-wide sp-owner-upload">
                <span>SPACE PHOTOS (Optional)</span>
                <input key={activeCategory} type="file" accept="image/*" multiple onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  const tooLarge = files.find((file) => file.size > 5 * 1024 * 1024);
                  if (files.length > 6 || tooLarge) {
                    setError('अधिकतम 6 फोटो चुनें। हर फोटो 5 MB या उससे कम होनी चाहिए।');
                    event.target.value = '';
                    setPhotoNames([]);
                    return;
                  }
                  setError('');
                  setPhotoNames(files.map((file) => file.name));
                }} />
                <small className="sp-owner-field-help">Up to 6 photos, max 5 MB each. Photo upload is not enabled yet.</small>
                {photoNames.length > 0 && <small className="sp-owner-photo-list">Selected: {photoNames.join(', ')}</small>}
              </label>
            </div>

            {error && <p className="sp-owner-form-error" role="alert">{error}</p>}
            <label className="sp-owner-consent"><input type="checkbox" required/> I confirm that these details are correct and I am authorized to submit this listing.</label>
            <button className="sp-owner-submit" type="submit">SUBMIT FOR REVIEW <span>→</span></button>
          </form>
        </>}
      </div>
    </section>}

    <footer className="sp-owner-footer"><BrandMark/><div><a href="/">HOME</a><a href="/explore">EXPLORE SPACES</a><a href="#sp-owner-categories">LIST YOUR SPACE</a></div></footer>
  </main>;
}
