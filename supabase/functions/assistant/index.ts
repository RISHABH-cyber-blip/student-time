// Deploy with: supabase functions deploy assistant

// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore
Deno.serve(async (req: any) => {
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

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

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

        // 🔥 Gemini SDK call
        const result = await model.generateContent(system);
        const response = await result.response;
        const reply = response.text() || "No response";

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