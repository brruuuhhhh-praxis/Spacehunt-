SPACEHUNT — animated login gate UI patch

Files included:
- src/LoginPage.jsx
- src/LoginPage.css
- src/main.jsx (updated to gate every route behind login screen)

Install in Termux from the project folder:
1) Back up files:
   mkdir -p backup-login
   cp src/main.jsx backup-login/
2) Extract this archive to the project root (it contains src/... files):
   tar -xzf /sdcard/Download/spacehunt_login_animated_patch.tar.gz -C .
3) Build:
   npm run build

IMPORTANT SECURITY NOTE:
This is a front-end design/prototype gate. The form accepts any non-empty email and a password of at least 6 characters and stores a demo session in localStorage. It is NOT real authentication and does NOT securely protect data or APIs. Before public launch, connect Supabase Auth (email/phone OTP/Google as chosen), verify sessions server-side, enforce Row Level Security on database tables, and verify CAPTCHA tokens server-side. Never put a Supabase service-role key in the frontend.

To reset the demo gate on the same browser, run in the browser console:
localStorage.removeItem('spacehunt_demo_session'); location.reload();
