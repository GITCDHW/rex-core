import * as utils from "../utils.js";

export const config = {
  runtime: "edge", // Runs on global low-latency servers, similar to Deno
};

export default async function handler(req) {
  // CORS configuration for API gateway routing
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userMessage, worldviewContext, searchKeyword } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ status: "FAULT", error: "Missing required payload: 'userMessage'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Query historical baseline parameters
    let historicalMemories = [];
    if (searchKeyword) {
      const { data } = await utils.searchMemories(searchKeyword);
      historicalMemories = data || [];
    } else {
      const { data } = await utils.getTopMemories(5);
      historicalMemories = data || [];
    }

    // Step 2: Assemble prompt instructions
    const compiledSystemPrompt = utils.buildSystemPrompt(
      worldviewContext || "The terminal local power reserves are volatile.",
      historicalMemories
    );

    const messageHistory = [
      { role: "system", content: compiledSystemPrompt },
      { role: "user", content: userMessage }
    ];

    // Step 3: Compute generation request to Groq gateway
    const responsePayload = await utils.getResponseFromGroq(messageHistory);

    return new Response(
      JSON.stringify({
        status: "NODE #1 ONLINE",
        reply: responsePayload
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ status: "CORE RUNTIME FAULT", error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
