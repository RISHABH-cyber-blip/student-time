// Deploy with: supabase functions deploy parse-timetable
// Set the secret first: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), { status: 400, headers: corsHeaders });
    }

    // @ts-ignore
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500, headers: corsHeaders });
    }

    const system = "This is a photo of a class/college timetable. Extract every class into strict JSON only — no markdown fences, no preamble. " +
      'Format: {"events":[{"day_of_week":1,"start_time":"09:00","end_time":"09:55","subject":"Software Engineering"}]}. ' +
      "day_of_week uses 0=Sunday,1=Monday,...6=Saturday. Times must be 24-hour HH:MM. Strip course codes/room numbers/teacher names from subject, keep it short." +
      "\n\nImage data is provided as a base64 string.";

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
              parts: [
                { text: system },
                {
                  inline_data: {
                    mime_type: mediaType || "image/png",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await resp.json();
    console.log("Gemini response (parse-timetable):", JSON.stringify(data));

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "AI request failed" }), { status: 500, headers: corsHeaders });
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Could not parse timetable. Try a clearer photo." }), { status: 500, headers: corsHeaders });
  }
});
