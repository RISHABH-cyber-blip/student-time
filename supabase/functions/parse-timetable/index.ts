// Deploy with: supabase functions deploy parse-timetable
// Set the secret first: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), { status: 400, headers: corsHeaders });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: imageBase64 } },
              {
                type: "text",
                text:
                  "This is a photo of a class/college timetable. Extract every class into strict JSON only — no markdown fences, no preamble. " +
                  'Format: {"events":[{"day_of_week":1,"start_time":"09:00","end_time":"09:55","subject":"Software Engineering"}]}. ' +
                  "day_of_week uses 0=Sunday,1=Monday,...6=Saturday. Times must be 24-hour HH:MM. Strip course codes/room numbers/teacher names from subject, keep it short.",
              },
            ],
          },
        ],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "AI request failed" }), { status: 500, headers: corsHeaders });
    }
    const text = (data.content || []).map((b: any) => b.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Could not parse timetable. Try a clearer photo." }), { status: 500, headers: corsHeaders });
  }
});
