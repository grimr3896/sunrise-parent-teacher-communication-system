/* ##########################################################################
   SUNRISE PRIMARY SCHOOL
   Parent-Teacher Communication Management System

   TABLE OF CONTENTS
   --------------------------------------------------------------------------
    1.  Initialization and Shared Utilities
    2.  Login and Authentication
    3.  Navigation and Page Layout
    4.  Messages and Dashboard
    5.  Send Message and Attachments
    6.  Acknowledgement and Replies
    7.  School Events
    8.  Notifications
    9.  User Management
    10. Communication History
    11. Navigation Actions, Logout, and Application Startup
   ########################################################################## */



// ============================================================
// 1. INITIALIZATION AND SHARED UTILITIES
// ============================================================
// ---------- 1.1 Core references & global state ----------
const app = document.getElementById('app');
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
let state = { user: null, profile: null, page: 'dashboard' };
// ---------- 1.2 Formatting helpers ----------
// Escape HTML special characters
const esc = s => String(s ?? '').replace(/[&<>\'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[c]));
// Format a date/time for display
const fmt = d => d ? new Date(d).toLocaleString() : '—';
// ---------- 1.3 Notices & error handling ----------
// Show a success/error notice at the top of the page
function toast(m, type = 'success') {
  const x = document.getElementById('pageNotice');
  if (!x) return;
  x.textContent = m;
  x.className = 'page-notice ' + (type === 'error' ? 'error' : 'success');
  x.hidden = false;
}
// Log an error and show it as an error notice
function fail(e) {
  console.error(e);
  toast(e.message || 'Something went wrong', 'error');
}
// ---------- 1.4 Profile loading ----------
// Load the signed-in user's profile into state
async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', state.user.id).single();
  if (error) throw error;
  state.profile = data;
}



// ============================================================
// 2. LOGIN AND AUTHENTICATION
// ============================================================

// ---------- 2.1 Login screen ----------
function login() {
  // Render the login form
  app.innerHTML = `<div class="login"><div class="login-card">
  <div class="brand">
  <div class="logo">SP</div><div>
  <h1>Sunrise Primary School</h1>
  <p>Parent-Teacher Communication Management System</p>
  </div></div>
  <div id="loginNotice" class="page-notice error" hidden>
  </div><form id="loginForm">
  <div class="field"><label>Email</label>
  <input id="email" type="email" required placeholder="Enter your email">
  </div><div class="field">
  <label>Password</label>
  <input id="password" type="password" required placeholder="Enter your password">
  </div><button class="btn primary" style="width:100%">Login</button>
  </form><div class="demo">Accounts are created by the school administrator. Contact the administrator if you need access.</div></div></div>`;

  // Handle login submission
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const { error } = await sb.auth.signInWithPassword({ email: email.value, password: password.value });
      if (error) throw error;
      await boot();
    } catch (e) {
      const n = document.getElementById('loginNotice');
      if (n) {
        n.textContent = e.message;
        n.hidden = false;
        n.className = 'page-notice error';
      }
    }
  };
}



// ============================================================
// 3. NAVIGATION AND PAGE LAYOUT
// ============================================================

// ---------- 3.1 Sidebar menu (depends on user role) ----------
const navItems = () => {
  const c = [['dashboard', 'Dashboard']];

  if (state.profile.role === 'teacher') {
    c.push(['messages', 'Messages'], ['send', 'Send Message'], ['events', 'Events'], ['history', 'History']);
  } else if (state.profile.role === 'parent') {
    c.push(['messages', 'Inbox'], ['events', 'School Events'], ['notifications', 'Notifications'], ['history', 'History']);
  } else {
    c.push(['users', 'Users'], ['messages', 'Communications'], ['events', 'Events'], ['notifications', 'Notifications'], ['history', 'History']);
  }

  return c;
};
// ---------- 3.2 Page shell (sidebar + header + content) ----------
function layout(content, title = 'Dashboard') {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="side-title">SUNRISE PRIMARY<br><span class="muted">Communication System</span></div><div class="nav">${navItems().map(([id, l]) => `<button class="${state.page === id ? 'active' : ''}" onclick="go('${id}')">${l}</button>`).join('')}</div><button class="btn logout" onclick="logout()">Logout</button></aside><main class="main"><div id="pageNotice" class="page-notice" hidden></div><div class="top"><div><h2>${title}</h2><p>${esc(state.profile.full_name)} · ${state.profile.role}</p></div><div class="user-pill">${esc(state.profile.email || state.user.email)}</div></div>${content}</main></div>`;
}
// ---------- 3.3 Router ----------
async function render() {
  if (!state.user || !state.profile) { login(); return; }

  try {
    if (state.page === 'dashboard') return dashboard();
    if (state.page === 'messages') return messages();
    if (state.page === 'send') return sendPage();
    if (state.page === 'events') return events();
    if (state.page === 'notifications') return notifications();
    if (state.page === 'users') return users();
    if (state.page === 'history') return historyPage();
  } catch (e) {
    layout(`<div class="section"><div class="empty">${esc(e.message)}</div></div>`, 'Error');
  }
}



// ============================================================
// 4. MESSAGES AND DASHBOARD
// ============================================================

// ---------- 4.1 Data: fetch messages ----------
async function getMessages() {
  const { data, error } = await sb.from('messages')
    .select('*,sender:profiles!messages_sender_id_fkey(id,full_name,email,role),recipient:profiles!messages_recipient_id_fkey(id,full_name,email,role)')
    .or(`sender_id.eq.${state.user.id},recipient_id.eq.${state.user.id}`)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
// ---------- 4.2 Component: message card ----------
function messageCard(m) {
  const incoming = m.recipient_id === state.user.id;
  return `<div class="message"><h4>${esc(m.subject)} <span class="badge">${incoming ? 'Received' : 'Sent'}</span></h4><div class="meta">${incoming ? 'From' : 'To'}: ${esc(incoming ? m.sender?.full_name : m.recipient?.full_name)} · ${fmt(m.sent_at)}</div><div class="body">${esc(m.body)}</div>${m.attachment_path ? `<div class="actions"><button class="btn secondary" onclick="openAttachment('${esc(m.attachment_path)}')">View attachment</button></div>` : ''}<div class="meta">${m.acknowledged_at ? 'Acknowledged ' + fmt(m.acknowledged_at) : incoming ? 'Awaiting acknowledgement' : ''}</div><div class="actions">${incoming && !m.acknowledged_at ? `<button class="btn secondary" onclick="ack('${m.id}')">Acknowledge</button>` : ''}<button class="btn secondary" onclick="reply('${m.id}','${esc(m.subject).replace(/'/g, "\\'")}','${incoming ? m.sender_id : m.recipient_id}')">Respond</button></div><div id="reply-${m.id}"></div></div>`;
}
// ---------- 4.3 Page: dashboard ----------
async function dashboard() {
  // Load messages, upcoming events and unread notifications together
  const [msgs, evs, ns] = await Promise.all([
    getMessages(),
    sb.from('events').select('*').order('starts_at', { ascending: true }).limit(6),
    sb.from('notifications').select('*').eq('user_id', state.user.id).eq('is_read', false)
  ]);
  if (evs.error) throw evs.error;
  if (ns.error) throw ns.error;

  // Count messages still waiting for acknowledgement

  const pending = msgs.filter(m => m.recipient_id === state.user.id && !m.acknowledged_at).length;
  layout(`<div class="cards"><div class="card stat"><div class="muted">Messages</div><div class="num">${msgs.length}</div></div><div class="card stat"><div class="muted">Unread Notifications</div><div class="num">${ns.data.length}</div></div><div class="card stat"><div class="muted">School Events</div><div class="num">${evs.data.length}</div></div><div class="card stat"><div class="muted">Pending Acknowledgements</div><div class="num">${pending}</div></div></div><div class="grid"><div class="section"><h3>Recent Communication</h3>${msgs.slice(0, 6).map(messageCard).join('') || '<div class="empty">No communications yet.</div>'}</div><div class="section"><h3>Upcoming Events</h3>${evs.data.map(e => `<div class="message"><b>${esc(e.title)}</b><div class="meta">${fmt(e.starts_at)} · ${esc(e.location)}</div><div class="muted">${esc(e.description)}</div></div>`).join('') || '<div class="empty">No events.</div>'}</div></div>`, 'Dashboard');
}
// ---------- 4.4 Page: messages list ----------
async function messages() {
  const d = await getMessages();
  layout(`<div class="section"><h3>Communication History</h3>${d.map(messageCard).join('') || '<div class="empty">No messages found.</div>'}</div>`, 'Messages');
}
// ============================================================
// 5. SEND MESSAGE AND ATTACHMENTS
// ============================================================
async function sendPage() {
  // ---------- 5.1 Load active parents ----------
  const { data: parents, error } = await sb.from('profiles')
    .select('id,full_name,email')
    .eq('role', 'parent')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  const parentOptions = parents.map(p => `<option value="${p.id}">${esc(p.full_name)}${p.email ? ' — ' + esc(p.email) : ''}</option>`).join('');
  // ---------- 5.2 Render the form ----------
  layout(`<div class="section"><h3>Send Message</h3><p class="muted">Choose one parent or send the same message to every active parent.</p>${parents.length ? `<form id="sendForm"><div class="field"><label for="recipient">Send to</label><select id="recipient" name="recipient" required><option value="" disabled selected>Choose a recipient</option><option value="__all__">All active parents (${parents.length})</option>${parentOptions}</select></div><div class="field"><label for="subject">Subject</label><input id="subject" name="subject" required maxlength="200"></div><div class="field"><label for="body">Message</label><textarea id="body" name="body" required></textarea></div><div class="field"><label for="attachment">Attachment (optional, maximum 10 MB)</label><input id="attachment" name="attachment" type="file"></div><div class="actions"><button id="sendButton" class="btn primary" type="submit">Send Message</button></div><p id="recipientHint" class="muted" aria-live="polite">Select a parent or All active parents.</p></form>` : `<div class="empty">There are currently no active parent accounts to message.</div>`}</div>`, 'Send Message');
  const form = document.getElementById('sendForm');
  if (!form) return;
  const recipientSelect = form.elements.recipient;
  const hint = document.getElementById('recipientHint');
  // ---------- 5.3 Recipient hint ----------
  recipientSelect.addEventListener('change', () => {
    hint.textContent = recipientSelect.value === '__all__'
      ? `This message will be delivered individually to all ${parents.length} active parents.`
      : 'This message will be sent to the selected parent.';
  });
  // ---------- 5.4 Form submission ----------
  form.onsubmit = async e => {
    e.preventDefault();
    const button = document.getElementById('sendButton');
    try {
      // Validate recipient, subject and body
      const recipientValue = recipientSelect.value;
      if (!recipientValue) throw new Error('Please choose a parent or All active parents.');
      const subject = form.elements.subject.value.trim();
      const body = form.elements.body.value.trim();
      if (!subject || !body) throw new Error('Please enter both a subject and a message.');
      const recipients = recipientValue === '__all__' ? parents.map(p => p.id) : [recipientValue];
      if (!recipients.length) throw new Error('There are no active parents to receive this message.');
      button.disabled = true;
      button.textContent = 'Sending…';
      // Upload attachment (optional)
      let attachment_path = null;
      const file = form.elements.attachment.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error('Attachment must be 10 MB or smaller');
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        attachment_path = state.user.id + '/' + crypto.randomUUID() + '-' + safe;
        const { error: uploadError } = await sb.storage.from('communication-files').upload(attachment_path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });
        if (uploadError) throw uploadError;
      }
      // Insert one message row per recipient
      const rows = recipients.map(id => ({ sender_id: state.user.id, recipient_id: id, subject, body, attachment_path }));
      const { error: insertError } = await sb.from('messages').insert(rows);
      if (insertError) throw insertError;
      // Success: notify and reset the form
      toast(recipients.length === 1 ? 'Message sent successfully' : `Message sent successfully to ${recipients.length} active parents.`);
      form.reset();
      hint.textContent = 'Select a parent or All active parents.';
    } catch (err) {
      fail(err);
    } finally {
      button.disabled = false;
      button.textContent = 'Send Message';
    }
  };
}



// ============================================================
// 6. ACKNOWLEDGEMENT AND REPLIES
// ============================================================
// ---------- 6.1 Open attachment (short-lived signed link) ----------
async function openAttachment(path) {
  try {
    const { data, error } = await sb.storage.from('communication-files').createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, '_blank', 'noopener');
  } catch (e) {
    fail(e);
  }
}
// ---------- 6.2 Acknowledge a message ----------
async function ack(id) {
  try {
    const { error } = await sb.from('messages')
      .update({ acknowledged_at: new Date().toISOString(), read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', state.user.id);
    if (error) throw error;
    toast('Message acknowledged');
    render();
  } catch (e) {
    fail(e);
  }
}
// ---------- 6.3 Show the reply form ----------
function reply(id, subject, otherId) {
  const box = document.getElementById('reply-' + id);
  if (!box) return;
  box.innerHTML = `<form class="inline-form" onsubmit="sendReply(event,'${id}','${otherId}')"><h4>Write a response</h4><div class="field"><label>Message</label><textarea name="replyBody" required placeholder="Type your response..."></textarea></div><div class="actions"><button class="btn primary">Send response</button><button type="button" class="btn secondary" onclick="document.getElementById('reply-${id}').innerHTML=''">Cancel</button></div></form>`;
}
// ---------- 6.4 Send the reply ----------
async function sendReply(e, id, otherId) {
  e.preventDefault();
  const body = e.target.replyBody.value.trim();
  if (!body) return;
  
  try {
    const { error } = await sb.from('messages').insert({
      sender_id: state.user.id,
      recipient_id: otherId,
      subject: 'Re: Message',
      body,
      parent_message_id: id
    });
    if (error) throw error;
    toast('Response sent successfully');
    render();
  } catch (err) {
    fail(err);
  }
}



// ============================================================
// 7. SCHOOL EVENTS
// ============================================================
// ---------- 7.1 Page: events list ----------
async function events() {
  const { data, error } = await sb.from('events').select('*').order('starts_at', { ascending: true });
  if (error) throw error;
  // Only admins and teachers can create events
  const create = ['admin', 'teacher'].includes(state.profile.role)
    ? `<button class="btn primary" onclick="showEventForm()">Create Event</button>`
    : '';
  layout(`<div class="section"><div class="top"><h3>School Events</h3>${create}</div><div id="eventFormArea"></div>${data.map(e => `<div class="message"><h4>${esc(e.title)}</h4><div class="meta">${fmt(e.starts_at)} · ${esc(e.location)}</div><div class="body">${esc(e.description)}</div></div>`).join('') || '<div class="empty">No events.</div>'}</div>`, 'Events');
}
// ---------- 7.2 Show the "create event" form ----------
function showEventForm() {
  const area = document.getElementById('eventFormArea');
  area.innerHTML = `<form id="eventForm" class="inline-form"><h4>Create school event</h4><div class="field"><label>Event title</label><input name="title" required></div><div class="field"><label>Date and time</label><input name="starts_at" type="datetime-local" required></div><div class="field"><label>Location</label><input name="location"></div><div class="field"><label>Description</label><textarea name="description"></textarea></div><div class="actions"><button class="btn primary">Save event</button><button type="button" class="btn secondary" onclick="document.getElementById('eventFormArea').innerHTML=''">Cancel</button></div></form>`;
  document.getElementById('eventForm').onsubmit = saveEvent;
}
// ---------- 7.3 Save a new event ----------
async function saveEvent(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const { error } = await sb.from('events').insert({
      title: f.title.value.trim(),
      starts_at: new Date(f.starts_at.value).toISOString(),
      location: f.location.value,
      description: f.description.value,
      created_by: state.user.id
    });
    if (error) throw error;
    toast('Event created successfully');
    render();
  } catch (err) {
    fail(err);
  }
}



// ============================================================
// 8. NOTIFICATIONS
// ============================================================

// ---------- 8.1 Page: notifications list ----------
async function notifications() {
  const { data, error } = await sb.from('notifications')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  layout(`<div class="section"><h3>Notifications</h3>${data.map(n => `<div class="message"><h4>${esc(n.title)} ${n.is_read ? '' : '<span class="badge">NEW</span>'}</h4><div class="meta">${fmt(n.created_at)}</div><div class="body">${esc(n.body)}</div>${!n.is_read ? `<div class="actions"><button class="btn secondary" onclick="readNotif('${n.id}')">Mark as Read</button></div>` : ''}</div>`).join('') || '<div class="empty">No notifications.</div>'}</div>`, 'Notifications');
}


// ---------- 8.2 Mark a notification as read ----------
async function readNotif(id) {
  const { error } = await sb.from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', state.user.id);
  if (error) throw error;
  render();
}



// ============================================================
// 9. USER MANAGEMENT
// ============================================================

// ---------- 9.1 Page: users list ----------
async function users() {
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  layout(`<div class="section"><div class="top"><h3>User Management</h3><button class="btn primary" onclick="showUserForm()">Add User</button></div><div id="userFormArea"></div><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th></tr></thead><tbody>${data.map(u => `<tr><td>${esc(u.full_name)}</td><td><span class="badge">${esc(u.role)}</span></td><td>${esc(u.email)}</td><td>${u.is_active ? 'Active' : 'Inactive'}</td></tr>`).join('')}</tbody></table></div>`, 'User Management');
}


// ---------- 9.2 Show the "add user" form ----------
function showUserForm() {
  document.getElementById('userFormArea').innerHTML = `<form id="userForm" class="inline-form"><h4>Add a school user</h4><div class="form-grid"><div class="field"><label>Full name</label><input name="full_name" required></div><div class="field"><label>Email address</label><input name="email" type="email" required></div><div class="field"><label>Role</label><select name="role"><option value="parent">Parent</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></div><div class="field"><label>Temporary password</label><input name="password" type="password" minlength="8" required></div></div><div class="actions"><button class="btn primary">Create user</button><button type="button" class="btn secondary" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button></div><p class="muted">The user will need to use the supplied credentials to sign in. Email confirmation settings may affect first login.</p></form>`;
  document.getElementById('userForm').onsubmit = createUser;
}


// ---------- 9.3 Create a user and assign their role ----------
async function createUser(e) {
  e.preventDefault();
  const f = e.target;
  const full_name = f.full_name.value.trim();
  const email = f.email.value.trim().toLowerCase();
  const role = f.role.value;
  const password = f.password.value;
  const button = f.querySelector('button[type="submit"], button:not([type])');

  if (!full_name) return fail(new Error('Please enter the user’s full name.'));
  if (password.length < 8) return fail(new Error('Password must be at least 8 characters'));

  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'Creating user…';
    }

    // Create accounts securely on the server. This avoids sending a confirmation
    // email and prevents sign-up from replacing the administrator's session.
    const { data, error } = await sb.functions.invoke('admin-create-user', {
      body: { full_name, email, role, password }
    });
    if (error) {
      let detail = error.message || 'Could not create the user.';
      try {
        const response = error.context;
        if (response && typeof response.json === 'function') {
          const payload = await response.json();
          if (payload.error) detail = payload.error;
        }
      } catch (_) {}
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    if (!data?.ok) throw new Error('The server did not confirm that the account was created.');

    await render();
    toast('User account created successfully. Email confirmation is not required.');
  } catch (err) {
    fail(err);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Create user';
    }
  }
}



// ============================================================
// 10. COMMUNICATION HISTORY
// ============================================================

async function historyPage() {
  const { data, error } = await sb.from('communication_history')
    .select('*,actor:profiles!communication_history_actor_id_fkey(full_name),message:messages!communication_history_message_id_fkey(subject)')
    .order('occurred_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  layout(`<div class="section"><h3>Communication / System History</h3><table class="table"><thead><tr><th>Action</th><th>Details</th><th>Date</th></tr></thead><tbody>${data.map(h => `<tr><td>${esc(h.action)}</td><td>${esc(h.actor?.full_name || 'User')} — ${esc(h.message?.subject || 'Message')}</td><td>${fmt(h.occurred_at)}</td></tr>`).join('') || '<tr><td colspan="3">No history yet.</td></tr>'}</tbody></table></div>`, 'History');
}



// ============================================================
// 11. NAVIGATION ACTIONS, LOGOUT, AND APPLICATION STARTUP
// ============================================================

// ---------- 11.1 Navigation action ----------
function go(p) {
  state.page = p;
  render();
}


// ---------- 11.2 Logout ----------
async function logout() {
  await sb.auth.signOut();
  state.user = null;
  state.profile = null;
  login();
}


// ---------- 11.3 Boot: check session, load profile, show dashboard ----------
async function boot() {
  const { data: { user } } = await sb.auth.getUser();
  state.user = user;
  if (!user) { login(); return; }
  await loadProfile();
  state.page = 'dashboard';
  render();
}


// ---------- 11.4 Auth listener & startup ----------

// Return to the login screen if the session ends
sb.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    state.user = null;
    state.profile = null;
    login();
  }
});

// Start the app
boot().catch(e => {
  console.error(e);
  login();
});