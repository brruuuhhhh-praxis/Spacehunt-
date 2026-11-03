# Luxury Library Platform — One-page Base

This is a responsive React + Vite single-page website concept for a multi-city discovery platform. It is intentionally brand-neutral: `YOUR BRAND` / `YOURBRAND` are placeholders, not a final name.

## Included in this base
- Premium dark navy + champagne-gold design
- Oversized hero heading and CSS-rendered library scene (no heavy 3D dependency)
- Search and city filter demo
- Library and PG/hostel listing cards
- How-it-works section
- Owner registration CTA
- Reviews concept section
- Responsive mobile navigation
- Demo toast messages for unfinished actions

## Run locally
1. Install Node.js (LTS) if it is not already installed.
2. Extract this ZIP and open the project folder in Terminal/Termux.
3. Run:
   ```bash
   npm install
   npm run dev -- --host 0.0.0.0
   ```
4. Open the local URL printed by Vite.

## Build for deployment
```bash
npm run build
```
The production output is created in `dist/`.

## Important: prototype, not yet a live booking platform
The visible cards use sample data. Search, category and city filtering work on that sample data. Registration, user accounts, real-time seat availability, verified reviews, booking and payment are not connected yet. Those need a backend (for example Supabase/PostgreSQL), authentication, owner verification, booking conflict protection and payment integration before public launch.

## Brand replacement
Search `YOURBRAND` and `YOUR BRAND` in `src/main.jsx` to replace the placeholders once the final name is chosen.
