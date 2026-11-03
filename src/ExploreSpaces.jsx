import React from "react";
import "./ExploreSpaces.css";

const spaces = [
  {
    number: "01",
    title: <>LIBRARIES &amp;<br /> STUDY ROOMS</>,
    button: "Explore Libraries",
    icon: "book",
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=90",
    alt: "Warm luxury library with tall bookshelves and reading tables",
    href: "/libraries",
  },
  {
    number: "02",
    title: <>PG, HOSTELS &amp;<br /> ROOMS</>,
    button: "Explore Stays",
    icon: "bed",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=90",
    alt: "Comfortable modern bedroom",
    href: "/stays",
  },
  {
    number: "03",
    title: <>COACHING &amp;<br /> INSTITUTES</>,
    button: "Explore Coaching",
    icon: "cap",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=90",
    alt: "Modern classroom with rows of desks",
    href: "/coaching",
  },
];

function Icon({ type }) {
  if (type === "book") {
    return <svg viewBox="0 0 64 54" aria-hidden="true"><path d="M32 14C23 5 11 5 4 8v36c10-3 20-1 28 7 8-8 18-10 28-7V8c-7-3-19-3-28 6Z"/><path d="M32 14v37M11 16c6-1 12 0 16 4M53 16c-6-1-12 0-16 4M12 26c5-1 10 0 14 2M52 26c-5-1-10 0-14 2"/></svg>;
  }
  if (type === "bed") {
    return <svg viewBox="0 0 64 54" aria-hidden="true"><path d="M6 43V14h10v14h32V14h10v29M6 34h52M14 28v-8h12a7 7 0 0 1 7 7v1M6 43v6M58 43v6"/></svg>;
  }
  return <svg viewBox="0 0 64 54" aria-hidden="true"><path d="M5 17 32 5l27 12-27 12L5 17Z"/><path d="M15 23v13c10 8 24 8 34 0V23M59 17v19M55 41h8M32 29v9M28 38h8"/></svg>;
}

export default function ExploreSpaces({ session, onLogout, isStudent = false, accountControls }) {
  let profileCity = "";
  try { profileCity = JSON.parse(localStorage.getItem("spacehunt_demo_session") || "null")?.city || ""; } catch { profileCity = ""; }
  return (
    <main className="spacehunt-explore">
      <div className="explore-bg" aria-hidden="true" />
      <div className="explore-vignette" aria-hidden="true" />

      <header className="sh-header">
        <a className="sh-brand" href="/" aria-label="SpaceHunt home">
          <span className="brand-mark"><Icon type="book" /></span>
          <span className="brand-word">SPACE<span>HUNT</span></span>
          <span className="brand-underline" />
        </a>

        <nav className={`sh-nav ${isStudent ? "sh-nav--student" : ""}`} aria-label="Main navigation">
          <a href="/"><span className="nav-symbol">⌂</span> Home</a>
          <a className="active" href="/explore"><span className="compass">✥</span> Explore Spaces</a>
          {isStudent && <a className="student-nav-link" href="/students"><span className="nav-symbol">♙</span> Students</a>}
          <a href="/list-space"><span className="nav-symbol">▣</span> List Your Space</a>
          <a href="/saved"><span className="nav-symbol heart">♡</span> Saved</a>
          {accountControls}
        </nav>
        <button className="mobile-menu" aria-label="Open menu" aria-expanded={typeof document !== 'undefined' && document.body.classList.contains('sh-menu-open')} onClick={() => document.body.classList.toggle("sh-menu-open")}>☰</button>
      </header>

      <section className="explore-content">
        <h1>DISCOVER YOUR<br /><em>NEXT SPACE.</em></h1>
        <div className="headline-swish" />
        {profileCity && <div className="sh-city-context">📍 Study city: <strong>{profileCity}</strong></div>}

        <div className="space-card-grid">
          {spaces.map((space) => (
            <article className="space-card-wrap" key={space.number}>
              <a className="space-card" href={space.href} aria-label={space.button}>
                <div className="card-face">
                  <div className="card-photo" style={{ backgroundImage: `url("${space.image}")` }} role="img" aria-label={space.alt} />
                  <div className="card-photo-shade" />
                  <div className="card-content">
                    <div className="card-heading-row">
                      <span className="category-icon"><Icon type={space.icon} /></span>
                      <h2>{space.title}</h2>
                    </div>
                    <span className="card-cta">{space.button}<b>↗</b></span>
                  </div>
                  <span className="card-glint" />
                </div>
                <span className="card-side" />
                <span className="card-bottom" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <div className="foreground-desk" aria-hidden="true">
        <div className="desk-book"><i /><i /><i /></div>
        <div className="desk-notebook"><span /><span /><span /><span /></div>
        <div className="desk-cup"><i /></div>
      </div>
    </main>
  );
}
