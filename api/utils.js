// ==========================================
// LOW-LATENCY GROQ INFERENCE ENGINE
// ==========================================

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
