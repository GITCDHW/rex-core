import * as utils from "./utils.js";

Deno.serve(async (req) => {
  const url = new URL(req.url);

    // CORS preflight configuration for standard API access
      const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
                  "Access-Control-Allow-Methods": "POST, OPTIONS",
                    };

                      if (req.method === "OPTIONS") {
                          return new Response("ok", { headers: corsHeaders });
                            }

                              // Path Routing: Enforce endpoint matching /chat
                                if (url.pathname !== "/chat" && !url.pathname.endsWith("/chat")) {
                                    return new Response(
                                          JSON.stringify({ status: "FAULT", error: "Endpoint not found. Route targeting must hit /chat" }),
                                                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                                                    );
                                                      }

                                                        try {
                                                            const { userMessage, worldviewContext, searchKeyword } = await req.json();

                                                                if (!userMessage) {
                                                                      return new Response(
                                                                              JSON.stringify({ status: "FAULT", error: "Missing required string payload: 'userMessage'" }),
                                                                                      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                                                                                            );
                                                                                                }

                                                                                                    // Step 1: Contextual long-term memory scanning
                                                                                                        let historicalMemories = [];
                                                                                                            if (searchKeyword) {
                                                                                                                  const { data } = await utils.searchMemories(searchKeyword);
                                                                                                                        historicalMemories = data || [];
                                                                                                                            } else {
                                                                                                                                  const { data } = await utils.getTopMemories(5);
                                                                                                                                        historicalMemories = data || [];
                                                                                                                                            }

                                                                                                                                                // Step 2: Assemble localized prompt matrix
                                                                                                                                                    const compiledSystemPrompt = utils.buildSystemPrompt(
                                                                                                                                                          worldviewContext || "The terminal local power reserves are volatile.",
                                                                                                                                                                historicalMemories
                                                                                                                                                                    );

                                                                                                                                                                        const messageHistory = [
                                                                                                                                                                              { role: "system", content: compiledSystemPrompt },
                                                                                                                                                                                    { role: "user", content: userMessage }
                                                                                                                                                                                        ];

                                                                                                                                                                                            // Step 3: Dispatch pipeline sequence to Groq
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
                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                  