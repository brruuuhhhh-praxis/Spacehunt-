import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase.js';
import './StudentsPage.css';

const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;
const MAX_MESSAGE_LENGTH = 1000;

function initials(value = '') {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join('') || 'S').toUpperCase();
}

function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function friendlyError(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  if (/spacehunt_profiles_username_lower_uidx|duplicate key value.*username/i.test(message)) {
    return 'That username is already taken. Please choose another one.';
  }
  if (/Please wait for the other student to reply/i.test(message)) {
    return 'Your message is sent. Wait for the other student to reply before sending another.';
  }
  if (/row-level security|permission denied/i.test(message)) {
    return 'This action is not available for your account or study city.';
  }
  return message.replace(/^.*?exception:\s*/i, '').replace(/^Error:\s*/i, '');
}

function PersonAvatar({ name, size = 'medium' }) {
  return <span className={`st-avatar st-avatar--${size}`} aria-hidden="true">{initials(name)}</span>;
}

function StudentsBrand() {
  return (
    <a className="st-brand" href="/" aria-label="SPACEHUNT home">
      <span className="st-brand__mark" aria-hidden="true">S<span>✦</span></span>
      <span className="st-brand__word">SPACE<span>HUNT</span></span>
    </a>
  );
}

export default function StudentsPage({ session, profile, onProfileUpdated, onLogout }) {
  const userId = session?.user?.id;
  const [tab, setTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [postDraft, setPostDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [people, setPeople] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [usernameDraft, setUsernameDraft] = useState(profile?.username || '');
  const [currentUsername, setCurrentUsername] = useState(profile?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [profileReady, setProfileReady] = useState(Boolean(profile?.username));

  const displayName = profile?.display_name || session?.user?.user_metadata?.full_name || 'Student';
  const city = profile?.study_city || 'Your study city';

  useEffect(() => {
    setUsernameDraft(profile?.username || '');
    setCurrentUsername(profile?.username || '');
    setProfileReady(Boolean(profile?.username));
  }, [profile?.username]);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 4200);
  }, []);

  const loadFeed = useCallback(async () => {
    if (!userId || !profileReady) return;
    const { data, error } = await supabase
      .from('student_posts')
      .select('id, body, created_at, author_id, author:spacehunt_profiles!student_posts_author_id_fkey(user_id, username, display_name)')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) {
      notify(friendlyError(error));
      return;
    }

    const rows = data || [];
    setPosts(rows);
    const ids = rows.map((row) => row.id);
    if (!ids.length) {
      setLikes([]);
      setCommentCounts({});
      return;
    }

    const [likeResult, commentResult] = await Promise.all([
      supabase.from('student_post_likes').select('post_id, user_id').in('post_id', ids).limit(1200),
      supabase.from('student_post_comments').select('post_id').in('post_id', ids).limit(1200),
    ]);
    if (!likeResult.error) setLikes(likeResult.data || []);
    if (!commentResult.error) {
      const counts = {};
      (commentResult.data || []).forEach((item) => { counts[item.post_id] = (counts[item.post_id] || 0) + 1; });
      setCommentCounts(counts);
    }
  }, [userId, profileReady, notify]);

  const loadPeople = useCallback(async () => {
    if (!profileReady) return;
    const term = peopleSearch.trim().replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const { data, error } = await supabase.rpc('list_city_students', {
      p_search: term || null,
      p_limit: 60,
    });
    if (error) notify(friendlyError(error));
    else setPeople(data || []);
  }, [profileReady, userId, peopleSearch, notify]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const { data, error } = await supabase
      .from('student_messages')
      .select('id, conversation_id, sender_id, recipient_id, body, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      notify(friendlyError(error));
      return;
    }
    const ordered = (data || []).reverse();
    setMessages(ordered);
    const unreadIds = ordered.filter((item) => item.recipient_id === userId && !item.read_at).map((item) => item.id);
    if (unreadIds.length) {
      await supabase
        .from('student_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }
  }, [userId, notify]);

  const loadConversations = useCallback(async () => {
    if (!profileReady || !userId) return;
    const columns = 'id, user_one, user_two, last_message_sender_id, updated_at';
    const [one, two] = await Promise.all([
      supabase.from('student_conversations').select(columns).eq('user_one', userId).order('updated_at', { ascending: false }).limit(60),
      supabase.from('student_conversations').select(columns).eq('user_two', userId).order('updated_at', { ascending: false }).limit(60),
    ]);
    if (one.error || two.error) {
      notify(friendlyError(one.error || two.error));
      return;
    }
    const rows = [...(one.data || []), ...(two.data || [])]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const peerIds = [...new Set(rows.map((item) => item.user_one === userId ? item.user_two : item.user_one))];
    if (!peerIds.length) {
      setConversations([]);
      return;
    }
    const { data: peerProfiles, error: peopleError } = await supabase
      .from('spacehunt_profiles')
      .select('user_id, username, display_name, study_city')
      .in('user_id', peerIds);
    if (peopleError) {
      notify(friendlyError(peopleError));
      return;
    }
    const profileMap = new Map((peerProfiles || []).map((item) => [item.user_id, item]));
    setConversations(rows.map((item) => {
      const peerId = item.user_one === userId ? item.user_two : item.user_one;
      return { ...item, peer: profileMap.get(peerId) };
    }).filter((item) => item.peer));
  }, [profileReady, userId, notify]);

  const loadConversationBetween = useCallback(async (peer) => {
    const [one, two] = [userId, peer.user_id].sort();
    const { data, error } = await supabase
      .from('student_conversations')
      .select('id, user_one, user_two, last_message_sender_id, updated_at')
      .eq('user_one', one)
      .eq('user_two', two)
      .maybeSingle();
    if (error) {
      notify(friendlyError(error));
      return;
    }
    setActivePeer(peer);
    setMessages([]);
    setActiveConversationId(data?.id || null);
    await loadMessages(data?.id || null);
  }, [userId, loadMessages, notify]);

  useEffect(() => {
    if (!userId || !profileReady) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([loadFeed(), loadPeople(), loadConversations()])
      .finally(() => { if (alive) setLoading(false); });
    const feedChannel = supabase
      .channel(`student-feed-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_posts' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_post_likes' }, () => loadFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_post_comments' }, () => loadFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_messages', filter: `recipient_id=eq.${userId}` }, async (payload) => {
        await loadConversations();
        if (activeConversationId && payload.new?.conversation_id === activeConversationId) {
          await loadMessages(activeConversationId);
        }
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(feedChannel);
    };
  }, [userId, profileReady, loadFeed, loadPeople, loadConversations, loadMessages, activeConversationId]);

  useEffect(() => {
    if (tab === 'explore') loadPeople();
    if (tab === 'messages') loadConversations();
  }, [tab, loadPeople, loadConversations]);

  useEffect(() => {
    if (!activeConversationId) return undefined;
    const channel = supabase
      .channel(`student-conversation-${activeConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'student_messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, () => loadMessages(activeConversationId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, loadMessages]);

  const myLikes = useMemo(() => new Set(likes.filter((item) => item.user_id === userId).map((item) => item.post_id)), [likes, userId]);
  const lastMessage = messages[messages.length - 1];
  const maySendMessage = !lastMessage || lastMessage.sender_id !== userId;

  async function saveUsername(event) {
    event.preventDefault();
    const clean = usernameDraft.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      notify('Username must be 3–20 characters: letters, numbers, and underscores only.');
      return;
    }
    setSavingUsername(true);
    const { data, error } = await supabase.rpc('set_student_username', { p_username: clean });
    setSavingUsername(false);
    if (error) {
      notify(friendlyError(error));
      return;
    }
    setUsernameDraft(data || clean);
    setCurrentUsername(data || clean);
    setProfileReady(true);
    onProfileUpdated?.({ ...profile, username: data || clean });
    notify('Your student username is ready.');
  }

  async function createPost(event) {
    event.preventDefault();
    const body = postDraft.trim();
    if (!body) return;
    const { error } = await supabase.from('student_posts').insert({ author_id: userId, body });
    if (error) notify(friendlyError(error));
    else {
      setPostDraft('');
      await loadFeed();
      notify('Post published.');
    }
  }

  async function toggleLike(postId) {
    const liked = myLikes.has(postId);
    const result = liked
      ? await supabase.from('student_post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      : await supabase.from('student_post_likes').insert({ post_id: postId, user_id: userId });
    if (result.error) notify(friendlyError(result.error));
    else await loadFeed();
  }

  async function loadComments(postId) {
    const { data, error } = await supabase
      .from('student_post_comments')
      .select('id, body, author_id, created_at, author:spacehunt_profiles!student_post_comments_author_id_fkey(user_id, username, display_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) notify(friendlyError(error));
    else setComments((current) => ({ ...current, [postId]: data || [] }));
  }

  async function submitComment(event, postId) {
    event.preventDefault();
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    const { error } = await supabase.from('student_post_comments').insert({ post_id: postId, author_id: userId, body });
    if (error) notify(friendlyError(error));
    else {
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      await loadComments(postId);
      await loadFeed();
    }
  }

  async function deletePost(postId) {
    if (!window.confirm('Delete this post?')) return;
    const { error } = await supabase.from('student_posts').delete().eq('id', postId).eq('author_id', userId);
    if (error) notify(friendlyError(error));
    else await loadFeed();
  }

  async function startChat(peer) {
    setTab('messages');
    setMessageDraft('');
    await loadConversationBetween(peer);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activePeer || sending || !maySendMessage) return;
    const body = messageDraft.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.rpc('send_student_message', {
      p_recipient_id: activePeer.user_id,
      p_body: body,
    });
    setSending(false);
    if (error) {
      notify(friendlyError(error));
      return;
    }
    setMessageDraft('');
    await loadConversationBetween(activePeer);
    await loadConversations();
  }

  async function blockStudent(peer) {
    if (!window.confirm(`Block @${peer.username}? They will no longer be able to interact with you.`)) return;
    const { error } = await supabase.from('student_user_blocks').insert({ blocker_id: userId, blocked_id: peer.user_id });
    if (error) notify(friendlyError(error));
    else {
      setPeople((current) => current.filter((item) => item.user_id !== peer.user_id));
      if (activePeer?.user_id === peer.user_id) {
        setActivePeer(null);
        setActiveConversationId(null);
        setMessages([]);
      }
      await loadFeed();
      await loadConversations();
      notify('Student blocked.');
    }
  }

  async function reportStudent(peer) {
    const reason = window.prompt(`Why are you reporting @${peer.username}?`);
    if (!reason?.trim()) return;
    const { error } = await supabase.from('student_user_reports').insert({
      reporter_id: userId,
      reported_user_id: peer.user_id,
      reason: reason.trim().slice(0, 500),
    });
    if (error) notify(friendlyError(error));
    else notify('Report submitted.');
  }

  const myPosts = useMemo(() => posts.filter((post) => post.author_id === userId), [posts, userId]);

  if (!profileReady) {
    return (
      <main className="st-page st-page--setup">
        <header className="st-header"><StudentsBrand /><a href="/" className="st-home-link">Back to SPACEHUNT</a></header>
        <section className="st-setup-card">
          <span className="st-kicker">STUDENT PROFILE</span>
          <h1>Choose your username.</h1>
          <p>Your username must be unique. Other students in {city} can find you using it.</p>
          <form onSubmit={saveUsername} className="st-username-form">
            <label htmlFor="student-username">USERNAME</label>
            <div className="st-username-input"><span>@</span><input id="student-username" value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value.toLowerCase())} minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" placeholder="your_username" /></div>
            <small>3–20 characters · letters, numbers, and underscores</small>
            <button className="st-primary-button" type="submit" disabled={savingUsername}>{savingUsername ? 'Saving…' : 'Continue to Students'}</button>
          </form>
        </section>
        {toast && <div className="st-toast" role="status">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="st-page">
      <header className="st-header">
        <StudentsBrand />
        <div className="st-header__center"><span className="st-kicker">STUDENT NETWORK</span><strong>Students</strong></div>
        <div className="st-header__right">
          <span className="st-city-pill">⌖ {city}</span>
          <button className="st-logout" type="button" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="st-mobile-tabs" aria-label="Student sections">
        <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}>Home</button>
        <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Explore</button>
        <button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>Messages</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
      </div>

      <div className="st-layout">
        <aside className="st-sidebar st-sidebar--left">
          <div className="st-profile-mini">
            <PersonAvatar name={displayName} size="large" />
            <div><strong>{displayName}</strong><span>@{currentUsername}</span></div>
          </div>
          <nav className="st-side-nav" aria-label="Student navigation">
            <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}><span>⌂</span> Home Feed</button>
            <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}><span>⌕</span> Explore Students</button>
            <button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}><span>✉</span> Messages</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><span>◎</span> My Profile</button>
          </nav>
          <a href="/" className="st-back-link">← Back to SPACEHUNT</a>
        </aside>

        <section className="st-main" aria-live="polite">
          {tab === 'feed' && (
            <>
              <div className="st-section-heading"><div><span className="st-kicker">YOUR CITY · YOUR COMMUNITY</span><h1>Home Feed</h1></div><span className="st-city-pill">⌖ {city}</span></div>
              <form className="st-compose-card" onSubmit={createPost}>
                <div className="st-compose-top"><PersonAvatar name={displayName} /><div><strong>Share an update</strong><span>Posting to students in {city}</span></div></div>
                <textarea value={postDraft} onChange={(event) => setPostDraft(event.target.value)} maxLength={MAX_POST_LENGTH} placeholder="What's on your mind? Share a study update, question, or thought…" />
                <div className="st-compose-bottom"><small>{postDraft.length}/{MAX_POST_LENGTH}</small><button className="st-primary-button" type="submit" disabled={!postDraft.trim()}>Publish post <span>↗</span></button></div>
              </form>
              {loading ? <div className="st-empty-state">Loading your city feed…</div> : posts.length === 0 ? <div className="st-empty-state"><span>✦</span><strong>It's quiet here for now.</strong><p>Be the first student in {city} to share an update.</p></div> : (
                <div className="st-post-list">
                  {posts.map((post) => (
                    <article className="st-post-card" key={post.id}>
                      <div className="st-post-head"><PersonAvatar name={post.author?.display_name || 'Student'} /><div className="st-post-author"><strong>{post.author?.display_name || 'Student'}</strong><span>@{post.author?.username || 'student'} · {timeLabel(post.created_at)}</span></div>{post.author_id === userId && <button className="st-icon-action" type="button" onClick={() => deletePost(post.id)} aria-label="Delete post">⋯</button>}</div>
                      <p className="st-post-body">{post.body}</p>
                      <div className="st-post-actions"><button className={myLikes.has(post.id) ? 'is-liked' : ''} type="button" onClick={() => toggleLike(post.id)}><span>♡</span> {myLikes.has(post.id) ? 'Liked' : 'Like'} <small>{likes.filter((item) => item.post_id === post.id).length || ''}</small></button><button type="button" onClick={async () => { const next = !openComments[post.id]; setOpenComments((current) => ({ ...current, [post.id]: next })); if (next) await loadComments(post.id); }}><span>▱</span> Comment <small>{commentCounts[post.id] || ''}</small></button></div>
                      {openComments[post.id] && <div className="st-comments"><div className="st-comment-list">{(comments[post.id] || []).map((comment) => <div className="st-comment" key={comment.id}><PersonAvatar name={comment.author?.display_name || 'Student'} size="small"/><div><strong>@{comment.author?.username || 'student'}</strong><p>{comment.body}</p></div></div>)}</div><form className="st-comment-form" onSubmit={(event) => submitComment(event, post.id)}><input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={MAX_COMMENT_LENGTH} placeholder="Write a comment…"/><button type="submit" disabled={!(commentDrafts[post.id] || '').trim()}>Send</button></form></div>}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'explore' && (
            <>
              <div className="st-section-heading"><div><span className="st-kicker">MEET YOUR LOCAL COMMUNITY</span><h1>Explore Students</h1></div></div>
              <div className="st-search-box"><span>⌕</span><input value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Search username (starts with)"/><small>{city}</small></div>
              {people.length === 0 ? <div className="st-empty-state"><strong>No students found.</strong><p>Try another username or check back later.</p></div> : <div className="st-people-list">{people.map((person) => <article className="st-person-card" key={person.user_id}><PersonAvatar name={person.display_name}/><div className="st-person-info"><strong>{person.display_name}</strong><span>@{person.username}</span>{person.bio && <p>{person.bio}</p>}</div><button className="st-outline-button" onClick={() => startChat(person)}>Message</button><div className="st-person-menu"><button type="button" aria-label={`More options for ${person.username}`} onClick={() => { const action = window.prompt(`For @${person.username}, type BLOCK or REPORT.`); if (action?.trim().toUpperCase() === 'BLOCK') blockStudent(person); else if (action?.trim().toUpperCase() === 'REPORT') reportStudent(person); }}>⋯</button></div></article>)}</div>}
              <p className="st-privacy-note">Only student profiles in your selected study city are shown.</p>
            </>
          )}

          {tab === 'messages' && (
            <>
              <div className="st-section-heading"><div><span className="st-kicker">PRIVATE CONVERSATIONS</span><h1>Messages</h1></div></div>
              <div className="st-messenger">
                <aside className={`st-chat-list ${activePeer ? 'st-chat-list--mobile-hidden' : ''}`}>
                  <div className="st-chat-list__heading">Your conversations</div>
                  {conversations.length === 0 ? <div className="st-chat-list__empty">No conversations yet. Find a student in Explore.</div> : conversations.map((conversation) => <button className={`st-chat-person ${activePeer?.user_id === conversation.peer?.user_id ? 'active' : ''}`} key={conversation.id} onClick={() => { setMessageDraft(''); setMessages([]); setActivePeer(conversation.peer); setActiveConversationId(conversation.id); loadMessages(conversation.id); }}><PersonAvatar name={conversation.peer?.display_name || 'Student'}/><span><strong>{conversation.peer?.display_name}</strong><small>@{conversation.peer?.username}</small></span><i>{conversation.last_message_sender_id === userId ? 'You' : ''}</i></button>)}
                </aside>
                <section className={`st-chat-window ${!activePeer ? 'st-chat-window--mobile-hidden' : ''}`}>
                  {!activePeer ? <div className="st-chat-welcome"><span>✉</span><strong>Your messages</strong><p>Choose a conversation or find a student in Explore.</p><button className="st-outline-button" onClick={() => setTab('explore')}>Find students</button></div> : <>
                    <header className="st-chat-header"><button className="st-chat-back" onClick={() => { setActivePeer(null); setActiveConversationId(null); setMessages([]); }} aria-label="Back to conversations">←</button><PersonAvatar name={activePeer.display_name}/><div><strong>{activePeer.display_name}</strong><span>@{activePeer.username} · {city}</span></div></header>
                    <div className="st-chat-messages">
                      {messages.length === 0 ? <div className="st-chat-first-message">Start a conversation with @{activePeer.username}.</div> : messages.map((message) => <div className={`st-bubble ${message.sender_id === userId ? 'st-bubble--mine' : 'st-bubble--theirs'}`} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>)}
                    </div>
                    <form className="st-chat-compose" onSubmit={sendMessage}>
                      {!maySendMessage && <div className="st-waiting-note">Message sent. Wait for @{activePeer.username} to reply before sending another.</div>}
                      <div className="st-chat-compose__row"><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} disabled={!maySendMessage || sending} placeholder={maySendMessage ? 'Write a message…' : 'Waiting for their reply'} /><button className="st-primary-button" type="submit" disabled={!messageDraft.trim() || !maySendMessage || sending}>{sending ? 'Sending…' : 'Send'}</button></div>
                      <small>One message per turn. The next message unlocks when the other student replies.</small>
                    </form>
                  </>}
                </section>
              </div>
            </>
          )}

          {tab === 'profile' && (
            <>
              <div className="st-section-heading"><div><span className="st-kicker">YOUR SPACE IN THE COMMUNITY</span><h1>My Profile</h1></div></div>
              <section className="st-own-profile"><PersonAvatar name={displayName} size="large"/><div><h2>{displayName}</h2><strong>@{currentUsername}</strong><span>⌖ {city}</span></div></section>
              <div className="st-profile-post-heading">Your recent posts</div>
              {myPosts.length === 0 ? <div className="st-empty-state">You haven't published any posts yet.</div> : <div className="st-post-list">{myPosts.map((post) => <article className="st-post-card" key={post.id}><div className="st-post-head"><PersonAvatar name={displayName}/><div className="st-post-author"><strong>{displayName}</strong><span>@{currentUsername} · {timeLabel(post.created_at)}</span></div><button className="st-icon-action" type="button" onClick={() => deletePost(post.id)} aria-label="Delete post">⋯</button></div><p className="st-post-body">{post.body}</p></article>)}</div>}
            </>
          )}
        </section>

        <aside className="st-sidebar st-sidebar--right">
          <div className="st-side-card st-city-card"><span className="st-kicker">YOUR STUDY CITY</span><strong>{city}</strong><p>Your student feed and discovery list are limited to this city.</p></div>
          <div className="st-side-card"><span className="st-kicker">COMMUNITY</span><strong>Keep it respectful.</strong><p>Share useful study updates. Avoid spam, personal information, and abusive messages.</p></div>
          <div className="st-side-card st-side-card--muted"><span>SPACEHUNT</span><small>Student Network</small><a href="/">Back to main website ↗</a></div>
        </aside>
      </div>
      {toast && <div className="st-toast" role="status">{toast}</div>}
    </main>
  );
}
