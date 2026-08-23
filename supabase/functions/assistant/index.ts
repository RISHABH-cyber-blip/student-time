// Deploy with: supabase functions deploy assistant

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
serve(async (req: Request) => {
    console.log("Request received");

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
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

        const data = await resp.json();
        console.log("Gemini response:", JSON.stringify(data));

        if (!resp.ok) {
            return new Response(
                JSON.stringify({ error: data?.error?.message || "Gemini failed" }),
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