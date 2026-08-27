// Deploy with: supabase functions deploy parse-timetable
// Set the secret first: supabase secrets set GEMINI_API_KEY=AQ.your-key-here
// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
Deno.serve(async (req: any) => {
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const system = "This is a photo of a class/college timetable. Extract every class into strict JSON only — no markdown fences, no preamble. " +
      'Format: {"events":[{"day_of_week":1,"start_time":"09:00","end_time":"09:55","subject":"Software Engineering"}]}. ' +
      "day_of_week uses 0=Sunday,1=Monday,...6=Saturday. Times must be 24-hour HH:MM. Strip course codes/room numbers/teacher names from subject, keep it short." +
      "\n\nImage data is provided as a base64 string.";

    const result = await model.generateContent([
      system,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mediaType || "image/png",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("Gemini response (parse-timetable):", text);

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Could not parse timetable. Try a clearer photo." }), { status: 500, headers: corsHeaders });
  }
});
