const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const functionSource = source.match(/async function upsertEntry[\s\S]*?\r?\n}\r?\n\r?\nasync function deleteEntry/);
assert.ok(functionSource, "upsertEntry should be present in app.js");

function loadUpsert(client) {
  return new Function(
    "supabaseClient",
    "const dataBackend = 'supabase'; const APP_CONFIG = { projectId: 'test-project' };\n"
      + functionSource[0].replace(/\r?\n\r?\nasync function deleteEntry$/, "")
      + "\nreturn upsertEntry;"
  )(client);
}

function mockClient({ existing = null, updated = null, inserted = null, insertError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const state = { action: null, table, filters: [] };
      const query = {
        select() {
          if (!state.action) state.action = "read";
          return query;
        },
        update(row) {
          state.action = "update";
          state.row = row;
          calls.push(state);
          return query;
        },
        insert(row) {
          state.action = "insert";
          state.row = row;
          calls.push(state);
          return query;
        },
        eq(column, value) {
          state.filters.push([column, value]);
          return query;
        },
        maybeSingle() {
          if (state.action === "read") return Promise.resolve({ data: existing, error: null });
          return Promise.resolve({ data: updated, error: null });
        },
        single() {
          return Promise.resolve({ data: inserted, error: insertError });
        }
      };
      return query;
    }
  };
}

const entry = {
  id: "2026-09-15-sammy",
  date: "2026-09-15",
  childName: "Sammy",
  staffInitials: "JK",
  blocks: [],
  updatedAt: "2026-09-15T15:01:00.000Z"
};

(async () => {
  const revision = "2026-09-15T15:00:00.000Z";
  const updateClient = mockClient({
    existing: { id: entry.id, updated_at: revision },
    updated: { updated_at: entry.updatedAt }
  });
  assert.equal(await loadUpsert(updateClient)(entry, revision), entry.updatedAt);
  assert.equal(updateClient.calls.filter((call) => call.action === "update").length, 1);

  const staleClient = mockClient({ existing: { id: entry.id, updated_at: revision } });
  await assert.rejects(loadUpsert(staleClient)(entry, "2026-09-15T14:59:00.000Z"), (error) => {
    assert.equal(error.code, "STALE_ENTRY");
    return true;
  });
  assert.equal(staleClient.calls.filter((call) => call.action === "update").length, 0);

  const insertClient = mockClient({ inserted: { updated_at: entry.updatedAt } });
  assert.equal(await loadUpsert(insertClient)(entry), entry.updatedAt);
  assert.equal(insertClient.calls.filter((call) => call.action === "insert").length, 1);

  const duplicateClient = mockClient({ insertError: { code: "23505", message: "duplicate" } });
  await assert.rejects(loadUpsert(duplicateClient)(entry), (error) => {
    assert.equal(error.code, "STALE_ENTRY");
    return true;
  });

  console.log("upsertEntry concurrency tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
