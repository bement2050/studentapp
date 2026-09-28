const { SpeechClient } = require("@google-cloud/speech");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

let speechClient;
let translationClient;
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const MAX_TRANSLATION_CHARACTERS = 5000;
const DEFAULT_ORIGINS = [
  "https://bement2050.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

function allowedOrigins() {
  return new Set([
    ...DEFAULT_ORIGINS,
    ...String(process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)
  ]);
}

function readWavDetails(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Audio must be a WAV file.");
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  if (channels !== 1 || bitsPerSample !== 16 || sampleRate < 8000 || sampleRate > 96000) {
    throw new Error("Audio must be 16-bit mono WAV between 8 kHz and 96 kHz.");
  }
  return { sampleRate };
}

function getSpeechClient() {
  if (!speechClient) speechClient = new SpeechClient();
  return speechClient;
}

function getTranslationClient() {
  if (!translationClient) translationClient = new TranslationServiceClient();
  return translationClient;
}

function setCorsHeaders(req, res) {
  const origin = req.get("origin") || "";
  if (origin && !allowedOrigins().has(origin)) return false;
  if (origin) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  return true;
}

exports.transcribeAudio = async (req, res) => {
  if (!setCorsHeaders(req, res)) {
    res.status(403).json({ error: "This website is not allowed to use voice typing." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST to transcribe audio." });
    return;
  }

  const audio = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from([]);
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: "Recordings must be shorter than 55 seconds." });
    return;
  }

  try {
    const { sampleRate } = readWavDetails(audio);
    const [response] = await getSpeechClient().recognize({
      audio: { content: audio.toString("base64") },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: sampleRate,
        audioChannelCount: 1,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        model: "latest_long"
      }
    });
    const transcript = (response.results || [])
      .map((result) => result.alternatives?.[0]?.transcript || "")
      .filter(Boolean)
      .join(" ")
      .trim();
    res.set("Cache-Control", "no-store");
    res.status(200).json({ transcript });
  } catch (error) {
    const invalidAudio = error.message?.startsWith("Audio must");
    if (!invalidAudio) console.error("Speech recognition failed", error);
    res.status(invalidAudio ? 400 : 500).json({
      error: invalidAudio ? error.message : "Google Speech-to-Text could not process this recording."
    });
  }
};

exports.translateToAmharic = async (req, res) => {
  if (!setCorsHeaders(req, res)) {
    res.status(403).json({ error: "This website is not allowed to use translation." });
    return;
  }
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST to translate text." });
    return;
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const characterCount = [...text].length;
  if (!text) {
    res.status(400).json({ error: "Add some text before translating." });
    return;
  }
  if (characterCount > MAX_TRANSLATION_CHARACTERS) {
    res.status(413).json({ error: `Translation is limited to ${MAX_TRANSLATION_CHARACTERS.toLocaleString()} characters at a time.` });
    return;
  }

  try {
    const client = getTranslationClient();
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || await client.getProjectId();
    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: "am"
    });
    const translation = response.translations?.[0]?.translatedText?.trim() || "";
    if (!translation) throw new Error("The translation response was empty.");
    res.set("Cache-Control", "no-store");
    res.status(200).json({ translation });
  } catch (error) {
    console.error("Amharic translation failed", error);
    res.status(500).json({ error: "Google Cloud Translation could not translate this note." });
  }
};
