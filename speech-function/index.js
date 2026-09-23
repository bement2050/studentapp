const { SpeechClient } = require("@google-cloud/speech");

let speechClient;
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
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

exports.transcribeAudio = async (req, res) => {
  const origin = req.get("origin") || "";
  if (origin && !allowedOrigins().has(origin)) {
    res.status(403).json({ error: "This website is not allowed to use voice typing." });
    return;
  }
  if (origin) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

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
