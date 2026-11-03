SPACEHUNT CITY SIGNUP PATCH

Included changes:
- Signup requires a study city and saves it on the current demo session.
- Explore page displays the selected city.
- Listing pages default to the saved city; users can change the city filter.
- Existing intro/login visuals and other pages are retained.

IMPORTANT LIMITATION:
This project currently uses a prototype-only frontend session (demo: true), not real authentication. City and role values in localStorage can be edited by the user and are NOT trusted for authorization. This patch is a UI/prototype feature only. For production, implement Supabase Auth, store city in a profiles table keyed to auth.uid(), and enforce access with RLS policies. Sample listing data only exists for Jaipur, Kota, and Delhi; other city selections will correctly show no sample results until real listings are added.

Apply by copying the included src files into your project after backing up the current src folder.
