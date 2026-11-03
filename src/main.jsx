import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import ExploreSpaces from './ExploreSpaces';
import ListingPage from './ListingPage.jsx';
import OwnerPage from './OwnerPage.jsx';
import CategoryPage from './CategoryPage';
import LoginPage from './LoginPage.jsx';
import StudentsPage from './StudentsPage.jsx';
import { supabase, supabaseConfigured } from './lib/supabase.js';

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-7h6v7" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    cap: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    bolt: <><path d="m13 2-3 9h7l-6 11 2-9H6l7-11Z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function BrandMark() {
  return (
    <a className="brand" href="#home" aria-label="SPACEHUNT home">
      <span className="brand__icon" aria-hidden="true">
        <svg viewBox="0 0 58 54" fill="none">
          <path d="M6 13.5c8-4.2 15.2-2.8 23 2.5v31C21.4 41.2 13.4 40 6 44V13.5Z" stroke="currentColor" strokeWidth="2.7" strokeLinejoin="round" />
          <path d="M52 13.5c-8-4.2-15.2-2.8-23 2.5v31C36.6 41.2 44.6 40 52 44V13.5Z" stroke="currentColor" strokeWidth="2.7" strokeLinejoin="round" />
          <path d="M29 16V47M11 19v18c5.4-1.4 10.3-.3 15 2.4M47 19v18c-5.4-1.4-10.3-.3-15 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="m24 7 5-5 5 5-5 5-5-5Z" fill="currentColor" />
          <path d="M17 24c2.1.2 4.3 1 6 2.3M41 24c-2.1.2-4.3 1-6 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="brand__word"><span>SPACE</span><b>HUNT</b></span>
    </a>
  );
}

function AccountControls({ session, onLogout, displayNameOverride }) {
  const email = session?.user?.email || '';
  const displayName =
    displayNameOverride ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    email.split('@')[0] ||
    'Account';
  const initial = String(displayName).trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="account-controls" aria-label="User account controls">
      <span className="account-controls__avatar" aria-hidden="true">{initial}</span>
      <span className="account-controls__name" title={email}>{displayName}</span>
      <button type="button" className="account-controls__logout" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}

function App({ onNavigate, session, onLogout, isStudent = false }) {
  const [city, setCity] = useState('');
  const [otherCity, setOtherCity] = useState('');
  const [spaceType, setSpaceType] = useState('Library / Study Room');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const selectedCity = useMemo(() => city === 'Other city' ? otherCity.trim() : city, [city, otherCity]);

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 4200);
  }

  function handleSearch(event) {
    event.preventDefault();

    if (!selectedCity) {
      showNotice('Please choose or enter a city to continue.');
      return;
    }

    const destination =
      spaceType === 'Library / Study Room' ? '/libraries' : '/stays';

    const params = new URLSearchParams({
      city: selectedCity,
      type: spaceType,
    });

    onNavigate(`${destination}?${params.toString()}`);
  }

  function handleExplore() {
    onNavigate('/explore');
  }

  function handleNav(action) {
    setMenuOpen(false);
    if (action === 'explore') handleExplore();
    else if (action === 'students') onNavigate('/students');
    else if (action === 'owners') onNavigate('/list-space');
  }

  return (
    <main className="hero" id="home">
      <div className="hero__scene" aria-hidden="true" />
      <div className="hero__shade" aria-hidden="true" />
      <div className="hero__grain" aria-hidden="true" />

      <header className="site-header">
        <BrandMark />
        <nav className={`nav ${menuOpen ? 'nav--open' : ''}`} aria-label="Main navigation">
          <button className="nav__link" onClick={() => handleNav('explore')}>
            <Icon name="home" size={21} /> <span>Explore Spaces</span>
          </button>
          {isStudent && <button className="nav__link" onClick={() => handleNav('students')}>
            <Icon name="cap" size={21} /> <span>Students</span>
          </button>}
          <span className="nav__divider" />
          <button className="nav__link" onClick={() => handleNav('owners')}>
            <Icon name="briefcase" size={21} /> <span>For Owners</span>
          </button>
          <div className="mobile-account-controls">
            <AccountControls session={session} onLogout={onLogout} />
          </div>
        </nav>
        <AccountControls session={session} onLogout={onLogout} />
        <button
          className="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={25} />
        </button>
      </header>

      <section className="hero-content" aria-labelledby="hero-title">
        <h1 id="hero-title">
          <span>FIND YOUR SPACE.</span>
          <strong>OWN YOUR FUTURE.</strong>
        </h1>

        <p className="hero-copy">
          Discover the best libraries, study rooms, PGs and stay spaces<br className="desktop-break" />
          for your preparation, in any city.
        </p>

        <form className="search-panel" id="space-search" onSubmit={handleSearch}>
          <label className="search-field search-field--city">
            <Icon name="pin" size={23} />
            <span className="sr-only">Select city</span>
            <select id="city-select" value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">Select City</option>
              <option>Suratgarh</option>
              <option>Sri Ganganagar</option>
              <option>Jaipur</option>
              <option>Jodhpur</option>
              <option>Bikaner</option>
              <option>Kota</option>
              <option>Delhi</option>
              <option>Other city</option>
            </select>
          </label>
          {city === 'Other city' && (
            <label className="other-city-field">
              <span className="sr-only">Enter city name</span>
              <input value={otherCity} onChange={(event) => setOtherCity(event.target.value)} placeholder="Enter city" />
            </label>
          )}
          <span className="search-divider" />
          <label className="search-field search-field--type">
            <Icon name="layers" size={23} />
            <span className="sr-only">Choose space type</span>
            <select value={spaceType} onChange={(event) => setSpaceType(event.target.value)}>
              <option>Library / Study Room</option>
              <option>PG / Hostel</option>
              <option>Room on Rent</option>
            </select>
          </label>
          <button className="search-submit" type="submit">
            <Icon name="search" size={22} /> <span>Search Spaces</span>
          </button>
        </form>

        <div className="hero-actions">
          <button className="button button--gold" onClick={handleExplore}>
            Explore Spaces <Icon name="arrow" size={22} />
          </button>
          <button className="button button--outline" onClick={() => onNavigate('/list-space')}>
            List Your Space <Icon name="plus" size={22} />
          </button>
        </div>

      </section>

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

function Root() {
  const getPage = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';

    if (path === '/explore') return 'explore';
    if (path === '/students') return 'students';

    if (['/libraries', '/stays', '/coaching', '/list-space'].includes(path)) {
      return 'category';
    }

    return 'home';
  };

  const [page, setPage] = useState(getPage);
  // Keep the intro gate on every fresh page load while restoring Supabase auth.
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [gateVisible, setGateVisible] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadedProfileUserId, setLoadedProfileUserId] = useState(null);

  function navigate(destination) {
    window.history.pushState({}, '', destination);
    setPage(getPage());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  useEffect(() => {
    const handlePopState = () => setPage(getPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    if (!supabaseConfigured || !supabase) {
      setAuthLoading(false);
      return () => { mounted = false; };
    }

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthLoading(false);
      if (event === 'SIGNED_OUT' || (!nextSession && event !== 'INITIAL_SESSION')) {
        setGateVisible(true);
      }
    });

    authSubscription = data?.subscription;

    supabase.auth.getSession()
      .then(({ data: sessionData, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Could not restore Supabase session:', error.message);
          setSession(null);
        } else {
          setSession(sessionData.session);
        }
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('Supabase session check failed:', error);
        setSession(null);
        setAuthLoading(false);
      });

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user?.id;
    if (!userId || !supabase) {
      setUserProfile(null);
      setLoadedProfileUserId(null);
      setProfileLoading(false);
      return () => { active = false; };
    }

    setUserProfile(null);
    setLoadedProfileUserId(null);
    setProfileLoading(true);
    supabase
      .from('spacehunt_profiles')
      .select('user_id, role, study_city, username, display_name, bio')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Could not load SPACEHUNT profile:', error.message);
          setUserProfile(null);
        } else {
          setUserProfile(data || null);
        }
        setLoadedProfileUserId(userId);
        setProfileLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error('SPACEHUNT profile request failed:', error);
        setUserProfile(null);
        setLoadedProfileUserId(userId);
        setProfileLoading(false);
      });

    return () => { active = false; };
  }, [session?.user?.id]);

  function completeLogin(newSession) {
    setSession(newSession);
    setGateVisible(false);
  }

  async function handleLogout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase logout failed:', error.message);
      window.alert('Logout failed. Please try again.');
      return;
    }
    setSession(null);
    setGateVisible(true);
  }

  if (authLoading || gateVisible || !session) {
    return (
      <LoginPage
        authChecking={authLoading}
        existingSession={session}
        onSuccess={completeLogin}
      />
    );
  }

  if (page === 'explore') {
    return <ExploreSpaces session={session} onLogout={handleLogout} isStudent={loadedProfileUserId === session?.user?.id && userProfile?.role === 'Student'}  accountControls={<AccountControls session={session} onLogout={handleLogout} />} />;
  }
  if (page === 'students') {
    if (profileLoading || loadedProfileUserId !== session?.user?.id) return <main className="st-page"><div className="st-empty-state">Loading student access…</div></main>;
    if (userProfile?.role !== 'Student') {
      return <main className="st-page st-page--setup"><header className="st-header"><a className="st-brand" href="/">SPACE<span>HUNT</span></a></header><section className="st-setup-card"><span className="st-kicker">STUDENT NETWORK</span><h1>Student access only.</h1><p>The SPACEHUNT Students network is available only to accounts registered as a Student.</p><a className="st-primary-button" href="/">Return to SPACEHUNT</a></section></main>;
    }
    return <StudentsPage session={session} profile={userProfile} onProfileUpdated={setUserProfile} onLogout={handleLogout}  accountControls={<AccountControls session={session} onLogout={handleLogout} />} />;
  }
  if (window.location.pathname.replace(/\/+$/, '') === '/list-space') {
    return <OwnerPage accountControls={<AccountControls session={session} onLogout={handleLogout} />} />;
  }
  if (page === 'category') {
    return <ListingPage accountControls={<AccountControls session={session} onLogout={handleLogout} />} />;
  }
  return <App onNavigate={navigate} session={session} onLogout={handleLogout} isStudent={loadedProfileUserId === session?.user?.id && userProfile?.role === 'Student'} />;
}

createRoot(document.getElementById('root')).render(<Root />);
