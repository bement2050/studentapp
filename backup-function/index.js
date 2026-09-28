"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const functions = require("@google-cloud/functions-framework");
const { Storage } = require("@google-cloud/storage");

const storage = new Storage();
const PAGE_SIZE = 1000;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.replace(/\/$/, "");
}

function snapshotPrefix(date = new Date()) {
  const iso = date.toISOString();
  return `snapshots/${iso.slice(0, 4)}/${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.replaceAll(":", "-")}`;
}

function safeStoragePath(storagePath) {
  const normalized = path.posix.normalize(String(storagePath || "").replace(/^\/+/, ""));
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe photo storage path: ${storagePath}`);
  }
  return normalized;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function supabaseRows({ baseUrl, anonKey, table, query = "" }) {
  const rows = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const end = start + PAGE_SIZE - 1;
    const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Range: `${start}-${end}`,
        "Range-Unit": "items"
      }
    });
    if (!response.ok) {
      throw new Error(`Supabase ${table} export failed (${response.status}): ${await response.text()}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function saveJson(bucket, name, value, cacheControl = "no-store") {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await bucket.file(name).save(body, {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: { cacheControl }
  });
  return { bytes: body.length, sha256: sha256(body) };
}

async function copyPhoto({ baseUrl, anonKey, photoBucket, sourcePath, destination }) {
  const encodedPath = safeStoragePath(sourcePath).split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(photoBucket)}/${encodedPath}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Photo export failed for ${sourcePath} (${response.status}): ${await response.text()}`);
  }

  const hash = crypto.createHash("sha256");
  let bytes = 0;
  const checksumStream = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  const output = destination.createWriteStream({
    resumable: false,
    contentType: response.headers.get("content-type") || "application/octet-stream",
    metadata: { cacheControl: "no-store" }
  });
  await pipeline(Readable.fromWeb(response.body), checksumStream, output);
  return { bytes, sha256: hash.digest("hex") };
}

async function createBackup({ now = new Date() } = {}) {
  const baseUrl = requiredEnvironment("SUPABASE_URL");
  const anonKey = requiredEnvironment("SUPABASE_ANON_KEY");
  const bucketName = requiredEnvironment("BACKUP_BUCKET");
  const projectId = process.env.JOURNAL_PROJECT_ID?.trim() || "sam-about-my-day";
  const photoBucket = process.env.SUPABASE_PHOTO_BUCKET?.trim() || "journal-photos";
  const bucket = storage.bucket(bucketName);
  const prefix = snapshotPrefix(now);

  const entries = await supabaseRows({
    baseUrl,
    anonKey,
    table: "about_my_day_entries",
    query: `select=*&project_id=eq.${encodeURIComponent(projectId)}&order=date.asc,id.asc`
  });
  const entryIds = new Set(entries.map((entry) => entry.id));
  const allPhotos = await supabaseRows({
    baseUrl,
    anonKey,
    table: "about_my_day_photos",
    query: "select=*&order=created_at.asc,id.asc"
  });
  const photos = allPhotos.filter((photo) => entryIds.has(photo.entry_id));

  const files = {};
  files["entries.json"] = await saveJson(bucket, `${prefix}/entries.json`, entries);
  files["photos.json"] = await saveJson(bucket, `${prefix}/photos.json`, photos);

  for (const photo of photos) {
    const sourcePath = safeStoragePath(photo.storage_path);
    const backupPath = `photos/${sourcePath}`;
    files[backupPath] = await copyPhoto({
      baseUrl,
      anonKey,
      photoBucket,
      sourcePath,
      destination: bucket.file(`${prefix}/${backupPath}`)
    });
  }

  const manifest = {
    schemaVersion: 1,
    completedAt: new Date().toISOString(),
    snapshotPrefix: prefix,
    source: { supabaseUrl: baseUrl, projectId, photoBucket },
    counts: { entries: entries.length, photos: photos.length },
    files
  };
  files["complete.json"] = await saveJson(bucket, `${prefix}/complete.json`, manifest);
  await saveJson(bucket, "latest.json", manifest, "no-cache");
  return manifest;
}

functions.http("backupJournal", async (request, response) => {
  if (request.method !== "POST") {
    response.set("Allow", "POST").status(405).json({ error: "Use POST." });
    return;
  }
  try {
    const manifest = await createBackup();
    console.log("Journal backup completed", {
      snapshotPrefix: manifest.snapshotPrefix,
      counts: manifest.counts
    });
    response.status(200).json({
      ok: true,
      snapshotPrefix: manifest.snapshotPrefix,
      counts: manifest.counts
    });
  } catch (error) {
    console.error("Journal backup failed", { message: error.message, stack: error.stack });
    response.status(500).json({ ok: false, error: "Backup failed. Check function logs." });
  }
});

module.exports = { createBackup, safeStoragePath, snapshotPrefix, supabaseRows };
