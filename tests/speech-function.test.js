const assert = require("node:assert/strict");
const { transcribeAudio, translateToAmharic } = require("../speech-function");

function mockExchange({ method = "POST", origin = "https://bement2050.github.io", rawBody = Buffer.alloc(0), body } = {}) {
  const response = { headers: {}, statusCode: null, body: null };
  const req = {
    method,
    rawBody,
    body,
    get(name) {
      return name.toLowerCase() === "origin" ? origin : "";
    }
  };
  const res = {
    set(name, value) {
      response.headers[name] = value;
      return res;
    },
    status(code) {
      response.statusCode = code;
      return res;
    },
    json(body) {
      response.body = body;
      return res;
    },
    send(body) {
      response.body = body;
      return res;
    }
  };
  return { req, res, response };
}

(async () => {
  const preflight = mockExchange({ method: "OPTIONS" });
  await transcribeAudio(preflight.req, preflight.res);
  assert.equal(preflight.response.statusCode, 204);
  assert.equal(preflight.response.headers["Access-Control-Allow-Origin"], "https://bement2050.github.io");

  const forbidden = mockExchange({ origin: "https://example.com" });
  await transcribeAudio(forbidden.req, forbidden.res);
  assert.equal(forbidden.response.statusCode, 403);

  const empty = mockExchange();
  await transcribeAudio(empty.req, empty.res);
  assert.equal(empty.response.statusCode, 413);

  const invalid = mockExchange({ rawBody: Buffer.alloc(44) });
  await transcribeAudio(invalid.req, invalid.res);
  assert.equal(invalid.response.statusCode, 400);
  assert.match(invalid.response.body.error, /WAV/);

  const translationPreflight = mockExchange({ method: "OPTIONS" });
  await translateToAmharic(translationPreflight.req, translationPreflight.res);
  assert.equal(translationPreflight.response.statusCode, 204);

  const forbiddenTranslation = mockExchange({ origin: "https://example.com", body: { text: "Hello" } });
  await translateToAmharic(forbiddenTranslation.req, forbiddenTranslation.res);
  assert.equal(forbiddenTranslation.response.statusCode, 403);

  const emptyTranslation = mockExchange({ body: { text: "   " } });
  await translateToAmharic(emptyTranslation.req, emptyTranslation.res);
  assert.equal(emptyTranslation.response.statusCode, 400);

  const oversizedTranslation = mockExchange({ body: { text: "a".repeat(5001) } });
  await translateToAmharic(oversizedTranslation.req, oversizedTranslation.res);
  assert.equal(oversizedTranslation.response.statusCode, 413);

  console.log("speech and translation function validation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
