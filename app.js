const MAX_PHOTOS_PER_BLOCK = 8;
const DEFAULT_CHILD_NAME = "Sammy";
const DEFAULT_STAFF_INITIALS = "JK";
const BLOCK_TITLES = [
  "Morning",
  "Afternoon"
];

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
  photoBucket: "journal-photos"
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
const completionText = document.getElementById("completionText");
const progressBar = document.getElementById("progressBar");
const nextClosure = document.getElementById("nextClosure");
const printBtn = document.getElementById("printBtn");
const paperPrintSheet = document.getElementById("paperPrintSheet");
const paperStudentName = document.getElementById("paperStudentName");
const paperEntryDate = document.getElementById("paperEntryDate");
const paperStaffInitials = document.getElementById("paperStaffInitials");
const paperRows = document.getElementById("paperRows");

const clearTodayBtn = document.getElementById("clearTodayBtn");

const blockTemplate = document.getElementById("blockTemplate");

let dataBackend = "initializing";
let supabaseClient = null;
let autoSaveTimer = null;
let isHydrating = false;
let currentPhotoEntryId = null;
let activeDate = todayISO();
const previewUrls = new Set();

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

function calendarEventFor(date) {
  return PISD_CALENDAR.find((event) => date >= event.start && date <= event.end);
}

function shortDate(dateString) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
    .format(new Date(`${dateString}T12:00:00`));
}

function updateCalendarNotice() {
  const selectedDate = entryDateInput.value || todayISO();
  updateDateNavigationState();
  const event = calendarEventFor(selectedDate);
  calendarNotice.classList.toggle("is-closure", event?.kind === "holiday");
  calendarNotice.classList.toggle("is-early", event?.kind === "early");

  if (event) {
    calendarNoticeTitle.textContent = event.title;
    calendarNoticeText.textContent = event.description;
  } else {
    const upcoming = PISD_CALENDAR.find((item) =>
      item.kind === "holiday" && item.end >= todayISO()
    );
    if (upcoming) {
      const start = shortDate(upcoming.start);
      const end = upcoming.end !== upcoming.start ? `–${shortDate(upcoming.end)}` : "";
      const daysAway = Math.max(0, Math.ceil(
        (new Date(`${upcoming.start}T12:00:00`) - new Date(`${todayISO()}T12:00:00`)) / 86_400_000
      ));
      calendarNoticeTitle.textContent = `Upcoming: ${upcoming.title}`;
      calendarNoticeText.textContent = `${start}${end} · ${daysAway === 0 ? "today" : `in ${daysAway} days`}`;
    } else {
      calendarNoticeTitle.textContent = "Plano ISD calendar";
      calendarNoticeText.textContent = "No more closures are listed for this school year.";
    }
  }

  const upcoming = PISD_CALENDAR.find((item) => item.kind !== "school" && item.end >= todayISO());
  nextClosure.textContent = upcoming
    ? `Next calendar note: ${upcoming.title} · ${shortDate(upcoming.start)}`
    : "2026–27 Plano ISD calendar loaded";
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
    block.querySelector(".photo-count").textContent =
      `${total} added · saved securely in the cloud`;
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
  await persistCurrentForm();
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
  setStatus("● Connected to shared cloud storage");
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

async function upsertEntry(entry) {
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

  const { error } = await supabaseClient
    .from("about_my_day_entries")
    .upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
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

    article.dataset.blockIndex = String(index);
    blocksContainer.appendChild(clone);
  });
}

function readCurrentForm() {
  const blocks = [...document.querySelectorAll(".day-block")].map((block) => {
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
    setNoteEditState(element, false);
    element.querySelector(".speech").checked = Boolean(block.speech);
    element.querySelector(".ot").checked = Boolean(block.ot);
  });

  updateFormProgress();
  updateCalendarNotice();
  isHydrating = false;
  loadPhotosForEntry(keyForEntry(entryDateInput.value, childNameInput.value));
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
    if (block) setNoteEditState(block, false);
  });

  clearPhotoGalleries();
  currentPhotoEntryId = null;

  updateFormProgress();
  updateCalendarNotice();
}

function updateFormProgress() {
  const blocks = [...document.querySelectorAll(".day-block")];
  let started = 0;

  blocks.forEach((block) => {
    const note = block.querySelector("textarea");
    autoResizeNote(note);
    const hasContent = Boolean(
      block.querySelector(".mood-row input:checked")
      || block.querySelector('input[type="checkbox"]:checked')
      || note.value.trim()
    );
    block.classList.toggle("has-content", hasContent);
    if (hasContent) started += 1;

    const count = block.querySelector(".character-count");
    count.textContent = `${note.value.length} characters`;
  });

  completionText.textContent = `${started} of ${blocks.length} check-ins started`;
  progressBar.style.width = `${blocks.length ? (started / blocks.length) * 100 : 0}%`;
}

function formHasMeaningfulContent() {
  return [...document.querySelectorAll(".day-block")].some((block) =>
    block.querySelector(".mood-row input:checked")
    || block.querySelector('input[type="checkbox"]:checked')
    || block.querySelector("textarea").value.trim()
    || block.querySelector(".photo-item")
  );
}

function fillHolidayDay(event) {
  document.querySelectorAll(".day-block").forEach((block, index) => {
    const noteField = block.querySelector("textarea");
    noteField.value = index === 0
      ? `${event.title} - ${event.description}`
      : `No school - ${event.title}.`;
    setNoteEditState(block, false);
  });
  updateFormProgress();
}

async function openDate(targetDate, { saveCurrent = true } = {}) {
  if (!targetDate) return;
  window.clearTimeout(autoSaveTimer);
  const previousDate = activeDate;

  if (saveCurrent && previousDate && targetDate !== previousDate && formHasMeaningfulContent()) {
    entryDateInput.value = previousDate;
    await persistCurrentForm();
  }

  const studentName = childNameInput.value.trim() || DEFAULT_CHILD_NAME;
  const entryId = keyForEntry(targetDate, studentName);
  const entries = await fetchEntries();
  const savedEntry = entries.find((entry) => entry.id === entryId);

  if (savedEntry) {
    writeForm(savedEntry);
    setStatus(`Opened ${formatEntryDate(targetDate)}`);
    return;
  }

  isHydrating = true;
  clearForm(true);
  entryDateInput.value = targetDate;
  activeDate = targetDate;
  await loadPhotosForEntry(entryId);
  const holiday = calendarEventFor(targetDate);
  if (holiday?.kind === "holiday") fillHolidayDay(holiday);
  updateCalendarNotice();
  isHydrating = false;

  if (holiday?.kind === "holiday") {
    await persistCurrentForm();
    setStatus(`${holiday.title} filled automatically - no school`);
  } else {
    setStatus(`No saved entry for ${formatEntryDate(targetDate)} - ready to add`);
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
  const entry = readCurrentForm();

  if (!entry.childName || !entry.date) {
    setStatus("Add a name and date before saving");
    return false;
  }

  try {
    await upsertEntry(entry);
    await movePhotoRecords(currentPhotoEntryId, entry.id);
    currentPhotoEntryId = entry.id;
    setStatus(`${manual ? "✓ Saved" : "✓ Autosaved"} to shared cloud storage`);
    return true;
  } catch (error) {
    setStatus("Cloud save failed — keep this page open until the connection returns");
    if (manual) alert(`Save failed: ${error.message}`);
    return false;
  }
}

function scheduleAutoSave() {
  if (isHydrating) return;
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

async function clearToday() {
  const today = todayISO();
  const studentName = childNameInput.value.trim() || DEFAULT_CHILD_NAME;
  const entryId = keyForEntry(today, studentName);
  const ok = confirm(`Clear today's entry for ${studentName}? Check-ins and photos for today will be removed.`);
  if (!ok) return;

  try {
    window.clearTimeout(autoSaveTimer);
    await deleteEntry(entryId);
    clearForm(false);
    childNameInput.value = DEFAULT_CHILD_NAME;
    staffInitialsInput.value = DEFAULT_STAFF_INITIALS;
    entryDateInput.value = today;
    setStatus("Today cleared — past days were not changed");
  } catch (error) {
    setStatus(`Could not clear today: ${error.message}`);
  }
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
  writeForm({ ...previous, ...header });
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
          newDay();
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
  paperRows.innerHTML = "";

  const moods = [
    { value: "happy", face: "😀", label: "happy" },
    { value: "sad", face: "😢", label: "sad" },
    { value: "silly", face: "😜", label: "silly" },
    { value: "mad", face: "😠", label: "mad" },
    { value: "calm", face: "😌", label: "calm" },
    { value: "excited", face: "🤩", label: "excited" },
    { value: "tired", face: "😴", label: "tired" },
    { value: "worried", face: "😟", label: "worried" }
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
      const face = document.createElement("span");
      const label = document.createElement("small");
      choice.className = `paper-mood-choice${selectedMoods.has(mood.value) ? " is-selected" : ""}`;
      face.textContent = mood.face;
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
    notesTitle.textContent = "Notes about today:";
    noteText.className = "paper-note-text";
    noteText.textContent = block.notes || "";
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

clearTodayBtn.addEventListener("click", clearToday);
printBtn.addEventListener("click", printCurrentDay);
previousDayBtn.addEventListener("click", () => openDate(dateOffset(activeDate, -1)));
nextDayBtn.addEventListener("click", () => openDate(dateOffset(activeDate, 1)));
todayBtn.addEventListener("click", () => openDate(todayISO()));
entryDateInput.addEventListener("change", () => openDate(entryDateInput.value));
document.querySelector(".app-shell").addEventListener("input", (event) => {
  if (event.target.matches(".day-block textarea")) {
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
blocksContainer.addEventListener("click", async (event) => {
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
window.addEventListener("beforeprint", preparePrintLayout);
window.addEventListener("afterprint", restoreScreenLayout);
async function startApp() {
  createBlocks();
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

startApp();
