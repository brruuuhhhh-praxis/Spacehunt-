-- SPACEHUNT Students Social Network
-- Apply this migration in Supabase SQL Editor before deploying the frontend patch.

create table if not exists public.spacehunt_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('Student', 'Space Owner')),
  study_city text not null,
  username text,
  display_name text not null default 'Student',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spacehunt_profiles_username_format check (
    username is null or (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$')
  ),
  constraint spacehunt_profiles_owner_no_username check (
    role = 'Student' or username is null
  )
);

create unique index if not exists spacehunt_profiles_username_lower_uidx
  on public.spacehunt_profiles (lower(username))
  where username is not null;

create index if not exists spacehunt_profiles_city_role_idx
  on public.spacehunt_profiles (lower(study_city), role, user_id);

create index if not exists spacehunt_profiles_city_username_idx
  on public.spacehunt_profiles (lower(study_city), lower(username))
  where role = 'Student' and username is not null;

create or replace function public.touch_spacehunt_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_spacehunt_profile_updated_at on public.spacehunt_profiles;
create trigger touch_spacehunt_profile_updated_at
before update on public.spacehunt_profiles
for each row execute function public.touch_spacehunt_profile_updated_at();

create or replace function public.handle_new_spacehunt_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_city text;
  v_username text;
  v_name text;
begin
  v_role := case
    when lower(coalesce(new.raw_user_meta_data ->> 'role', 'student')) in ('space owner', 'owner') then 'Space Owner'
    else 'Student'
  end;
  v_city := left(trim(coalesce(new.raw_user_meta_data ->> 'city', 'Unknown')), 80);
  if v_city = '' then v_city := 'Unknown'; end if;
  v_name := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Student'), '@', 1))), 80);
  if v_name = '' then v_name := 'Student'; end if;
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if v_role = 'Space Owner' or v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := null;
  end if;

  insert into public.spacehunt_profiles (user_id, role, study_city, username, display_name)
  values (new.id, v_role, v_city, v_username, v_name)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_spacehunt_profile on auth.users;
create trigger on_auth_user_created_spacehunt_profile
after insert on auth.users
for each row execute function public.handle_new_spacehunt_auth_user();

-- Backfill accounts created before this migration. Older students without a
-- username will be asked to choose one when they open Students.
insert into public.spacehunt_profiles (user_id, role, study_city, username, display_name)
select
  u.id,
  case when lower(coalesce(u.raw_user_meta_data ->> 'role', 'student')) in ('space owner', 'owner')
    then 'Space Owner' else 'Student' end,
  left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'city'), ''), 'Unknown'), 80),
  case
    when lower(coalesce(u.raw_user_meta_data ->> 'role', 'student')) in ('space owner', 'owner') then null
    when lower(coalesce(u.raw_user_meta_data ->> 'username', '')) ~ '^[a-z0-9_]{3,20}$'
      then lower(u.raw_user_meta_data ->> 'username')
    else null
  end,
  left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(u.email, 'Student'), '@', 1)), 80)
from auth.users u
on conflict do nothing;

create table if not exists public.student_user_blocks (
  blocker_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint student_user_blocks_no_self check (blocker_id <> blocked_id)
);

create table if not exists public.student_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  reported_user_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  constraint student_user_reports_no_self check (reporter_id <> reported_user_id)
);

create or replace function public.is_current_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.spacehunt_profiles p
    where p.user_id = auth.uid()
      and p.role = 'Student'
      and p.username is not null
      and p.study_city <> ''
  );
$$;

create or replace function public.can_view_student_profile(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.spacehunt_profiles viewer
    join public.spacehunt_profiles target
      on target.user_id = p_target_user_id
    where viewer.user_id = auth.uid()
      and viewer.role = 'Student'
      and viewer.username is not null
      and target.role = 'Student'
      and target.username is not null
      and lower(trim(viewer.study_city)) = lower(trim(target.study_city))
      and not exists (
        select 1 from public.student_user_blocks b
        where (b.blocker_id = viewer.user_id and b.blocked_id = target.user_id)
           or (b.blocker_id = target.user_id and b.blocked_id = viewer.user_id)
      )
  );
$$;

create or replace function public.list_city_students(p_search text default null, p_limit integer default 60)
returns table(user_id uuid, username text, display_name text, study_city text, bio text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_city text;
  v_search text := lower(trim(coalesce(p_search, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 60), 60));
begin
  select p.study_city into v_city
  from public.spacehunt_profiles p
  where p.user_id = auth.uid() and p.role = 'Student' and p.username is not null;
  if not found then raise exception 'A completed Student profile is required.'; end if;

  return query
  select p.user_id, p.username, p.display_name, p.study_city, p.bio
  from public.spacehunt_profiles p
  where p.role = 'Student'
    and p.username is not null
    and p.user_id <> auth.uid()
    and lower(p.study_city) = lower(v_city)
    and (v_search = '' or lower(p.username) like v_search || '%')
    and not exists (
      select 1 from public.student_user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = auth.uid())
    )
  order by p.username
  limit v_limit;
end;
$$;

create table if not exists public.student_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_posts_feed_idx
  on public.student_posts (created_at desc, author_id);

create or replace function public.can_view_student_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_posts post
    where post.id = p_post_id
      and public.can_view_student_profile(post.author_id)
  );
$$;

create table if not exists public.student_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.student_posts(id) on delete cascade,
  author_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now(),
  constraint student_post_comments_author_id_fkey
    foreign key (author_id) references public.spacehunt_profiles(user_id) on delete cascade
);

create index if not exists student_post_comments_post_idx
  on public.student_post_comments (post_id, created_at);

create table if not exists public.student_post_likes (
  post_id uuid not null references public.student_posts(id) on delete cascade,
  user_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists student_post_likes_post_idx on public.student_post_likes (post_id);

create table if not exists public.student_conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  user_two uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  last_message_sender_id uuid references public.spacehunt_profiles(user_id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint student_conversations_ordered_users check (user_one < user_two),
  unique (user_one, user_two)
);

create index if not exists student_conversations_user_one_idx
  on public.student_conversations (user_one, updated_at desc);
create index if not exists student_conversations_user_two_idx
  on public.student_conversations (user_two, updated_at desc);

create table if not exists public.student_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.student_conversations(id) on delete cascade,
  sender_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.spacehunt_profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint student_messages_different_users check (sender_id <> recipient_id)
);

create index if not exists student_messages_conversation_idx
  on public.student_messages (conversation_id, created_at desc);
create index if not exists student_messages_unread_idx
  on public.student_messages (recipient_id, read_at) where read_at is null;

create or replace function public.can_view_student_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_conversations c
    where c.id = p_conversation_id
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
      and public.can_view_student_profile(case when c.user_one = auth.uid() then c.user_two else c.user_one end)
  );
$$;

-- A message may be sent only when the other person sent the last message.
-- The row lock makes this rule race-safe even if the client double-submits.
create or replace function public.send_student_message(p_recipient_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_sender_city text;
  v_recipient_city text;
  v_one uuid;
  v_two uuid;
  v_conversation_id uuid;
  v_last_sender uuid;
  v_message_id uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  if v_sender is null then raise exception 'Please log in to send messages.'; end if;
  if p_recipient_id is null or p_recipient_id = v_sender then raise exception 'Choose another student.'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'Message must contain 1 to 1000 characters.';
  end if;

  select study_city into v_sender_city
  from public.spacehunt_profiles
  where user_id = v_sender and role = 'Student' and username is not null;
  if not found then raise exception 'A Student profile and username are required.'; end if;

  select study_city into v_recipient_city
  from public.spacehunt_profiles
  where user_id = p_recipient_id and role = 'Student' and username is not null;
  if not found or lower(trim(v_sender_city)) <> lower(trim(v_recipient_city)) then
    raise exception 'You can message only students in your study city.';
  end if;

  if exists (
    select 1 from public.student_user_blocks b
    where (b.blocker_id = v_sender and b.blocked_id = p_recipient_id)
       or (b.blocker_id = p_recipient_id and b.blocked_id = v_sender)
  ) then
    raise exception 'Messaging is unavailable for this conversation.';
  end if;

  if v_sender < p_recipient_id then
    v_one := v_sender; v_two := p_recipient_id;
  else
    v_one := p_recipient_id; v_two := v_sender;
  end if;

  insert into public.student_conversations (user_one, user_two)
  values (v_one, v_two)
  on conflict (user_one, user_two) do nothing;

  select id, last_message_sender_id
    into v_conversation_id, v_last_sender
  from public.student_conversations
  where user_one = v_one and user_two = v_two
  for update;

  if v_last_sender = v_sender then
    raise exception 'Please wait for the other student to reply before sending another message.';
  end if;

  insert into public.student_messages (conversation_id, sender_id, recipient_id, body)
  values (v_conversation_id, v_sender, p_recipient_id, v_body)
  returning id into v_message_id;

  update public.student_conversations
  set last_message_sender_id = v_sender, updated_at = now()
  where id = v_conversation_id;

  return v_message_id;
end;
$$;

create or replace function public.set_student_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_saved text;
begin
  if auth.uid() is null then raise exception 'Please log in first.'; end if;
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3–20 characters using only letters, numbers, and underscores.';
  end if;

  update public.spacehunt_profiles
  set username = v_username
  where user_id = auth.uid() and role = 'Student'
  returning username into v_saved;

  if v_saved is null then raise exception 'Only Student accounts can set a student username.'; end if;
  return v_saved;
end;
$$;

-- RLS is the actual access boundary; hiding the Students link is not security.
alter table public.spacehunt_profiles enable row level security;
alter table public.student_user_blocks enable row level security;
alter table public.student_user_reports enable row level security;
alter table public.student_posts enable row level security;
alter table public.student_post_comments enable row level security;
alter table public.student_post_likes enable row level security;
alter table public.student_conversations enable row level security;
alter table public.student_messages enable row level security;

drop policy if exists spacehunt_profiles_select_same_city on public.spacehunt_profiles;
create policy spacehunt_profiles_select_same_city on public.spacehunt_profiles
for select to authenticated
using (user_id = auth.uid() or public.can_view_student_profile(user_id));

drop policy if exists student_posts_select_same_city on public.student_posts;
create policy student_posts_select_same_city on public.student_posts
for select to authenticated using (public.can_view_student_profile(author_id));

drop policy if exists student_posts_insert_self on public.student_posts;
create policy student_posts_insert_self on public.student_posts
for insert to authenticated with check (author_id = auth.uid() and public.is_current_student());

drop policy if exists student_posts_update_self on public.student_posts;
create policy student_posts_update_self on public.student_posts
for update to authenticated using (author_id = auth.uid() and public.is_current_student())
with check (author_id = auth.uid() and public.is_current_student());

drop policy if exists student_posts_delete_self on public.student_posts;
create policy student_posts_delete_self on public.student_posts
for delete to authenticated using (author_id = auth.uid() and public.is_current_student());

drop policy if exists student_comments_select on public.student_post_comments;
create policy student_comments_select on public.student_post_comments
for select to authenticated using (public.can_view_student_post(post_id) and public.can_view_student_profile(author_id));

drop policy if exists student_comments_insert on public.student_post_comments;
create policy student_comments_insert on public.student_post_comments
for insert to authenticated with check (author_id = auth.uid() and public.is_current_student() and public.can_view_student_post(post_id));

drop policy if exists student_comments_delete_self on public.student_post_comments;
create policy student_comments_delete_self on public.student_post_comments
for delete to authenticated using (author_id = auth.uid() and public.is_current_student());

drop policy if exists student_likes_select on public.student_post_likes;
create policy student_likes_select on public.student_post_likes
for select to authenticated using (public.can_view_student_post(post_id) and public.can_view_student_profile(user_id));

drop policy if exists student_likes_insert on public.student_post_likes;
create policy student_likes_insert on public.student_post_likes
for insert to authenticated with check (user_id = auth.uid() and public.is_current_student() and public.can_view_student_post(post_id));

drop policy if exists student_likes_delete_self on public.student_post_likes;
create policy student_likes_delete_self on public.student_post_likes
for delete to authenticated using (user_id = auth.uid() and public.is_current_student());

drop policy if exists student_conversations_select_participant on public.student_conversations;
create policy student_conversations_select_participant on public.student_conversations
for select to authenticated using (
  (user_one = auth.uid() or user_two = auth.uid())
  and public.can_view_student_profile(case when user_one = auth.uid() then user_two else user_one end)
);

drop policy if exists student_messages_select_participant on public.student_messages;
create policy student_messages_select_participant on public.student_messages
for select to authenticated using (public.can_view_student_conversation(conversation_id));

drop policy if exists student_messages_mark_read on public.student_messages;
create policy student_messages_mark_read on public.student_messages
for update to authenticated using (recipient_id = auth.uid() and public.can_view_student_conversation(conversation_id))
with check (recipient_id = auth.uid() and public.can_view_student_conversation(conversation_id));

drop policy if exists student_blocks_select_own on public.student_user_blocks;
create policy student_blocks_select_own on public.student_user_blocks
for select to authenticated using (blocker_id = auth.uid());

drop policy if exists student_blocks_insert_own on public.student_user_blocks;
create policy student_blocks_insert_own on public.student_user_blocks
for insert to authenticated with check (blocker_id = auth.uid() and public.is_current_student() and public.can_view_student_profile(blocked_id));

drop policy if exists student_blocks_delete_own on public.student_user_blocks;
create policy student_blocks_delete_own on public.student_user_blocks
for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists student_reports_insert_own on public.student_user_reports;
create policy student_reports_insert_own on public.student_user_reports
for insert to authenticated with check (reporter_id = auth.uid() and public.is_current_student() and public.can_view_student_profile(reported_user_id));

drop policy if exists student_reports_select_own on public.student_user_reports;
create policy student_reports_select_own on public.student_user_reports
for select to authenticated using (reporter_id = auth.uid());

revoke all on public.spacehunt_profiles from anon, authenticated;
revoke all on public.student_user_blocks from anon, authenticated;
revoke all on public.student_user_reports from anon, authenticated;
revoke all on public.student_posts from anon, authenticated;
revoke all on public.student_post_comments from anon, authenticated;
revoke all on public.student_post_likes from anon, authenticated;
revoke all on public.student_conversations from anon, authenticated;
revoke all on public.student_messages from anon, authenticated;

grant select on public.spacehunt_profiles to authenticated;
grant select, insert, update, delete on public.student_posts to authenticated;
grant select, insert, delete on public.student_post_comments to authenticated;
grant select, insert, delete on public.student_post_likes to authenticated;
grant select on public.student_conversations to authenticated;
grant select on public.student_messages to authenticated;
grant update (read_at) on public.student_messages to authenticated;
grant select, insert, delete on public.student_user_blocks to authenticated;
grant select, insert on public.student_user_reports to authenticated;

revoke all on function public.handle_new_spacehunt_auth_user() from public;
revoke all on function public.touch_spacehunt_profile_updated_at() from public;
revoke all on function public.is_current_student() from public;
revoke all on function public.can_view_student_profile(uuid) from public;
revoke all on function public.can_view_student_post(uuid) from public;
revoke all on function public.can_view_student_conversation(uuid) from public;
revoke all on function public.list_city_students(text, integer) from public;
revoke all on function public.send_student_message(uuid, text) from public;
revoke all on function public.set_student_username(text) from public;
grant execute on function public.is_current_student() to authenticated;
grant execute on function public.can_view_student_profile(uuid) to authenticated;
grant execute on function public.can_view_student_post(uuid) to authenticated;
grant execute on function public.can_view_student_conversation(uuid) to authenticated;
grant execute on function public.list_city_students(text, integer) to authenticated;
grant execute on function public.send_student_message(uuid, text) to authenticated;
grant execute on function public.set_student_username(text) to authenticated;

-- Enable Supabase Realtime for the social tables without failing if already enabled.
do $$
declare
  t text;
begin
  foreach t in array array['student_posts','student_post_comments','student_post_likes','student_messages','student_conversations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
exception when undefined_object then
  -- Some local/self-hosted Supabase setups do not create this publication.
  null;
end;
$$;
