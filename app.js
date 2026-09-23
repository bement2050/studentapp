const MAX_PHOTOS_PER_BLOCK = 8;
const DEFAULT_CHILD_NAME = "Sammy";
const DEFAULT_STAFF_INITIALS = "JK";
const BLOCK_TITLES = [
  "Morning",
  "Afternoon"
];

const APP_USERS = [
  { username: "JKarim", initialPassword: "Karim2026", role: "user", credentialVersion: 1 },
  { username: "Amamo", initialPassword: "Mamo2026", role: "user", credentialVersion: 1 },
  { username: "BAlemayehu", initialPassword: "B9!vQ2#L7@pX", role: "superuser", credentialVersion: 2 },
  { username: "SGebreyes", initialPassword: "Sunrise!482", role: "user", credentialVersion: 1 },
  { username: "GChere", initialPassword: "Cobalt#731", role: "user", credentialVersion: 1 },
  { username: "TAlemayehu", initialPassword: "Maple$864", role: "user", credentialVersion: 1 },
  { username: "AAlemayehu", initialPassword: "River@295", role: "user", credentialVersion: 1 }
];
const AUTH_STORAGE_KEY = "todays-journal-auth-session";
const PASSWORD_STORAGE_KEY = "todays-journal-passwords";
const USERNAME_STORAGE_KEY = "todays-journal-last-username";
const ACCESS_STATS_KEY = "todays-journal-access-stats";
const ACCESS_EVENTS_KEY = "todays-journal-access-events";
const PENDING_ACCESS_KEY = "todays-journal-pending-access";
let currentUser = null;
let appStarted = false;
let accessSessionOpen = false;
let currentAccessSessionId = null;

// Adopted Plano ISD 2026-27 academic calendar (updated April 20, 2026).
const PISD_CALENDAR = [
  { start: "2026-08-11", end: "2026-08-11", title: "First day of school", description: "First day of classes for Plano ISD students.", kind: "school" },
  { start: "2026-09-07", end: "2026-09-07", title: "Student & teacher holiday", description: "Plano ISD schools are closed.", kind: "holiday" },
  { start: "2026-10-12", end: "2026-10-14", title: "Fall break", description: "Student and teacher holiday — no classes.", kind: "holiday" },
  { start: "2026-10-15", end: "2026-10-16", title: "Student holiday", description: "Staff development/work days — no classes for students.", kind: "holiday" },
  { start: "2026-11-03", end: "2026-11-03", title: "Student holiday", description: "Staff development/work day — no classes for students.", kind: "holiday" },
  { start: "2026-11-23", end: "2026-11-27", title: "Thanksgiving break", description: "Student and teacher holiday — no classes.", kind: "holiday" },
  { start: "2026-12-18", end: "2026-12-18", title: "Early release", description: "Last day of the first semester; students dismiss early.", kind: "early" },
  { start: "2026-12-21", end: "2027-01-01", title: "Winter break", description: "Student and teacher holiday — no classes.", kind: "holiday" },
  { start: "2027-01-04", end: "2027-01-04", title: "Student holiday", description: "Staff development/work day — no classes for students.", kind: "holiday" },
  { start: "2027-01-05", end: "2027-01-05", title: "Classes resume", description: "First day of the second semester.", kind: "school" },
  { start: "2027-01-18", end: "2027-01-18", title: "Student & teacher holiday", description: "Plano ISD schools are closed.", kind: "holiday" },
  { start: "2027-02-15", end: "2027-02-16", title: "Student holiday", description: "Staff development/work days — no classes for students.", kind: "holiday" },
  { start: "2027-03-15", end: "2027-03-19", title: "Spring break", description: "Student and teacher holiday — no classes.", kind: "holiday" },
  { start: "2027-03-26", end: "2027-03-26", title: "Student & teacher holiday", description: "Plano ISD schools are closed.", kind: "holiday" },
  { start: "2027-03-29", end: "2027-03-29", title: "Student holiday", description: "Staff development/work day — no classes for students.", kind: "holiday" },
  { start: "2027-05-21", end: "2027-05-21", title: "Last day · Early release", description: "Last day of classes; students dismiss early.", kind: "early" }
];

const APP_CONFIG = {
  projectId: "sam-about-my-day",
  supabaseUrl: "https://voanpatamwilfdwppleu.supabase.co",
  supabaseAnonKey: "sb_publishable_uDAkRERB3dCTfhh-_hl6sQ_Btddu68C",
  photoBucket: "journal-photos",
  speechToTextUrl: "https://us-central1-evocative-lodge-442118-j6.cloudfunctions.net/transcribeAudio"
};

const childNameInput = document.getElementById("childName");
const entryDateInput = document.getElementById("entryDate");
const staffInitialsInput = document.getElementById("staffInitials");
const previousDayBtn = document.getElementById("previousDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const todayBtn = document.getElementById("todayBtn");
const blocksContainer = document.getElementById("blocksContainer");
const syncStatus = document.getElementById("syncStatus");
const calendarNotice = document.getElementById("calendarNotice");
const calendarNoticeTitle = document.getElementById("calendarNoticeTitle");
const calendarNoticeText = document.getElementById("calendarNoticeText");
const printBtn = document.getElementById("printBtn");
const paperPrintSheet = document.getElementById("paperPrintSheet");
const paperStudentName = document.getElementById("paperStudentName");
const paperEntryDate = document.getElementById("paperEntryDate");
const paperStaffInitials = document.getElementById("paperStaffInitials");
const paperRows = document.getElementById("paperRows");
const paperParentNote = document.getElementById("paperParentNote");
const parentNotesList = document.getElementById("parentNotesList");
const addParentNoteBtn = document.getElementById("addParentNoteBtn");
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const rememberLogin = document.getElementById("rememberLogin");
const loginError = document.getElementById("loginError");
const accountBtn = document.getElementById("accountBtn");
const accountDialog = document.getElementById("accountDialog");
const closeAccountBtn = document.getElementById("closeAccountBtn");
const signedInSummary = document.getElementById("signedInSummary");
const passwordForm = document.getElementById("passwordForm");
const passwordUserWrap = document.getElementById("passwordUserWrap");
const passwordUser = document.getElementById("passwordUser");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const passwordMessage = document.getElementById("passwordMessage");
const signOutBtn = document.getElementById("signOutBtn");
const accessStats = document.getElementById("accessStats");
const accessStatsBody = document.getElementById("accessStatsBody");
const accessDetailsBody = document.getElementById("accessDetailsBody");
const statsSummary = document.getElementById("statsSummary");
const refreshStatsBtn = document.getElementById("refreshStatsBtn");
const statsStatus = document.getElementById("statsStatus");

const blockTemplate = document.getElementById("blockTemplate");

let dataBackend = "initializing";
let supabaseClient = null;
let autoSaveTimer = null;
let isHydrating = false;
let isOpeningDate = false;
let currentPhotoEntryId = null;
let currentEntryId = null;
let currentEntryRevision = null;
let formIsDirty = false;
let formChangeVersion = 0;
let saveInProgress = null;
let activeDate = todayISO();
let activeDictation = null;
const previewUrls = new Set();

function findUser(username) {
  const normalized = String(username || "").trim().toLowerCase();
  return APP_USERS.find((user) => user.username.toLowerCase() === normalized) || null;
}

function canViewStats(user) {
  return Boolean(user && ["admin", "superuser"].includes(user.role));
}

function readPasswordOverrides() {
  try {
    return JSON.parse(localStorage.getItem(PASSWORD_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120000 },
    material,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

async function passwordMatches(user, password) {
  const override = readPasswordOverrides()[user.username];
  const overrideIsCurrent = override && (
    override.credentialVersion === user.credentialVersion
    || (user.credentialVersion === 1 && override.credentialVersion == null)
  );
  if (!overrideIsCurrent) {
    return password === user.initialPassword;
  }
  return (await passwordHash(password, base64ToBytes(override.salt))) === override.hash;
}

async function storeChangedPassword(username, password) {
  const overrides = readPasswordOverrides();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  overrides[username] = {
    salt: bytesToBase64(salt),
    hash: await passwordHash(password, salt),
    credentialVersion: findUser(username).credentialVersion
  };
  localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(overrides));
}

function readLocalAccessStats() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_STATS_KEY)) || [];
  } catch {
    return [];
  }
}

function addLocalAccessEvent(event) {
  const rows = readLocalAccessStats();
  let row = rows.find((item) => item.date === event.date && item.username === event.username);
  if (!row) {
    row = { date: event.date, username: event.username, opens: 0, closes: 0 };
    rows.push(row);
  }
  if (event.type === "open") row.opens += 1;
  if (event.type === "close") row.closes += 1;
  localStorage.setItem(ACCESS_STATS_KEY, JSON.stringify(rows.slice(-500)));

  let events = [];
  try { events = JSON.parse(localStorage.getItem(ACCESS_EVENTS_KEY)) || []; } catch {}
  events.push(event);
  localStorage.setItem(ACCESS_EVENTS_KEY, JSON.stringify(events.slice(-2000)));
}

function readLocalAccessEvents() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_EVENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function queueAccessEvent(event) {
  let pending = [];
  try { pending = JSON.parse(localStorage.getItem(PENDING_ACCESS_KEY)) || []; } catch {}
  pending.push(event);
  localStorage.setItem(PENDING_ACCESS_KEY, JSON.stringify(pending));
}

async function flushAccessEvents() {
  if (dataBackend !== "supabase") return false;
  let pending = [];
  try { pending = JSON.parse(localStorage.getItem(PENDING_ACCESS_KEY)) || []; } catch {}
  if (!pending.length) return true;

  while (pending.length) {
    const event = pending[0];
    const { error } = await supabaseClient.rpc("record_journal_access_detail", {
      p_event_id: event.id,
      p_session_id: event.sessionId,
      p_project_id: APP_CONFIG.projectId,
      p_username: event.username,
      p_event: event.type,
      p_occurred_at: event.occurredAt,
      p_local_date: event.date,
      p_viewed_date: event.viewedDate || null,
      p_timezone: event.timezone,
      p_device_type: event.deviceType,
      p_browser: event.browser,
      p_platform: event.platform
    });
    if (error) return false;
    pending.shift();
    localStorage.setItem(PENDING_ACCESS_KEY, JSON.stringify(pending));
  }
  return true;
}

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function deviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function recordAccessEvent(type, details = {}) {
  if (!currentUser || !["open", "close", "view"].includes(type)) return;
  const occurredAt = new Date().toISOString();
  let durationSeconds = null;
  if (type === "close") {
    const opened = [...readLocalAccessEvents()].reverse().find((item) =>
      item.sessionId === currentAccessSessionId && item.type === "open"
    );
    if (opened) durationSeconds = Math.max(0, Math.round((Date.now() - new Date(opened.occurredAt).getTime()) / 1000));
  }
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    sessionId: currentAccessSessionId,
    username: currentUser.username,
    type,
    occurredAt,
    date: todayISO(),
    viewedDate: details.viewedDate || null,
    durationSeconds,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
    deviceType: deviceType(),
    browser: browserName(),
    platform: navigator.userAgentData?.platform || navigator.platform || "Unknown"
  };
  addLocalAccessEvent(event);
  queueAccessEvent(event);
  if (dataBackend === "supabase") flushAccessEvents().catch(() => {});
}

function startAccessSession() {
  if (!currentUser || accessSessionOpen) return;
  currentAccessSessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  accessSessionOpen = true;
  recordAccessEvent("open");
}

function endAccessSession() {
  if (!currentUser || !accessSessionOpen) return;
  recordAccessEvent("close");
  accessSessionOpen = false;
  currentAccessSessionId = null;
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours) return `${hours}h ${minutes}m ${remaining}s`;
  if (minutes) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
}

function normalizedEvent(row) {
  return {
    id: row.id,
    sessionId: row.session_id || row.sessionId,
    username: row.username,
    type: row.event_type || row.type,
    occurredAt: row.event_at || row.occurredAt,
    date: row.local_date || row.date,
    viewedDate: row.viewed_date || row.viewedDate,
    durationSeconds: row.duration_seconds ?? row.durationSeconds,
    timezone: row.timezone,
    deviceType: row.device_type || row.deviceType,
    browser: row.browser,
    platform: row.platform
  };
}

function summarizeEvents(events) {
  const rows = new Map();
  events.forEach((event) => {
    const key = `${event.date}::${event.username}`;
    if (!rows.has(key)) rows.set(key, { date: event.date, username: event.username, opens: 0, closes: 0, views: 0, duration: 0 });
    const row = rows.get(key);
    if (event.type === "open") row.opens += 1;
    if (event.type === "close") {
      row.closes += 1;
      row.duration += Number(event.durationSeconds) || 0;
    }
    if (event.type === "view") row.views += 1;
  });
  return [...rows.values()];
}

function renderStatsRows(events) {
  accessStatsBody.innerHTML = "";
  const recent = summarizeEvents(events)
    .sort((a, b) => b.date.localeCompare(a.date) || a.username.localeCompare(b.username))
    .slice(0, 210);
  if (!recent.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "No activity recorded yet.";
    tr.appendChild(td);
    accessStatsBody.appendChild(tr);
    return;
  }
  recent.forEach((row) => {
    const tr = document.createElement("tr");
    [row.date, row.username, row.opens, row.closes, row.views, formatDuration(row.duration)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    });
    accessStatsBody.appendChild(tr);
  });
}

function renderEventDetails(events) {
  accessDetailsBody.innerHTML = "";
  const recent = [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 1000);
  recent.forEach((event) => {
    const tr = document.createElement("tr");
    const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(event.occurredAt));
    const label = ({ open: "Opened app", close: "Closed app", view: "Viewed journal" })[event.type] || event.type;
    const values = [
      when, event.username, label, event.viewedDate || "—",
      event.type === "close" ? formatDuration(event.durationSeconds) : "—",
      event.deviceType || "Unknown", event.browser || "Unknown", event.platform || "Unknown",
      event.timezone || "Unknown", (event.sessionId || "—").slice(0, 8)
    ];
    values.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    });
    accessDetailsBody.appendChild(tr);
  });
}

function renderStatsSummary(events) {
  const opens = events.filter((event) => event.type === "open").length;
  const closes = events.filter((event) => event.type === "close").length;
  const views = events.filter((event) => event.type === "view").length;
  const users = new Set(events.map((event) => event.username)).size;
  const openedSessions = new Set(events.filter((event) => event.type === "open").map((event) => event.sessionId));
  events.filter((event) => event.type === "close").forEach((event) => openedSessions.delete(event.sessionId));
  const duration = events.reduce((total, event) => total + (event.type === "close" ? Number(event.durationSeconds) || 0 : 0), 0);
  statsSummary.innerHTML = "";
  [
    [opens, "Sessions opened"], [closes, "Sessions closed"], [openedSessions.size, "Active/incomplete"],
    [views, "Journal views"], [users, "Users active"], [formatDuration(duration), "Total active time"]
  ].forEach(([value, label]) => {
    const card = document.createElement("div");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    card.className = "stat-card";
    strong.textContent = String(value);
    span.textContent = label;
    card.append(strong, span);
    statsSummary.appendChild(card);
  });
}

function renderAllStats(rows) {
  const events = rows.map(normalizedEvent);
  renderStatsSummary(events);
  renderStatsRows(events);
  renderEventDetails(events);
}

async function renderAccessStats() {
  renderAllStats(readLocalAccessEvents());
  statsStatus.textContent = "Loading shared stats…";
  if (dataBackend !== "supabase") {
    statsStatus.textContent = "Showing activity saved on this device.";
    return;
  }
  await flushAccessEvents();
  const since = dateOffset(todayISO(), -29);
  const { data, error } = await supabaseClient.rpc("get_journal_access_details", {
    p_project_id: APP_CONFIG.projectId,
    p_requesting_username: currentUser.username,
    p_since: since
  });
  if (error) {
    statsStatus.textContent = "Showing this device only. Run the updated Supabase SQL for shared stats.";
    return;
  }
  renderAllStats(data || []);
  statsStatus.textContent = "Shared activity across devices.";
}

function openAccountSettings() {
  if (!currentUser) return;
  signedInSummary.textContent = currentUser.role === "superuser"
    ? `Signed in as ${currentUser.username} · Superuser`
    : `Signed in as ${currentUser.username}`;
  passwordUserWrap.hidden = currentUser.role !== "superuser";
  accessStats.hidden = !canViewStats(currentUser);
  passwordUser.innerHTML = "";
  APP_USERS.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = `${user.username}${user.role === "superuser" ? " (superuser)" : ""}`;
    option.selected = user.username === currentUser.username;
    passwordUser.appendChild(option);
  });
  passwordMessage.textContent = "";
  passwordForm.reset();
  accountDialog.showModal();
  if (canViewStats(currentUser)) renderAccessStats();
}

function showJournal(user) {
  currentUser = user;
  document.body.classList.remove("is-authenticating");
  loginScreen.hidden = true;
  accountBtn.textContent = user.role === "superuser" ? `${user.username} · Superuser` : user.username;
  startAccessSession();
  if (!appStarted) {
    appStarted = true;
    startApp();
  } else {
    document.querySelectorAll(".day-block").forEach((block) => {
      setBlockLikes(block, block.commentLikedBy || []);
    });
    updateParentNoteItems();
  }
}

function showLogin() {
  currentUser = null;
  loginScreen.hidden = false;
  document.body.classList.add("is-authenticating");
  loginForm.reset();
  rememberLogin.checked = true;
  loginUsername.value = localStorage.getItem(USERNAME_STORAGE_KEY) || "";
  loginError.textContent = "";
  window.setTimeout(() => (loginUsername.value ? loginPassword : loginUsername).focus(), 0);
}

async function signIn(event) {
  event.preventDefault();
  loginError.textContent = "";
  const user = findUser(loginUsername.value);
  if (!user || !(await passwordMatches(user, loginPassword.value))) {
    loginError.textContent = "Incorrect username or password.";
    loginPassword.select();
    return;
  }

  localStorage.setItem(USERNAME_STORAGE_KEY, user.username);
  if (rememberLogin.checked) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: user.username, credentialVersion: user.credentialVersion }));
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: user.username, credentialVersion: user.credentialVersion }));
  }
  loginPassword.value = "";
  showJournal(user);
}

function restoreSignedInUser() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    const user = findUser(saved.username);
    if (!user || saved.credentialVersion !== user.credentialVersion) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }
    showJournal(user);
    return true;
  } catch {
    return false;
  }
}

function todayISO() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function updateDateNavigationState() {
  const current = entryDateInput.value || todayISO();
  todayBtn.disabled = current === todayISO();
}

function ensureCloudSession() {
  if (!supabaseClient) {
    throw new Error("Cloud storage is not connected");
  }
}

async function signedPhotoRecord(row, blob = null) {
  const { data, error } = await supabaseClient.storage
    .from(APP_CONFIG.photoBucket)
    .createSignedUrl(row.storage_path, 3600);
  if (error) throw error;
  return {
    id: row.id,
    entryId: row.entry_id,
    blockIndex: row.block_index,
    storagePath: row.storage_path,
    name: row.original_name,
    createdAt: row.created_at,
    url: data.signedUrl,
    blob
  };
}

async function savePhotoRecord(record) {
  ensureCloudSession();
  const storagePath = `shared/${record.id}.jpg`;
  const { error: uploadError } = await supabaseClient.storage
    .from(APP_CONFIG.photoBucket)
    .upload(storagePath, record.blob, {
      contentType: "image/jpeg",
      upsert: false
    });
  if (uploadError) throw uploadError;

  const row = {
    id: record.id,
    entry_id: record.entryId,
    block_index: record.blockIndex,
    storage_path: storagePath,
    original_name: record.name,
    created_at: record.createdAt
  };
  const { error: metadataError } = await supabaseClient
    .from("about_my_day_photos")
    .insert(row);
  if (metadataError) {
    await supabaseClient.storage.from(APP_CONFIG.photoBucket).remove([storagePath]);
    throw metadataError;
  }
  return { ...record, storagePath };
}

async function getPhotoRecords(entryId) {
  ensureCloudSession();
  const { data, error } = await supabaseClient
    .from("about_my_day_photos")
    .select("id, entry_id, block_index, storage_path, original_name, created_at")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return Promise.all((data || []).map((row) => signedPhotoRecord(row)));
}

async function deletePhotoRecord(id) {
  ensureCloudSession();
  const { data: row, error: readError } = await supabaseClient
    .from("about_my_day_photos")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  const { error: storageError } = await supabaseClient.storage
    .from(APP_CONFIG.photoBucket)
    .remove([row.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabaseClient
    .from("about_my_day_photos")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

async function getAllPhotoRecords() {
  ensureCloudSession();
  const { data, error } = await supabaseClient
    .from("about_my_day_photos")
    .select("id, entry_id, block_index, storage_path, original_name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return Promise.all((data || []).map(async (row) => {
    const { data: blob, error: downloadError } = await supabaseClient.storage
      .from(APP_CONFIG.photoBucket)
      .download(row.storage_path);
    if (downloadError) throw downloadError;
    return signedPhotoRecord(row, blob);
  }));
}

async function movePhotoRecords(fromEntryId, toEntryId) {
  if (!fromEntryId || fromEntryId === toEntryId) return;
  ensureCloudSession();
  const { error } = await supabaseClient
    .from("about_my_day_photos")
    .update({ entry_id: toEntryId })
    .eq("entry_id", fromEntryId);
  if (error) throw error;
}

function setStatus(message) {
  syncStatus.textContent = message;
}

function setDateNavigationDisabled(disabled) {
  previousDayBtn.disabled = disabled;
  nextDayBtn.disabled = disabled;
  todayBtn.disabled = disabled || ((entryDateInput.value || todayISO()) === todayISO());
  entryDateInput.disabled = disabled;
}

function calendarEventFor(date) {
  return PISD_CALENDAR.find((event) => date >= event.start && date <= event.end);
}

function calendarDaysBetween(fromDate, toDate) {
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function compactCalendarDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function holidayDateRange(event) {
  const start = compactCalendarDate(event.start);
  return event.end === event.start ? start : `${start}–${compactCalendarDate(event.end)}`;
}

function isMajorHoliday(event) {
  return event.kind === "holiday"
    && (event.title.toLowerCase().includes("break") || event.title === "Student & teacher holiday");
}

function updateCalendarNotice() {
  updateDateNavigationState();
  const today = todayISO();
  const holidays = PISD_CALENDAR
    .filter((event) => isMajorHoliday(event) && event.end >= today)
    .slice(0, 2);

  calendarNotice.hidden = holidays.length === 0;
  if (!holidays.length) return;

  calendarNotice.classList.add("is-closure");
  calendarNotice.classList.remove("is-early");
  calendarNoticeTitle.textContent = "Plano ISD · student & staff holidays";
  calendarNoticeText.textContent = holidays.map((event) => {
    const isHappening = today >= event.start && today <= event.end;
    const days = calendarDaysBetween(today, event.start);
    const countdown = isHappening ? "today" : `${days} ${days === 1 ? "day" : "days"}`;
    return `${event.title}: ${countdown} (${holidayDateRange(event)})`;
  }).join("  •  ");

}

async function resizePhoto(file) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const maximumSide = 1440;
  const scale = Math.min(1, maximumSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  source.close();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.82);
  });
}

function updatePhotoCounts() {
  document.querySelectorAll(".day-block").forEach((block) => {
    const total = block.querySelectorAll(".photo-item").length;
    block.querySelector(".photo-section").classList.toggle("has-photos", total > 0);
    block.querySelector(".photo-count").textContent = `${total} added`;
  });
}

function clearPhotoGalleries() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.clear();
  document.querySelectorAll(".photo-gallery").forEach((gallery) => {
    gallery.innerHTML = "";
  });
  updatePhotoCounts();
}

function renderPhotoRecord(record) {
  const block = document.querySelector(`.day-block[data-block-index="${record.blockIndex}"]`);
  if (!block) return;
  const gallery = block.querySelector(".photo-gallery");
  const figure = document.createElement("figure");
  const link = document.createElement("a");
  const image = document.createElement("img");
  const remove = document.createElement("button");
  const isObjectUrl = Boolean(record.blob);
  const url = record.url || URL.createObjectURL(record.blob);

  if (isObjectUrl) previewUrls.add(url);
  figure.className = "photo-item";
  figure.dataset.photoId = record.id;
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", "Open photo full size");
  image.src = url;
  image.alt = `Day photo ${gallery.children.length + 1}`;
  image.loading = "lazy";
  remove.type = "button";
  remove.className = "photo-remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove photo");
  remove.addEventListener("click", async () => {
    if (!confirm("Remove this photo from the day?")) return;
    await deletePhotoRecord(record.id);
    if (isObjectUrl) {
      URL.revokeObjectURL(url);
      previewUrls.delete(url);
    }
    figure.remove();
    updatePhotoCounts();
    setStatus("Photo removed");
  });

  link.appendChild(image);
  figure.append(link, remove);
  gallery.appendChild(figure);
  updatePhotoCounts();
}

async function loadPhotosForEntry(entryId) {
  clearPhotoGalleries();
  currentPhotoEntryId = entryId;
  if (!entryId) return;

  try {
    const records = await getPhotoRecords(entryId);
    if (currentPhotoEntryId !== entryId) return;
    records
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach(renderPhotoRecord);
  } catch {
    setStatus("Cloud photos could not be loaded");
  }
}

async function addSelectedPhotos(input) {
  const block = input.closest(".day-block");
  const blockIndex = Number(block.dataset.blockIndex);
  const gallery = block.querySelector(".photo-gallery");
  const files = [...input.files].filter((file) => file.type.startsWith("image/"));
  input.value = "";

  if (!childNameInput.value.trim() || !entryDateInput.value) {
    setStatus("Add the child name and date before attaching photos");
    childNameInput.focus();
    return;
  }

  const availableSlots = MAX_PHOTOS_PER_BLOCK - gallery.children.length;
  if (availableSlots <= 0) {
    setStatus(`Up to ${MAX_PHOTOS_PER_BLOCK} photos can be added to each check-in`);
    return;
  }

  const selected = files.slice(0, availableSlots);
  if (!selected.length) return;
  setStatus(`Preparing ${selected.length} ${selected.length === 1 ? "photo" : "photos"}…`);
  const saved = await persistCurrentForm();
  if (!saved) return;
  const entryId = keyForEntry(entryDateInput.value, childNameInput.value);
  currentPhotoEntryId = entryId;

  try {
    for (const file of selected) {
      const blob = await resizePhoto(file);
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        entryId,
        blockIndex,
        blob,
        name: file.name,
        createdAt: new Date().toISOString()
      };
      const savedRecord = await savePhotoRecord(record);
      renderPhotoRecord(savedRecord);
    }
    const skipped = files.length - selected.length;
    setStatus(skipped
      ? `Photos added; ${skipped} skipped because this check-in is full`
      : `✓ ${selected.length} ${selected.length === 1 ? "photo" : "photos"} added`);
  } catch (error) {
    setStatus(`Photo could not be saved to the cloud: ${error.message}`);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function keyForEntry(date, childName) {
  return `${APP_CONFIG.projectId}::${date}::${childName.trim().toLowerCase()}`;
}

function mapSupabaseRowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    childName: row.child_name,
    staffInitials: row.staff_initials,
    blocks: row.blocks,
    updatedAt: row.updated_at
  };
}

function hasSupabaseConfig() {
  return (
    APP_CONFIG.supabaseUrl !== "PASTE_SUPABASE_URL_HERE"
    && APP_CONFIG.supabaseAnonKey !== "PASTE_SUPABASE_ANON_KEY_HERE"
  );
}

async function initBackend() {
  try {
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  } catch {
    setStatus("Could not reach cloud storage. Check the internet connection and reload.");
    return false;
  }

  const { createClient } = window.supabase;
  supabaseClient = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { error } = await supabaseClient
    .from("about_my_day_entries")
    .select("id")
    .eq("project_id", APP_CONFIG.projectId)
    .limit(1);

  if (error) {
    setStatus(`Cloud setup could not be opened: ${error.message}`);
    return false;
  }

  dataBackend = "supabase";
  setStatus("Cloud connected");
  flushAccessEvents().catch(() => {});
  return true;
}

async function fetchEntries() {
  if (dataBackend !== "supabase") {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("about_my_day_entries")
    .select("id, date, child_name, staff_initials, blocks, updated_at")
    .eq("project_id", APP_CONFIG.projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    setStatus(`Cloud read failed: ${error.message}`);
    return [];
  }

  return data.map(mapSupabaseRowToEntry);
}

async function upsertEntry(entry, expectedRevision = null) {
  if (dataBackend !== "supabase") {
    throw new Error("Sign in is required before saving");
  }

  const row = {
    id: entry.id,
    project_id: APP_CONFIG.projectId,
    date: entry.date,
    child_name: entry.childName,
    staff_initials: entry.staffInitials,
    blocks: entry.blocks,
    updated_at: entry.updatedAt
  };

  const { data: existing, error: readError } = await supabaseClient
    .from("about_my_day_entries")
    .select("id, updated_at")
    .eq("project_id", APP_CONFIG.projectId)
    .eq("id", entry.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  if (existing) {
    if (!expectedRevision || expectedRevision !== existing.updated_at) {
      const conflict = new Error("This day was updated in another tab or device. Reload it before making changes.");
      conflict.code = "STALE_ENTRY";
      throw conflict;
    }

    const { data, error } = await supabaseClient
      .from("about_my_day_entries")
      .update(row)
      .eq("project_id", APP_CONFIG.projectId)
      .eq("id", entry.id)
      .eq("updated_at", existing.updated_at)
      .select("updated_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      const conflict = new Error("This day changed while it was being saved. Reload it and try again.");
      conflict.code = "STALE_ENTRY";
      throw conflict;
    }
    return data.updated_at;
  }

  const { data, error } = await supabaseClient
    .from("about_my_day_entries")
    .insert(row)
    .select("updated_at")
    .single();

  if (error) {
    const conflict = new Error(error.code === "23505"
      ? "This day was created in another tab or device. Reload it before making changes."
      : error.message);
    conflict.code = error.code === "23505" ? "STALE_ENTRY" : error.code;
    throw conflict;
  }
  return data.updated_at;
}

async function deleteEntry(entryId) {
  const photos = await getPhotoRecords(entryId);
  await Promise.all(photos.map((photo) => deletePhotoRecord(photo.id)));
  const { error } = await supabaseClient
    .from("about_my_day_entries")
    .delete()
    .eq("project_id", APP_CONFIG.projectId)
    .eq("id", entryId);
  if (error) throw new Error(error.message);
}

function autoResizeNote(textArea) {
  if (!textArea) return;
  textArea.style.height = "auto";
  textArea.style.height = `${textArea.scrollHeight}px`;
}

function encodePcmWav(chunks, sampleRate) {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + (sampleCount * 2));
  const view = new DataView(buffer);
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + (sampleCount * 2), true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  let offset = 44;
  chunks.forEach((chunk) => {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  });
  return new Blob([buffer], { type: "audio/wav" });
}

function setDictationButtonState(button, state) {
  const label = button.querySelector(".speech-to-text-label");
  button.classList.toggle("is-recording", state === "recording");
  button.disabled = state === "working";
  button.setAttribute("aria-label", state === "recording" ? "Stop voice typing" : "Start voice typing");
  button.title = state === "recording" ? "Stop and convert speech to text" : "Start voice typing";
  if (label) label.textContent = state === "recording" ? "Stop" : state === "working" ? "Working..." : "Voice";
}

function resetDictationButtons() {
  document.querySelectorAll(".speech-to-text-btn").forEach((button) => {
    button.disabled = false;
    if (!button.classList.contains("is-recording")) setDictationButtonState(button, "idle");
  });
}

async function transcribeRecording(recording) {
  const { button, chunks, sampleRate, status, textArea } = recording;
  setDictationButtonState(button, "working");
  status.textContent = "Converting speech to text...";
  const audio = encodePcmWav(chunks, sampleRate);
  if (audio.size <= 44) throw new Error("No speech was recorded. Please try again.");

  const response = await fetch(APP_CONFIG.speechToTextUrl, {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: audio
  });
  let result = {};
  try {
    result = await response.json();
  } catch {
    // The response below provides a useful generic message when the endpoint is unavailable.
  }
  if (!response.ok) throw new Error(result.error || "Voice typing is unavailable right now.");
  const transcript = String(result.transcript || "").trim();
  if (!transcript) throw new Error("I could not hear any words. Please try again.");

  textArea.value = [textArea.value.trim(), transcript].filter(Boolean).join(" ");
  textArea.dispatchEvent(new Event("input", { bubbles: true }));
  autoResizeNote(textArea);
  status.textContent = "Voice typing added. Review the text, then tap Save.";
  textArea.focus();
}

async function stopDictation() {
  const recording = activeDictation;
  if (!recording || recording.stopping) return;
  recording.stopping = true;
  clearTimeout(recording.timer);
  activeDictation = null;
  recording.processor.disconnect();
  recording.source.disconnect();
  recording.silentGain.disconnect();
  recording.stream.getTracks().forEach((track) => track.stop());
  await recording.audioContext.close();

  try {
    await transcribeRecording(recording);
  } catch (error) {
    recording.status.textContent = error.message;
    setStatus(error.message);
  } finally {
    setDictationButtonState(recording.button, "idle");
    resetDictationButtons();
  }
}

async function toggleDictation(button, container) {
  if (activeDictation?.button === button) {
    await stopDictation();
    return;
  }
  if (activeDictation) {
    activeDictation.status.textContent = "Finish the current voice note first.";
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
    const status = container.querySelector(".speech-to-text-status");
    status.textContent = "Voice typing needs a current browser and a secure HTTPS connection.";
    return;
  }

  const textArea = container.querySelector("textarea");
  const status = container.querySelector(".speech-to-text-status");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    const chunks = [];
    silentGain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    document.querySelectorAll(".speech-to-text-btn").forEach((item) => { item.disabled = item !== button; });
    setDictationButtonState(button, "recording");
    status.textContent = "Listening... tap Stop when you are finished.";
    activeDictation = {
      button, chunks, sampleRate: audioContext.sampleRate, status, textArea,
      stream, audioContext, source, processor, silentGain, stopping: false,
      timer: setTimeout(stopDictation, 55000)
    };
  } catch (error) {
    resetDictationButtons();
    status.textContent = error.name === "NotAllowedError"
      ? "Microphone access was blocked. Allow it in your browser settings and try again."
      : "The microphone could not be started. Please try again.";
  }
}

function setNoteEditState(block, isEditing) {
  const textArea = block.querySelector("textarea");
  const editButton = block.querySelector(".note-edit-btn");
  const saveButton = block.querySelector(".note-save-btn");
  if (!textArea || !editButton || !saveButton) return;

  textArea.readOnly = !isEditing;
  block.classList.toggle("is-editing-note", isEditing);
  editButton.disabled = isEditing;
  saveButton.disabled = !isEditing;
  autoResizeNote(textArea);

  if (isEditing) {
    const at = textArea.value.length;
    textArea.focus();
    textArea.setSelectionRange(at, at);
  }
}

function setMoodLockState(block, isLocked) {
  const moodFieldset = block.querySelector(".mood-row");
  const moodButton = block.querySelector(".mood-lock-btn");
  if (!moodFieldset || !moodButton) return;

  moodFieldset.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.disabled = isLocked;
  });
  block.classList.toggle("is-mood-locked", isLocked);
  moodButton.textContent = isLocked ? "Edit" : "Save";
  moodButton.setAttribute("aria-label", isLocked ? "Edit emotions" : "Save emotions");
}

function setBlockLikes(block, likedBy = []) {
  const normalizedLikes = Array.isArray(likedBy)
    ? [...new Set(likedBy.map((username) => String(username).trim()).filter(Boolean))]
    : [];
  const username = currentUser?.username || "";
  const isLikedByCurrentUser = normalizedLikes.includes(username);
  const button = block.querySelector(".reaction-btn");
  const buttonText = button.querySelector("span");
  const likedByText = block.querySelector(".comment-liked-by");

  block.commentLikedBy = normalizedLikes;
  button.classList.toggle("is-selected", isLikedByCurrentUser);
  button.setAttribute("aria-pressed", String(isLikedByCurrentUser));
  button.setAttribute("aria-label", isLikedByCurrentUser ? "Remove your like from this comment" : "Like this comment");
  buttonText.textContent = isLikedByCurrentUser ? "Unlike" : "Like";
  likedByText.textContent = normalizedLikes.length ? `Liked by ${normalizedLikes.join(", ")}` : "";
  likedByText.hidden = normalizedLikes.length === 0;
}

function createParentNoteId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `parent-note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeParentNote(note) {
  if (typeof note === "string") {
    return { id: createParentNoteId(), text: note, likedBy: [] };
  }

  const likedBy = Array.isArray(note?.likedBy)
    ? [...new Set(note.likedBy.map((username) => String(username).trim()).filter(Boolean))]
    : [];
  return {
    id: note?.id || createParentNoteId(),
    text: String(note?.text || ""),
    likedBy
  };
}

function parentNoteValues() {
  return [...parentNotesList.querySelectorAll(".parent-note-item")]
    .map((item) => ({
      id: item.dataset.noteId || createParentNoteId(),
      text: item.querySelector("textarea").value.trim(),
      likedBy: Array.isArray(item.likedBy) ? item.likedBy : []
    }))
    .filter((note) => note.text);
}

function updateParentNoteLikeState(item) {
  const button = item.querySelector(".parent-note-like");
  const buttonText = button.querySelector("span");
  const likedByText = item.querySelector(".parent-note-liked-by");
  const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
  const username = currentUser?.username || "";
  const isLikedByCurrentUser = likedBy.includes(username);

  button.classList.toggle("is-selected", isLikedByCurrentUser);
  button.setAttribute("aria-pressed", String(isLikedByCurrentUser));
  button.setAttribute("aria-label", isLikedByCurrentUser ? "Remove your like from this parent note" : "Like this parent note");
  buttonText.textContent = isLikedByCurrentUser ? "Unlike" : "Like";
  likedByText.textContent = likedBy.length ? `Liked by ${likedBy.join(", ")}` : "";
  likedByText.hidden = likedBy.length === 0;
}

function updateParentNoteItems() {
  const items = [...parentNotesList.querySelectorAll(".parent-note-item")];
  items.forEach((item, index) => {
    const title = item.querySelector(".parent-note-item-title");
    const textArea = item.querySelector("textarea");
    const count = item.querySelector(".parent-note-count");
    title.textContent = `Parent note ${index + 1}`;
    count.textContent = `${textArea.value.length} / 1000`;
    item.classList.toggle("is-empty", !textArea.value.trim());
    updateParentNoteLikeState(item);
  });
}

function setParentNoteEditState(item, isEditing) {
  const textArea = item.querySelector("textarea");
  const editButton = item.querySelector(".parent-note-edit");
  const saveButton = item.querySelector(".parent-note-save");
  textArea.readOnly = !isEditing;
  item.classList.toggle("is-editing", isEditing);
  editButton.disabled = isEditing;
  saveButton.disabled = !isEditing;
  autoResizeNote(textArea);

  if (isEditing) {
    const at = textArea.value.length;
    textArea.focus();
    textArea.setSelectionRange(at, at);
  }
}

function createParentNoteItem(note = "", { editing = false } = {}) {
  const record = normalizeParentNote(note);
  const item = document.createElement("article");
  item.className = "parent-note-item";
  item.innerHTML = `
    <div class="parent-note-item-header">
      <strong class="parent-note-item-title"></strong>
      <div class="parent-note-item-actions">
        <button type="button" class="speech-to-text-btn" aria-label="Start voice typing" title="Start voice typing"><span aria-hidden="true">&#127908;</span><span class="speech-to-text-label">Voice</span></button>
        <button type="button" class="parent-note-remove" aria-label="Remove parent note">Remove</button>
        <button type="button" class="parent-note-edit">Edit</button>
        <button type="button" class="parent-note-save">Save</button>
      </div>
    </div>
    <label class="parent-note-field">
      <span class="sr-only">Parent note</span>
      <textarea rows="3" maxlength="1000" placeholder="Write a note about today..."></textarea>
    </label>
    <span class="speech-to-text-status" aria-live="polite"></span>
    <span class="parent-note-count">0 / 1000</span>
    <div class="parent-note-social">
      <button type="button" class="parent-note-like" aria-pressed="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10.5v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3.5Zm2 10V10l3.9-6.1c.6-.9 2-.5 2 .6v4h4.1a2.5 2.5 0 0 1 2.4 3.2l-2.1 7a2.5 2.5 0 0 1-2.4 1.8H9.5Z"/></svg>
        <span>Like</span>
      </button>
      <span class="parent-note-liked-by" hidden></span>
    </div>`;
  const textArea = item.querySelector("textarea");
  item.dataset.noteId = record.id;
  item.likedBy = record.likedBy;
  textArea.value = record.text;
  parentNotesList.appendChild(item);
  updateParentNoteItems();
  setParentNoteEditState(item, editing);
  return item;
}

function renderParentNotes(notes = []) {
  parentNotesList.innerHTML = "";
  const validNotes = Array.isArray(notes)
    ? notes.filter((note) => typeof note === "string" || (note && typeof note === "object"))
    : [];
  validNotes.forEach((note) => createParentNoteItem(note));
}

async function saveBlockNote(block) {
  setNoteEditState(block, false);
  updateFormProgress();
  return persistCurrentForm({ manual: true });
}

function createBlocks() {
  blocksContainer.innerHTML = "";

  BLOCK_TITLES.forEach((title, index) => {
    const clone = blockTemplate.content.cloneNode(true);
    const article = clone.querySelector(".day-block");
    const blockTitle = clone.querySelector(".block-title");
    const badge = clone.querySelector(".badge");
    const textArea = clone.querySelector("textarea");
    const editButton = clone.querySelector(".note-edit-btn");
    const saveButton = clone.querySelector(".note-save-btn");
    blockTitle.textContent = title;
    badge.textContent = String(index + 1).padStart(2, "0");
    textArea.readOnly = true;
    if (editButton) editButton.disabled = false;
    if (saveButton) saveButton.disabled = true;
    autoResizeNote(textArea);

    const moodInputs = clone.querySelectorAll(".mood-row input");
    moodInputs.forEach((input) => {
      input.id = `${input.value}-${index}`;
      input.closest("label").setAttribute("for", input.id);
    });

    setMoodLockState(article, true);
    setBlockLikes(article);

    article.dataset.blockIndex = String(index);
    blocksContainer.appendChild(clone);
  });
}

function readCurrentForm() {
  const parentNotes = parentNoteValues();
  const blocks = [...document.querySelectorAll(".day-block")].map((block, index) => {
    const selectedMoods = [
      ...block.querySelectorAll(".mood-row input:checked")
    ].map((input) => input.value);
    const checkedActivities = [
      ...block.querySelectorAll('.activity-row input[type="checkbox"]:checked')
    ];

    return {
      title: block.querySelector(".block-title").textContent,
      mood: selectedMoods[0] || "",
      moods: selectedMoods,
      activities: checkedActivities.map((item) => item.value),
      notes: block.querySelector("textarea").value.trim(),
      commentLikedBy: Array.isArray(block.commentLikedBy) ? block.commentLikedBy : [],
      ...(index === 0 ? { parentNotes } : {}),
      speech: block.querySelector(".speech").checked,
      ot: block.querySelector(".ot").checked
    };
  });

  return {
    id: keyForEntry(entryDateInput.value, childNameInput.value),
    date: entryDateInput.value,
    childName: childNameInput.value.trim(),
    staffInitials: staffInitialsInput.value.trim().toUpperCase(),
    blocks,
    updatedAt: new Date().toISOString()
  };
}

function writeForm(entry) {
  isHydrating = true;
  clearForm(true);
  childNameInput.value = entry.childName || "";
  entryDateInput.value = entry.date || todayISO();
  activeDate = entryDateInput.value;
  staffInitialsInput.value = entry.staffInitials || "";
  const storedParentNotes = entry.blocks?.[0]?.parentNotes;
  const legacyParentNote = entry.parentNote || entry.blocks?.[0]?.dailyParentNote || "";
  renderParentNotes(Array.isArray(storedParentNotes) ? storedParentNotes : [legacyParentNote].filter(Boolean));

  const blockElements = document.querySelectorAll(".day-block");
  blockElements.forEach((element, i) => {
    const block = entry.blocks?.[i];
    if (!block) {
      return;
    }

    const legacyMood = ({ upset: "mad" })[block.mood] || block.mood;
    const moodValues = block.moods?.length ? block.moods : [legacyMood].filter(Boolean);
    element.querySelectorAll(".mood-row input").forEach((input) => {
      input.checked = moodValues.includes(input.value);
    });

    const activityChecks = element.querySelectorAll('.activity-row input[type="checkbox"]');
    activityChecks.forEach((check) => {
      check.checked = block.activities?.includes(check.value)
        || (check.value === "sports" && block.activities?.includes("movement"))
        || false;
    });

    const noteField = element.querySelector("textarea");
    noteField.value = block.notes || "";
    setBlockLikes(element, block.commentLikedBy || []);
    setNoteEditState(element, false);
    setMoodLockState(element, true);
    element.querySelector(".speech").checked = Boolean(block.speech);
    element.querySelector(".ot").checked = Boolean(block.ot);
  });

  updateFormProgress();
  updateCalendarNotice();
  const displayedEntryId = keyForEntry(entryDateInput.value, childNameInput.value);
  currentEntryId = displayedEntryId;
  currentEntryRevision = entry.id === displayedEntryId ? entry.updatedAt || null : null;
  formIsDirty = false;
  isHydrating = false;
  loadPhotosForEntry(displayedEntryId);
}

function clearForm(keepHeader = false) {
  if (!keepHeader) {
    childNameInput.value = "";
    staffInitialsInput.value = "";
  }

  entryDateInput.value = todayISO();
  activeDate = entryDateInput.value;

  document.querySelectorAll(".day-block .mood-row input").forEach((input) => {
    input.checked = false;
  });

  document.querySelectorAll('.day-block input[type="checkbox"]').forEach((check) => {
    check.checked = false;
  });

  document.querySelectorAll(".day-block textarea").forEach((textArea) => {
    textArea.value = "";
    const block = textArea.closest(".day-block");
    if (block) {
      setNoteEditState(block, false);
      setMoodLockState(block, true);
    }
  });

  renderParentNotes();
  document.querySelectorAll(".day-block").forEach((block) => setBlockLikes(block));

  clearPhotoGalleries();
  currentPhotoEntryId = null;
  currentEntryId = null;
  currentEntryRevision = null;
  formIsDirty = false;

  updateFormProgress();
  updateCalendarNotice();
}

function updateFormProgress() {
  const blocks = [...document.querySelectorAll(".day-block")];

  blocks.forEach((block) => {
    const note = block.querySelector("textarea");
    autoResizeNote(note);
    const hasContent = Boolean(
      block.querySelector(".mood-row input:checked")
      || block.querySelector('input[type="checkbox"]:checked')
      || note.value.trim()
    );
    block.classList.toggle("has-content", hasContent);

    const count = block.querySelector(".character-count");
    count.textContent = `${note.value.length} characters`;
    block.classList.toggle("has-note", Boolean(note.value.trim()));
  });

  updateParentNoteItems();

}

function fillHolidayDay(event) {
  document.querySelectorAll(".day-block").forEach((block, index) => {
    const noteField = block.querySelector("textarea");
    noteField.value = index === 0
      ? `${event.title} - ${event.description}`
      : "No school.";
    setNoteEditState(block, false);
  });
  updateFormProgress();
}

async function openDate(targetDate, { saveCurrent = true } = {}) {
  if (!targetDate || isOpeningDate) return;
  recordAccessEvent("view", { viewedDate: targetDate });
  isOpeningDate = true;
  setDateNavigationDisabled(true);
  window.clearTimeout(autoSaveTimer);
  const previousDate = activeDate;
  try {
    if (saveCurrent && previousDate && targetDate !== previousDate && formIsDirty) {
      entryDateInput.value = previousDate;
      const saved = await persistCurrentForm();
      if (!saved) {
        entryDateInput.value = previousDate;
        activeDate = previousDate;
        return;
      }
    }

    const studentName = childNameInput.value.trim() || DEFAULT_CHILD_NAME;
    const entryId = keyForEntry(targetDate, studentName);
    const entries = await fetchEntries();
    const savedEntry = entries.find((entry) => entry.id === entryId);

    if (savedEntry) {
      writeForm(savedEntry);
      setStatus("");
      return;
    }

    isHydrating = true;
    clearForm(true);
    entryDateInput.value = targetDate;
    activeDate = targetDate;
    currentEntryId = entryId;
    currentEntryRevision = null;
    await loadPhotosForEntry(entryId);
    const holiday = calendarEventFor(targetDate);
    if (holiday?.kind === "holiday") fillHolidayDay(holiday);
    updateCalendarNotice();
    isHydrating = false;

    if (holiday?.kind === "holiday") {
      await persistCurrentForm();
    } else {
      setStatus("");
    }
  } finally {
    isHydrating = false;
    isOpeningDate = false;
    setDateNavigationDisabled(false);
  }
}

function dateOffset(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

async function persistCurrentForm({ manual = false } = {}) {
  window.clearTimeout(autoSaveTimer);
  if (saveInProgress) await saveInProgress;

  const entry = readCurrentForm();

  if (!entry.childName || !entry.date) {
    setStatus("Add a name and date before saving");
    return false;
  }

  const savedVersion = formChangeVersion;
  const expectedRevision = currentEntryId === entry.id ? currentEntryRevision : null;
  const photoEntryId = currentPhotoEntryId;
  const operation = (async () => {
    try {
      const savedRevision = await upsertEntry(entry, expectedRevision);
      await movePhotoRecords(photoEntryId, entry.id);
      currentEntryId = entry.id;
      currentEntryRevision = savedRevision;
      currentPhotoEntryId = entry.id;
      if (savedVersion === formChangeVersion) formIsDirty = false;
      setStatus(manual ? "✓ Saved" : "✓ Autosaved");
      return true;
    } catch (error) {
      formIsDirty = true;
      setStatus(error.code === "STALE_ENTRY"
        ? error.message
        : "Cloud save failed — keep this page open until the connection returns");
      if (manual) alert(`Save failed: ${error.message}`);
      return false;
    }
  })();

  saveInProgress = operation;
  try {
    return await operation;
  } finally {
    if (saveInProgress === operation) saveInProgress = null;
  }
}

function scheduleAutoSave() {
  if (isHydrating) return;
  formIsDirty = true;
  formChangeVersion += 1;
  updateFormProgress();
  updateCalendarNotice();
  setStatus("Saving changes…");
  window.clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => persistCurrentForm(), 700);
}

function applyRememberedDetails() {
  childNameInput.value = DEFAULT_CHILD_NAME;
  staffInitialsInput.value = DEFAULT_STAFF_INITIALS;
  entryDateInput.value = todayISO();
  activeDate = entryDateInput.value;
}

async function copyLastDay() {
  const entries = await fetchEntries();
  const currentId = keyForEntry(entryDateInput.value, childNameInput.value);
  const previous = [...entries]
    .filter((entry) => entry.id !== currentId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];

  if (!previous) {
    setStatus("No earlier saved day is available to copy");
    return;
  }

  const header = {
    childName: childNameInput.value || previous.childName,
    staffInitials: staffInitialsInput.value || previous.staffInitials,
    date: entryDateInput.value || todayISO()
  };
  const copiedBlocks = (previous.blocks || []).map((block, index) => ({
    ...block,
    reaction: "",
    commentLikedBy: [],
    ...(index === 0 ? { parentNotes: [], dailyParentNote: "" } : {})
  }));
  writeForm({ ...previous, ...header, blocks: copiedBlocks });
  scheduleAutoSave();
  setStatus(`Copied check-ins from ${formatEntryDate(previous.date)}`);
}

function sampleEntry() {
  const sampleBlocks = [
    [["happy", "excited"], ["music"], "Arrived smiling and joined morning circle right away.", true, false],
    [["silly", "calm"], ["art", "sensory"], "Enjoyed painting and took a short sensory break before lunch.", false, true],
    [["happy", "tired"], ["sports"], "Played outside and practiced taking turns with friends.", false, false],
    [["calm"], ["music"], "Packed up independently and had a calm trip home.", false, false]
  ];

  return {
    id: keyForEntry(todayISO(), DEFAULT_CHILD_NAME),
    date: todayISO(),
    childName: DEFAULT_CHILD_NAME,
    staffInitials: DEFAULT_STAFF_INITIALS,
    updatedAt: new Date().toISOString(),
    blocks: BLOCK_TITLES.map((title, index) => ({
      title,
      mood: sampleBlocks[index][0][0],
      moods: sampleBlocks[index][0],
      activities: sampleBlocks[index][1],
      notes: sampleBlocks[index][2],
      commentLikedBy: [],
      ...(index === 0 ? { parentNotes: [
        "Sam had a great evening and was excited to talk about music today. Thank you!",
        "Please remind him that Grandma will pick him up tomorrow."
      ] } : {}),
      speech: sampleBlocks[index][3],
      ot: sampleBlocks[index][4]
    }))
  };
}

function fillSample() {
  writeForm(sampleEntry());
  setStatus("Sample loaded — review it, then save if you like");
}

function formatEntryDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function createEmotionIcon(emotion) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  const use = document.createElementNS(svgNamespace, "use");
  icon.classList.add("emotion-icon");
  icon.setAttribute("aria-hidden", "true");
  use.setAttribute("href", `#emotion-${emotion}`);
  icon.appendChild(use);
  return icon;
}

async function renderHistory() {
  const entries = await fetchEntries();
  historyList.innerHTML = "";
  childNames.innerHTML = "";

  [...new Set(entries.map((entry) => entry.childName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      childNames.appendChild(option);
    });

  const query = historySearch.value.trim().toLowerCase();
  const month = historyMonth.value;
  const filtered = entries.filter((entry) => {
    const searchable = [
      entry.date,
      entry.childName,
      entry.staffInitials,
      ...(entry.blocks || []).flatMap((block) => [
        block.title,
        block.mood,
        ...(block.moods || []),
        ...(block.activities || []),
        block.notes
      ])
    ].filter(Boolean).join(" ").toLowerCase();
    return (!query || searchable.includes(query))
      && (!month || entry.date?.startsWith(month));
  });
  historyCount.textContent = String(filtered.length);
  historyCount.title = `${filtered.length} of ${entries.length} saved days shown`;

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No past days yet. Your first day will appear here automatically.";
    historyList.appendChild(empty);
    return;
  }

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No saved days match these filters.";
    historyList.appendChild(empty);
    return;
  }

  const sorted = [...filtered].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
    || (b.updatedAt || "").localeCompare(a.updatedAt || "")
  );
  sorted.forEach((entry) => {
    const li = document.createElement("li");
    const dateBadge = document.createElement("time");
    const label = document.createElement("div");
    const name = document.createElement("strong");
    const details = document.createElement("span");
    const actions = document.createElement("div");
    const date = new Date(`${entry.date}T12:00:00`);
    const started = (entry.blocks || []).filter((block) =>
      block.mood || block.moods?.length || block.notes || block.speech || block.ot || block.activities?.length
    ).length;
    dateBadge.className = "history-date-badge";
    dateBadge.dateTime = entry.date;
    const monthLabel = document.createElement("span");
    const dayLabel = document.createElement("strong");
    monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
    dayLabel.textContent = new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(date);
    dateBadge.append(monthLabel, dayLabel);
    name.textContent = entry.childName || "Unknown";
    const savedTime = formatEntryTime(entry);
    details.textContent = [
      `${started}/${BLOCK_TITLES.length} check-ins`,
      savedTime,
      `Staff ${entry.staffInitials || "—"}`
    ].filter(Boolean).join(" · ");
    label.className = "history-copy";
    label.append(name, details);

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "history-load";
    loadBtn.textContent = "Open →";
    loadBtn.addEventListener("click", async () => {
      await openDate(entry.date);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "history-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete ${entry.childName || "saved day"} from ${formatEntryDate(entry.date)}`);
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete ${entry.childName || "this day"} from ${formatEntryDate(entry.date)}?`)) return;
      try {
        await deleteEntry(entry.id);
        if (currentPhotoEntryId === entry.id) {
          await openDate(entry.date, { saveCurrent: false });
        }
        await renderHistory();
        setStatus("Past day deleted");
      } catch (error) {
        setStatus(`Delete failed: ${error.message}`);
      }
    });

    actions.className = "history-actions";
    actions.append(loadBtn, deleteBtn);
    li.append(dateBadge, label, actions);
    historyList.appendChild(li);
  });
}

async function saveCurrentEntry() {
  if (!childNameInput.value.trim()) {
    setStatus("Please add the child name before saving");
    childNameInput.focus();
    return;
  }

  if (!entryDateInput.value) {
    setStatus("Please choose a date before saving");
    entryDateInput.focus();
    return;
  }

  await persistCurrentForm({ manual: true });
}

async function downloadJSON() {
  const entries = await fetchEntries();
  setStatus("Preparing text and photos for export…");
  const photoRecords = await getAllPhotoRecords();
  const photos = await Promise.all(photoRecords.map(async ({ blob, ...record }) => ({
    ...record,
    dataUrl: await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    })
  })));
  const exportData = { exportedAt: new Date().toISOString(), entries, photos };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `about-my-day-export-${todayISO()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus(`Exported ${entries.length} saved ${entries.length === 1 ? "day" : "days"} and ${photos.length} ${photos.length === 1 ? "photo" : "photos"}`);
}

async function printCurrentDay() {
  await persistCurrentForm({ manual: true });
  window.print();
}

function preparePrintLayout() {
  const entry = readCurrentForm();
  paperStudentName.textContent = entry.childName || DEFAULT_CHILD_NAME;
  paperEntryDate.textContent = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${entry.date}T12:00:00`));
  paperStaffInitials.textContent = entry.staffInitials || DEFAULT_STAFF_INITIALS;
  const printParentNotes = entry.blocks?.[0]?.parentNotes || [];
  paperParentNote.textContent = printParentNotes.length
    ? printParentNotes.map((note, index) => {
      const likedBy = note.likedBy?.length ? ` (Liked by ${note.likedBy.join(", ")})` : "";
      return `${index + 1}. ${note.text}${likedBy}`;
    }).join("\n")
    : "No parent note added.";
  paperRows.innerHTML = "";

  const moods = [
    { value: "happy", label: "happy" },
    { value: "sad", label: "sad" },
    { value: "silly", label: "silly" },
    { value: "mad", label: "mad" },
    { value: "calm", label: "calm" },
    { value: "excited", label: "excited" },
    { value: "tired", label: "tired" },
    { value: "worried", label: "worried" }
  ];
  const activities = [
    { value: "art", icon: "🎨", label: "art" },
    { value: "music", icon: "♫", label: "music" },
    { value: "sports", icon: "⚽", label: "sports" },
    { value: "sensory", icon: "✋", label: "sensory" }
  ];

  entry.blocks.forEach((block, index) => {
    const row = document.createElement("article");
    const timeLabel = document.createElement("div");
    const moodPanel = document.createElement("div");
    const moodTitle = document.createElement("strong");
    const moodChoices = document.createElement("div");
    const activityPanel = document.createElement("div");
    const notesPanel = document.createElement("div");
    const notesTitle = document.createElement("div");
    const noteText = document.createElement("div");
    const supports = document.createElement("div");

    row.className = "paper-row";
    timeLabel.className = "paper-time-label";
    timeLabel.textContent = block.title;
    moodPanel.className = "paper-mood-panel";
    moodTitle.textContent = "Emotions";
    moodChoices.className = "paper-mood-choices";
    const legacyMood = ({ upset: "mad" })[block.mood] || block.mood;
    const selectedMoods = new Set(block.moods?.length ? block.moods : [legacyMood].filter(Boolean));
    moods.forEach((mood) => {
      const choice = document.createElement("div");
      const face = createEmotionIcon(mood.value);
      const label = document.createElement("small");
      choice.className = `paper-mood-choice${selectedMoods.has(mood.value) ? " is-selected" : ""}`;
      label.textContent = mood.label;
      choice.append(face, label);
      moodChoices.appendChild(choice);
    });
    moodPanel.append(moodTitle, moodChoices);

    activityPanel.className = "paper-activity-panel";
    const selectedActivities = (block.activities || []).map((value) => value === "movement" ? "sports" : value);
    activities.forEach((activity) => {
      const choice = document.createElement("div");
      const icon = document.createElement("span");
      const label = document.createElement("small");
      choice.className = `paper-activity-choice${selectedActivities.includes(activity.value) ? " is-selected" : ""}`;
      icon.textContent = activity.icon;
      label.textContent = activity.label;
      choice.append(icon, label);
      activityPanel.appendChild(choice);
    });

    notesPanel.className = "paper-notes-panel";
    notesTitle.className = "paper-notes-title";
    notesTitle.textContent = "Notes:";
    noteText.className = "paper-note-text";
    const commentLikes = block.commentLikedBy?.length
      ? `\nLiked by ${block.commentLikedBy.join(", ")}`
      : "";
    noteText.textContent = `${block.notes || ""}${commentLikes}`;
    supports.className = "paper-supports";
    supports.textContent = `${block.speech ? "☒" : "☐"} speech     ${block.ot ? "☒" : "☐"} O.T.`;
    notesPanel.append(notesTitle, noteText);

    const screenPhotos = document.querySelectorAll(`.day-block[data-block-index="${index}"] .photo-item img`);
    if (screenPhotos.length) {
      const photoStrip = document.createElement("div");
      photoStrip.className = "paper-photo-strip";
      screenPhotos.forEach((photo) => {
        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = "";
        photoStrip.appendChild(image);
      });
      notesPanel.appendChild(photoStrip);
    }
    notesPanel.appendChild(supports);
    row.append(timeLabel, moodPanel, activityPanel, notesPanel);
    paperRows.appendChild(row);
  });
  paperPrintSheet.setAttribute("aria-hidden", "false");
}

function restoreScreenLayout() {
  paperPrintSheet.setAttribute("aria-hidden", "true");
}

printBtn.addEventListener("click", printCurrentDay);
addParentNoteBtn.addEventListener("click", () => {
  createParentNoteItem("", { editing: true });
  setStatus("New parent note ready to edit");
});
loginForm.addEventListener("submit", signIn);
accountBtn.addEventListener("click", openAccountSettings);
closeAccountBtn.addEventListener("click", () => accountDialog.close());
signOutBtn.addEventListener("click", async () => {
  endAccessSession();
  await persistCurrentForm();
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  accountDialog.close();
  showLogin();
});
refreshStatsBtn.addEventListener("click", renderAccessStats);
passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordMessage.textContent = "";
  if (newPassword.value.length < 6) {
    passwordMessage.textContent = "Use at least 6 characters.";
    newPassword.focus();
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordMessage.textContent = "The passwords do not match.";
    confirmPassword.select();
    return;
  }
  const targetUsername = currentUser.role === "superuser" ? passwordUser.value : currentUser.username;
  await storeChangedPassword(targetUsername, newPassword.value);
  newPassword.value = "";
  confirmPassword.value = "";
  passwordMessage.textContent = `Password changed for ${targetUsername}.`;
});
document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Show" : "Hide";
    button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });
});
previousDayBtn.addEventListener("click", () => openDate(dateOffset(activeDate, -1)));
nextDayBtn.addEventListener("click", () => openDate(dateOffset(activeDate, 1)));
todayBtn.addEventListener("click", () => openDate(todayISO()));
entryDateInput.addEventListener("change", () => openDate(entryDateInput.value));
document.querySelector(".app-shell").addEventListener("input", (event) => {
  if (event.target.matches(".parent-note-item textarea")) {
    formIsDirty = true;
    formChangeVersion += 1;
    autoResizeNote(event.target);
    updateParentNoteItems();
    setStatus("Editing parent note... tap Save when done");
    return;
  }
  if (event.target.matches(".day-block textarea")) {
    formIsDirty = true;
    formChangeVersion += 1;
    autoResizeNote(event.target);
    updateFormProgress();
    setStatus("Editing notes... tap Save on this check-in when done");
    return;
  }
  if (!event.target.matches("#entryDate")) scheduleAutoSave();
});
document.querySelector(".app-shell").addEventListener("change", (event) => {
  if (!event.target.matches(".photo-input, #entryDate")) scheduleAutoSave();
});
parentNotesList.addEventListener("click", async (event) => {
  const item = event.target.closest(".parent-note-item");
  if (!item) return;

  const dictationButton = event.target.closest(".speech-to-text-btn");
  if (dictationButton) {
    setParentNoteEditState(item, true);
    await toggleDictation(dictationButton, item);
    return;
  }

  if (event.target.closest(".parent-note-like")) {
    if (!currentUser?.username) return;
    const likedBy = new Set(Array.isArray(item.likedBy) ? item.likedBy : []);
    const wasLiked = likedBy.has(currentUser.username);
    if (wasLiked) likedBy.delete(currentUser.username);
    else likedBy.add(currentUser.username);
    item.likedBy = [...likedBy];
    updateParentNoteLikeState(item);
    formIsDirty = true;
    formChangeVersion += 1;
    const saved = await persistCurrentForm({ manual: true });
    if (saved) setStatus(wasLiked ? "✓ Like removed" : `✓ Liked by ${currentUser.username}`);
    return;
  }

  if (event.target.closest(".parent-note-edit")) {
    setParentNoteEditState(item, true);
    setStatus("Parent note unlocked for editing");
    return;
  }

  if (event.target.closest(".parent-note-remove")) {
    item.remove();
    formIsDirty = true;
    formChangeVersion += 1;
    updateParentNoteItems();
    const saved = await persistCurrentForm({ manual: true });
    if (saved) setStatus("✓ Parent note removed");
    return;
  }

  if (event.target.closest(".parent-note-save")) {
    const textArea = item.querySelector("textarea");
    if (!textArea.value.trim()) item.remove();
    else setParentNoteEditState(item, false);
    updateParentNoteItems();
    const saved = await persistCurrentForm({ manual: true });
    if (saved) setStatus("✓ Parent note saved");
  }
});
blocksContainer.addEventListener("click", async (event) => {
  const dictationButton = event.target.closest(".speech-to-text-btn");
  if (dictationButton) {
    const block = dictationButton.closest(".day-block");
    if (block) {
      setNoteEditState(block, true);
      await toggleDictation(dictationButton, block);
    }
    return;
  }

  const reactionButton = event.target.closest(".reaction-btn");
  if (reactionButton) {
    const block = reactionButton.closest(".day-block");
    if (!block || !currentUser?.username) return;
    const likedBy = new Set(Array.isArray(block.commentLikedBy) ? block.commentLikedBy : []);
    const wasLiked = likedBy.has(currentUser.username);
    if (wasLiked) likedBy.delete(currentUser.username);
    else likedBy.add(currentUser.username);
    setBlockLikes(block, [...likedBy]);
    formIsDirty = true;
    formChangeVersion += 1;
    const saved = await persistCurrentForm({ manual: true });
    if (saved) setStatus(wasLiked ? "✓ Like removed" : `✓ Comment liked by ${currentUser.username}`);
    return;
  }

  const moodButton = event.target.closest(".mood-lock-btn");
  if (moodButton) {
    const block = moodButton.closest(".day-block");
    if (!block) return;
    const isLocked = block.classList.contains("is-mood-locked");
    setMoodLockState(block, !isLocked);
    if (isLocked) {
      setStatus("Emotions ready to edit");
    } else {
      const saved = await persistCurrentForm({ manual: true });
      if (saved) setStatus("✓ Emotions saved");
    }
    return;
  }

  const editButton = event.target.closest(".note-edit-btn");
  if (editButton) {
    const block = editButton.closest(".day-block");
    if (block) {
      setNoteEditState(block, true);
      setStatus("Notes unlocked for editing");
    }
    return;
  }

  const saveButton = event.target.closest(".note-save-btn");
  if (saveButton) {
    const block = saveButton.closest(".day-block");
    if (!block) return;
    const saved = await saveBlockNote(block);
    if (saved) setStatus("✓ Note saved");
  }
});
blocksContainer.addEventListener("change", (event) => {
  if (event.target.matches(".photo-input")) addSelectedPhotos(event.target);
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCurrentEntry();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (activeDictation) stopDictation();
    persistCurrentForm();
    endAccessSession();
  } else if (currentUser) {
    startAccessSession();
  }
});
window.addEventListener("beforeprint", preparePrintLayout);
window.addEventListener("afterprint", restoreScreenLayout);
window.addEventListener("pagehide", () => {
  endAccessSession();
});
async function startApp() {
  createBlocks();
  renderParentNotes();
  applyRememberedDetails();
  updateFormProgress();
  updateCalendarNotice();
  const connected = await initBackend();
  if (!connected) return;
  if (new URLSearchParams(window.location.search).get("sample") === "1") {
    fillSample();
  } else {
    await openDate(todayISO(), { saveCurrent: false });
  }

  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }
}

if (!restoreSignedInUser()) showLogin();
