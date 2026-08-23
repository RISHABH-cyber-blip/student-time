// Deploy with: supabase functions deploy assistant
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message, context } = await req.json();

    const system = `You are Orbit, an embedded assistant inside a student's schedule app.
You can see a summary of the student's timetable, tasks, and goals below.
Be concise and practical. When workload is heavy, proactively suggest what to cut, shift,
or do tomorrow instead — don't just be encouraging, make a real call. When relevant,
point them to what to look up (a doc, a concept, a next step) rather than teaching the
whole thing yourself. Never suggest cutting sleep below 6 hours or skipping meals.

Student context:
${JSON.stringify(context, null, 2)}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "AI request failed" }), { status: 500, headers: corsHeaders });
    }
    const text = (data.content || []).map((b: any) => b.text || "").join("\n");
    return new Response(JSON.stringify({ reply: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Assistant is unavailable right now." }), { status: 500, headers: corsHeaders });
  }
});
