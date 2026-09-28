"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { safeStoragePath, snapshotPrefix } = require("../index");

test("snapshotPrefix creates a chronological UTC path", () => {
  assert.equal(
    snapshotPrefix(new Date("2026-09-28T18:02:03.456Z")),
    "snapshots/2026/09/28/2026-09-28T18-02-03.456Z"
  );
});

test("safeStoragePath accepts normal Supabase object paths", () => {
  assert.equal(safeStoragePath("shared/photo.jpg"), "shared/photo.jpg");
});

test("safeStoragePath rejects traversal", () => {
  assert.throws(() => safeStoragePath("../../secret"), /Unsafe photo storage path/);
});
