SPACEHUNT Luxury 3D Splash Intro Patch V2

Extends the full-screen brand reveal to about 5.4 seconds and adds a layered nebula, a larger rotating portal, a 3D-style book emblem, a horizon stage, and a longer SPACEHUNT wordmark reveal. The existing LoginPage and route setup are preserved from the current splash patch.

From project root, back up and install:
  mkdir -p backup-splash-v2
  cp src/main.jsx src/LoginPage.jsx src/LoginPage.css backup-splash-v2/
  tar -xzf ~/storage/shared/Download/spacehunt_luxury_3d_intro_v2.tar.gz -C .
  npm run build

Important: this modifies the splash component/styles, not the authentication backend. The current Login is demo-only until Supabase Auth and database RLS are configured.
