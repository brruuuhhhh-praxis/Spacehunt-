import React, { useState } from "react";
import "./CategoryPage.css";

const categories = {
  "/libraries": {
    eyebrow: "STUDY SPACES",
    title: "FIND YOUR PERFECT",
    highlight: "LIBRARY.",
    description: "Discover libraries and study rooms that help you focus, prepare and achieve more.",
    icon: "📚",
    label: "Library / Study Room",
  },
  "/stays": {
    eyebrow: "YOUR STAY, YOUR COMFORT",
    title: "FIND YOUR NEXT",
    highlight: "STAY.",
    description: "Explore comfortable PGs, hostels and rooms in the city you choose.",
    icon: "🛏️",
    label: "PG / Hostel / Room on Rent",
  },
  "/coaching": {
    eyebrow: "LEARN. PREPARE. GROW.",
    title: "CHOOSE THE RIGHT",
    highlight: "INSTITUTE.",
    description: "Discover coaching institutes and learning environments for your goals.",
    icon: "🎓",
    label: "Coaching & Institutes",
  },
};

const cities = [
  "Suratgarh", "Sri Ganganagar", "Jaipur", "Jodhpur",
  "Bikaner", "Kota", "Delhi"
];

export default function CategoryPage() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/libraries";
  const data = categories[path] || categories["/libraries"];
  const params = new URLSearchParams(window.location.search);
  const [city, setCity] = useState(params.get("city") || "");
  const [notice, setNotice] = useState("");

  function handleSearch(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (city.trim()) next.set("city", city.trim());
    next.set("type", params.get("type") || data.label);
    window.history.replaceState({}, "", `${path}?${next.toString()}`);
    setNotice(city.trim()
      ? `Search location selected: ${city.trim()}`
      : "Choose a city to refine your search.");
  }

  return (
    <main className="category-page">
      <div className="category-bg" />
      <header className="category-header">
        <a className="category-brand" href="/">
          <span className="category-brand-icon">⌂</span>
          <span>SPACE<b>HUNT</b></span>
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/explore">Explore Spaces</a>
        </nav>
      </header>

      <section className="category-hero">
        <div className="category-eyebrow"><span />{data.eyebrow}<span /></div>
        <div className="category-icon-large">{data.icon}</div>
        <h1>{data.title}<br /><em>{data.highlight}</em></h1>
        <p>{data.description}</p>

        <form className="category-search" onSubmit={handleSearch}>
          <label htmlFor="category-city">YOUR CITY</label>
          <input
            id="category-city"
            list="spacehunt-city-list"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Enter or select a city"
          />
          <datalist id="spacehunt-city-list">
            {cities.map((name) => <option value={name} key={name} />)}
          </datalist>
          <button type="submit">UPDATE SEARCH <span>↗</span></button>
        </form>

        {notice && <p className="category-notice" role="status">{notice}</p>}

        <div className="category-actions">
          <a href="/explore">← BACK TO EXPLORE SPACES</a>
          <a href="/">GO TO HOME</a>
        </div>
      </section>
    </main>
  );
}
