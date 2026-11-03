import React, { useEffect, useMemo, useState } from "react";
import "./ListingPage.css";
import { supabase, supabaseConfigured } from "./lib/supabase";

const sampleListings = [
  { id: 1, category: "libraries", name: "Royal Study Library", city: "Jaipur", area: "Vaishali Nagar", price: 1200, unit: "/ month", rating: "4.8", seats: 15, features: ["AC", "Wi-Fi", "24 Hours"], image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85", description: "A quiet, focused study environment with comfortable seating." },
  { id: 2, category: "libraries", name: "The Focus Library", city: "Jaipur", area: "Mansarovar", price: 900, unit: "/ month", rating: "4.6", seats: 8, features: ["Wi-Fi", "Locker"], image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1000&q=85", description: "A calm reading space for daily preparation and revision." },
  { id: 3, category: "libraries", name: "Scholars Reading Hall", city: "Kota", area: "Talwandi", price: 1500, unit: "/ month", rating: "4.7", seats: 12, features: ["AC", "Wi-Fi", "Locker"], image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1000&q=85", description: "Dedicated desks and a peaceful environment for students." },
  { id: 4, category: "stays", name: "Amber Comfort PG", city: "Jaipur", area: "Gopalpura", price: 7500, unit: "/ month", rating: "4.7", seats: null, features: ["Wi-Fi", "Meals", "Furnished"], image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85", description: "Furnished room with practical amenities for students." },
  { id: 5, category: "stays", name: "City Nest Rooms", city: "Kota", area: "Landmark City", price: 6500, unit: "/ month", rating: "4.5", seats: null, features: ["Furnished", "Wi-Fi"], image: "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1000&q=85", description: "Comfortable rooms close to student facilities." },
  { id: 6, category: "stays", name: "The Study Stay Hostel", city: "Delhi", area: "Mukherjee Nagar", price: 8500, unit: "/ month", rating: "4.6", seats: null, features: ["Meals", "Wi-Fi", "AC"], image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=85", description: "Student-friendly stay with essential everyday facilities." },
  { id: 7, category: "coaching", name: "Apex Learning Institute", city: "Jaipur", area: "Tonk Road", price: 18000, unit: "/ course", rating: "4.7", seats: null, features: ["Test Series", "Library", "Doubt Sessions"], image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=85", description: "Structured classes and practice support for exam preparation." },
  { id: 8, category: "coaching", name: "North Star Academy", city: "Delhi", area: "Mukherjee Nagar", price: 22000, unit: "/ course", rating: "4.8", seats: null, features: ["Test Series", "Doubt Sessions"], image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=85", description: "A focused learning environment with classroom-based preparation." },
  { id: 9, category: "coaching", name: "Pathway Study Centre", city: "Kota", area: "Indra Vihar", price: 16000, unit: "/ course", rating: "4.5", seats: null, features: ["Library", "Test Series"], image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1000&q=85", description: "Exam preparation with classroom learning and practice." }
];

const config = {
  libraries: { kicker: "STUDY SPACES", icon: "📚", title: <>FIND YOUR PERFECT <em>LIBRARY.</em></>, intro: "Discover libraries and study rooms that help you focus, prepare and achieve more.", singular: "library / study room" },
  stays: { kicker: "YOUR STAY, YOUR COMFORT", icon: "🛏️", title: <>FIND YOUR NEXT <em>STAY.</em></>, intro: "Explore comfortable PGs, hostels and rooms in the city you choose.", singular: "PG / hostel / room" },
  coaching: { kicker: "LEARN. PREPARE. GROW.", icon: "🎓", title: <>CHOOSE THE RIGHT <em>INSTITUTE.</em></>, intro: "Discover coaching institutes and learning environments for your goals.", singular: "coaching institute" }
};

function categoryFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/stays") return "stays";
  if (path === "/coaching") return "coaching";
  return "libraries";
}

export default function ListingPage({ category: categoryProp }) {
  const category = categoryProp || categoryFromPath();
  const meta = config[category] || config.libraries;
  const [city, setCity] = useState(() => {
    const requestedCity = new URLSearchParams(window.location.search).get("city");
    if (requestedCity) return requestedCity;
    try {
      const session = JSON.parse(localStorage.getItem("spacehunt_demo_session") || "null");
      return session?.city || "";
    } catch { return ""; }
  });
  const [budget, setBudget] = useState("any");
  const [feature, setFeature] = useState("any");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, title: "", text: "" });
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewVersion, setReviewVersion] = useState(0);
  const [liveListings, setLiveListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [databaseError, setDatabaseError] = useState("");
  const [reviewsByListing, setReviewsByListing] = useState({});
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // SPACEHUNT_DB_INTEGRATION_V1
  useEffect(() => {
    let cancelled = false;

    async function loadListingsAndReviews() {
      if (!supabaseConfigured || !supabase) {
        setDatabaseError("Supabase configured नहीं है। अभी demo listings दिखाई जा रही हैं।");
        setLoadingListings(false);
        return;
      }

      const { data, error } = await supabase
        .from("space_listings")
        .select("id, category, title, city, area, price, public_data, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Loading approved listings failed:", error);
        setDatabaseError("Live listings load नहीं हो सकीं। Database settings जाँचें।");
        setLoadingListings(false);
        return;
      }

      const mapped = (data || []).map((row) => {
        const d = row.public_data || {};
        const categoryMap = { library: "libraries", stay: "stays", coaching: "coaching" };
        const categoryName = categoryMap[row.category] || "libraries";
        const facilities = Array.isArray(d.facilities) ? d.facilities : [];
        const seats = Number(d.seatsAvailable ?? d.seatsTotal ?? 0) || null;
        const fallbackImages = {
          libraries: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85",
          stays: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
          coaching: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=85"
        };
        return {
          id: row.id,
          category: categoryName,
          dbCategory: row.category,
          name: row.title,
          city: row.city,
          area: row.area,
          price: Number(row.price) || 0,
          unit: row.category === "coaching" ? "/ course" : "/ month",
          rating: "New",
          seats: row.category === "library" ? seats : null,
          features: facilities,
          image: fallbackImages[categoryName],
          description: String(d.details || d.subjects || d.stayType || "Owner-submitted space."),
          mapsLink: d.mapsLink || ""
        };
      });

      setLiveListings(mapped);

      const ids = mapped.map((x) => x.id);
      if (ids.length) {
        const { data: reviews, error: reviewError } = await supabase
          .from("space_reviews")
          .select("id, listing_id, user_id, rating, title, body, created_at")
          .eq("status", "approved")
          .in("listing_id", ids)
          .order("created_at", { ascending: false });

        if (!cancelled && !reviewError) {
          const grouped = {};
          (reviews || []).forEach((r) => {
            if (!grouped[r.listing_id]) grouped[r.listing_id] = [];
            grouped[r.listing_id].push({
              id: r.id,
              rating: r.rating,
              title: r.title,
              text: r.body,
              date: new Date(r.created_at).toLocaleDateString("en-IN")
            });
          });
          setReviewsByListing(grouped);
        }
      }

      if (!cancelled) setLoadingListings(false);
    }

    loadListingsAndReviews();
    return () => { cancelled = true; };
  }, []);

  const readReviews = (listingId) => reviewsByListing[listingId] || [];

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewListing || !reviewDraft.text.trim()) return;

    if (!supabaseConfigured || !supabase || !liveListings.some((x) => x.id === reviewListing.id)) {
      setReviewNotice("Online review के लिए approved live listing और Supabase connection ज़रूरी है।");
      return;
    }

    if (reviewDraft.text.trim().length < 5) {
      setReviewNotice("Review कम से कम 5 characters का लिखें।");
      return;
    }

    setReviewSubmitting(true);
    setReviewNotice("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setReviewNotice("Review लिखने के लिए पहले login करें।");
        return;
      }

      const { error } = await supabase.from("space_reviews").insert({
        listing_id: reviewListing.id,
        user_id: authData.user.id,
        rating: Number(reviewDraft.rating),
        title: reviewDraft.title.trim(),
        body: reviewDraft.text.trim(),
        status: "pending"
      });

      if (error) throw error;

      setReviewDraft({ rating: 5, title: "", text: "" });
      setReviewNotice("Review submit हो गई है और approval के बाद public दिखाई देगी।");
    } catch (error) {
      console.error("Review submission failed:", error);
      setReviewNotice(
        error?.code === "23505"
          ? "आप इस listing पर पहले ही review submit कर चुके हैं।"
          : `Review save नहीं हुई: ${error?.message || "कृपया दोबारा कोशिश करें।"}`
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const sourceListings = liveListings.length ? liveListings : (loadingListings ? [] : sampleListings);

  const filtered = useMemo(() => sourceListings.filter((item) => {
    if (item.category !== category) return false;
    if (city && item.city.toLowerCase() !== city.toLowerCase()) return false;
    if (budget !== "any" && item.price > Number(budget)) return false;
    if (feature !== "any" && !item.features.includes(feature)) return false;
    if (query.trim() && !`${item.name} ${item.city} ${item.area} ${item.features.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  }), [sourceListings, category, city, budget, feature, query]);

  return (
    <main className="listing-page">
      <div className="listing-backdrop" aria-hidden="true" />
      <header className="listing-header">
        <a className="listing-brand" href="/"><span>♧</span> SPACE<b>HUNT</b></a>
        <nav><a href="/">Home</a><a href="/explore">Explore Spaces</a></nav>
      </header>

      <section className="listing-hero">
        <div className="listing-kicker"><span /> {meta.kicker} <span /></div>
        <div className="listing-category-icon">{meta.icon}</div>
        <h1>{meta.title}</h1>
        <p className="listing-intro">{meta.intro}</p>

        <form className="listing-search" onSubmit={(e) => { e.preventDefault(); setSearched(true); }}>
          <label className="listing-city">
            <span>YOUR CITY</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              <option>Suratgarh</option><option>Sri Ganganagar</option><option>Jaipur</option><option>Jodhpur</option><option>Kota</option><option>Delhi</option><option>Ajmer</option><option>Bikaner</option><option>Udaipur</option><option>Ahmedabad</option><option>Chandigarh</option><option>Lucknow</option><option>Indore</option><option>Pune</option><option>Mumbai</option><option>Bengaluru</option><option>Hyderabad</option><option>Chennai</option>
            </select>
          </label>
          <label className="listing-budget">
            <span>MAXIMUM BUDGET</span>
            <select value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option value="any">Any budget</option>
              <option value="1000">Up to ₹1,000</option>
              <option value="5000">Up to ₹5,000</option>
              <option value="10000">Up to ₹10,000</option>
              <option value="20000">Up to ₹20,000</option>
            </select>
          </label>
          <label className="listing-feature">
            <span>FACILITY / KEYWORD</span>
            <select value={feature} onChange={(e) => setFeature(e.target.value)}>
              <option value="any">Any facility</option>
              {(category === "libraries" ? ["AC", "Wi-Fi", "24 Hours", "Locker"] : category === "stays" ? ["AC", "Wi-Fi", "Meals", "Furnished"] : ["Test Series", "Library", "Doubt Sessions"]).map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <button className="listing-search-button" type="submit">SEARCH SPACES <span>↗</span></button>
        </form>
        <div className="listing-search-note">{city ? `Showing spaces in ${city}.` : `Choose a city to filter ${meta.singular}s.`}</div>
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div><h2>{searched ? "YOUR SEARCH RESULTS" : "AVAILABLE SPACES"}</h2></div>
          <label className="quick-search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setSearched(true); }} placeholder="Search name, area, facility..." /></label>
        </div>
        <div className="results-meta"><span><b>{filtered.length}</b> matching {filtered.length === 1 ? "space" : "spaces"}</span><span className="demo-label">{liveListings.length ? "APPROVED OWNER LISTINGS" : loadingListings ? "LOADING LISTINGS…" : "DEMO DATA"}</span></div>

        {filtered.length ? <div className="listing-grid">
          {filtered.map((item) => <article className="listing-card" key={item.id}>
            <div className="listing-image-wrap"><img src={item.image} alt={item.name} loading="lazy" /><span className="listing-category-pill">{category === "libraries" ? "STUDY SPACE" : category === "stays" ? "STUDENT STAY" : "COACHING"}</span><span className="listing-rating">★ {item.rating}</span></div>
            <div className="listing-card-body">
              <div className="listing-location">⌖ {item.area}, {item.city}</div>
              <h3>{item.name}</h3><p>{item.description}</p>
              <div className="listing-features">{item.features.map((f) => <span key={f}>{f}</span>)}</div>
              <div className="review-card-actions">
                <button type="button" className="review-view-button" onClick={() => { setReviewListing(item); setReviewNotice(""); }}>★ Reviews &amp; Ratings <span>({readReviews(item.id).length})</span></button>
                <button type="button" className="review-write-button" onClick={() => { setReviewListing(item); setReviewNotice(""); setReviewDraft({ rating: 5, title: "", text: "" }); }}>✍ Write a Review</button>
              </div>
              <div className="listing-card-bottom"><div className="listing-price">₹{item.price.toLocaleString("en-IN")}<small>{item.unit}</small></div><a className="listing-contact" href={item.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + item.area + " " + item.city)}`} target="_blank" rel="noreferrer">VIEW LOCATION ↗</a></div>
            </div>
          </article>)}
        </div> : <div className="listing-empty"><span>⌕</span><h3>No matching spaces found</h3><p>Try another city, a higher budget, or clear one of the filters.</p><button onClick={() => { setCity(""); setBudget("any"); setFeature("any"); setQuery(""); setSearched(false); }}>CLEAR FILTERS</button></div>}

        <div className="listing-disclaimer">{databaseError || (liveListings.length ? "Approved owner listings. Reviews appear after moderation." : loadingListings ? "Loading approved listings…" : "Sample listings are shown until owner listings are approved.")}</div>
      </section>

      {reviewListing && <div className="review-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setReviewListing(null); }}>
        <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <button type="button" className="review-modal-close" aria-label="Close reviews" onClick={() => setReviewListing(null)}>×</button>
          <h2 id="review-modal-title">Reviews &amp; Ratings</h2>
          <h3>{reviewListing.name}</h3>
          <div className="review-list">
            {readReviews(reviewListing.id).length === 0 ? <p className="review-empty-state">No reviews yet. Be the first to share your experience.</p> : readReviews(reviewListing.id).map((review) => <article className="review-entry" key={review.id}><div className="review-entry-stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</div><strong>{review.title || "Student review"}</strong><p>{review.text}</p><small>{review.date} · User-submitted, not independently verified</small></article>)}
          </div>
          <form className="review-form" onSubmit={submitReview}>
            <h4>Write a Review</h4>
            <label>YOUR RATING <select value={reviewDraft.rating} onChange={(e) => setReviewDraft({ ...reviewDraft, rating: e.target.value })}><option value="5">★★★★★ — Excellent</option><option value="4">★★★★☆ — Very good</option><option value="3">★★★☆☆ — Average</option><option value="2">★★☆☆☆ — Poor</option><option value="1">★☆☆☆☆ — Very poor</option></select></label>
            <label>REVIEW TITLE <input value={reviewDraft.title} maxLength={80} onChange={(e) => setReviewDraft({ ...reviewDraft, title: e.target.value })} placeholder="Summarize your experience (optional)" /></label>
            <label>YOUR EXPERIENCE <textarea required minLength={5} maxLength={1200} rows={4} value={reviewDraft.text} onChange={(e) => setReviewDraft({ ...reviewDraft, text: e.target.value })} placeholder="What should other students know?" /></label>
            <button className="review-submit-button" type="submit">SUBMIT REVIEW ↗</button>
            {reviewNotice && <p className="review-notice" role="status">{reviewNotice}</p>}
            <small className="review-demo-note">Reviews are published after approval. Sample listings do not accept online reviews.</small>
          </form>
        </section>
      </div>}

      <footer className="listing-footer"><a href="/explore">← EXPLORE SPACES</a><a href="/">HOME</a></footer>
    </main>
  );
}
