const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const allowlistSource = source.match(/const PARENT_NOTE_AUTHORS = new Set\([^;]+;/)?.[0];
const permissionSource = source.match(/function canSubmitParentNote[\s\S]*?\n}/)?.[0];

assert.ok(allowlistSource, "parent-note author allowlist should be present");
assert.ok(permissionSource, "parent-note permission function should be present");

const canSubmit = new Function(
  `${allowlistSource}\nlet currentUser = null;\n${permissionSource}\nreturn canSubmitParentNote;`
)();

assert.equal(canSubmit({ username: "Amamo" }), true);
assert.equal(canSubmit({ username: "BAlemayehu" }), true);
assert.equal(canSubmit({ username: "amamo" }), true, "username matching should be case-insensitive");
assert.equal(canSubmit({ username: "JKarim" }), false);
assert.equal(canSubmit({ username: "SGebreyes" }), false);
assert.equal(canSubmit(null), false);

const guardCount = (source.match(/requireParentNotePermission\(\)/g) || []).length;
assert.ok(guardCount >= 7, "all parent-note mutation controls should enforce the permission check");

console.log("parent-note permission tests passed");
