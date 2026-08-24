// Deploy with: supabase functions deploy assistant

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore
serve(async (req: Request) => {
    console.log("Request received");
    const authHeader = req.headers.get("Authorization");
    console.log("Auth Header:", authHeader);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log("Body:", body);
        const { message, context } = body;

        // @ts-ignore
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!apiKey.startsWith("AIza")) {
            console.warn("GEMINI_API_KEY does not start with AIza. It might be invalid.");
        }

        const system = `You are Orbit, an embedded assistant inside a student's schedule app.
You can see a summary of the student's timetable, tasks, and goals below.
Be concise and practical. When workload is heavy, proactively suggest what to cut, shift,
or do tomorrow instead — don't just be encouraging, make a real call. When relevant,
point them to what to look up rather than teaching everything.

Student context:
${JSON.stringify(context, null, 2)}

User message:
${message}
`;

        // 🔥 Gemini API call
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: system }],
                        },
                    ],
                }),
            }
        );

        let data;
        try {
            data = await resp.json();
        } catch (e) {
            console.error("Failed to parse Gemini response:", e);
            data = { error: { message: "Invalid JSON from Gemini" } };
        }
        
        console.log("Gemini response status:", resp.status);

        if (!resp.ok) {
            console.error("Gemini API error detail:", JSON.stringify(data));
            return new Response(
                JSON.stringify({ 
                    error: `Gemini Error (${resp.status}): ${data?.error?.message || "Check your API key"}`,
                    status: resp.status,
                    code: data?.error?.status || "API_ERROR"
                }),
                { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

        return new Response(
            JSON.stringify({ reply }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (err) {
        console.error("JSON error or general error:", err);
        return new Response(
            JSON.stringify({ error: "Assistant is unavailable right now." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});