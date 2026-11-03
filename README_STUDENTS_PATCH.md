# SPACEHUNT Students Social Network Patch

This patch adds a Students-only social area inside the existing SPACEHUNT website. It uses the site's existing navy/gold brand colors and existing Supabase client; it adds no new npm dependency.

## Included

- Student-only `Students` navigation entry on the Home and Explore headers.
- Signup username field for Student accounts. Usernames are 3–20 characters (`a-z`, `0-9`, `_`) and are globally unique regardless of letter case.
- Student Home Feed with text-only posts (maximum 500 characters), likes, comments, and own-post deletion.
- Explore Students, derived only from the signed-in student's saved study city, capped at 60 results.
- Personal text messages (maximum 1,000 characters).
- Database-enforced turn-taking: after a user sends one message, they cannot send another to that person until the other person replies. This is enforced in a row-locked Supabase RPC, not only by disabling the Send button.
- Student profile setup for existing accounts that do not yet have a username.
- Block and report actions.
- Supabase Row Level Security (RLS) so Owners cannot read Student social data, and Students can only discover/read Students in the same saved study city.

## Apply in this order

1. Open the Supabase project connected to SPACEHUNT.
2. Open **SQL Editor** and run the complete file:
   `supabase/migrations/202611030001_students_social.sql`
3. Wait for the SQL Editor to report success. This creates the profile table, the signup trigger, social tables, indexes, RLS policies, and the message/username RPCs.
4. Extract this patch ZIP into the root of the existing Vite project, allowing the listed files to be overwritten.
5. Run `npm run build` and then launch the site as usual.

## Important notes

- Existing accounts are backfilled from their current Supabase Auth metadata (`role`, `city`, `full_name`). Existing Student accounts without a username are asked to choose one the first time they open Students.
- If an older account has no city in its Auth metadata, its profile is assigned `Unknown`. It will only see other profiles with the same saved city value. Correct such records from the Supabase SQL Editor before expecting normal city discovery.
- City privacy is enforced by database policies and a city-scoped RPC. The frontend also caps the feed at 40 posts and the discovery list at 60 students.
- The signup form currently offers the cities already present in the project's existing city list. Add more cities to that list when required.
- Owners do not get the Students navigation entry, and the `/students` route rejects non-Student profiles. RLS independently blocks them from reading Students data.
- This patch does not implement image/video posts, stories, follow counts, group chat, voice/video calls, or message requests. It intentionally stays text-first and lightweight.
- The SQL migration must be applied before the frontend files. Until then, the new page cannot load the profile/social tables.
