// ==========================================
// LOW-LATENCY GROQ INFERENCE ENGINE
// ==========================================
const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function transcribeAudio(audioFile) {
  const formData = new FormData();

  formData.append("file", audioFile);
  formData.append("model", "whisper-large-v3");

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return data.text;
}

export async function getResponseFromGroq(
  messages,
  model = "llama-3.1-8b-instant",
  temperature = 0.7,
  max_tokens = 70
) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        top_p: 0.9,
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Groq Gateway Error: ${response.status} - ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// --- TTS Layers ---

/**
 * Primary Layer: Groq Native TTS (Orpheus English Model)
 * Supports vocal formatting tags like: "[cheerful] Hi!" or "[gravelly whisper] Listen."
 */
/**
 * Primary Layer: Groq Native TTS (Orpheus English Model)
 * Configured specifically for a fast, mechanical robotic performance profile.
 */
async function tryGroqTTS(text) {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

  // Force a robotic tone delivery by embedding stylistic tags directly into the input stream.
  // We strip any pre-existing emotional text formatting to maintain a consistent output.
  const cleanedText = text.replace(/\[.*?\]/g, "").trim();
  const roboticPayload = `[monotone, robotic, low pitch, flat emotionless expression] ${cleanedText}`;

  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "canopylabs/orpheus-v1-english",
      voice: "troy", // 'troy' is the primary deep male voice model baseline
      input: roboticPayload,
      response_format: "wav",
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq TTS rejected: ${response.status} - ${await response.text()}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Backup Layer: Cartesia Sonic 3.5
 */
async function tryCartesiaTTS(text, voiceId = "248be419-c2ba-4367-a247-94e6d3db443b") {
  if (!CARTESIA_API_KEY) throw new Error("Cartesia Key Missing");
  
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CARTESIA_API_KEY}`,
      "Cartesia-Version": "2026-03-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-3.5",
      transcript: text,
      voice: { mode: "id", id: voiceId },
      output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 },
    }),
  });

  if (!response.ok) throw new Error(`Cartesia rejected: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Unified Audio Dispatcher with Fallback Architecture
 */
export async function generateSpeechWithFallback(text, config = {}) {
  try {
    // Attempt Groq native speech pipeline first
    return await tryGroqTTS(text, config.groqVoice);
  } catch (groqError) {
    console.warn("Groq TTS failed or rate-limited. Activating Cartesia backup tier...", groqError.message);
    try {
      return await tryCartesiaTTS(text, config.cartesiaVoiceId);
    } catch (cartesiaError) {
      throw new Error(`All voice endpoints exhausted: ${cartesiaError.message}`);
    }
  }
}
