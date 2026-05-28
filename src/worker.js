import { Groq } from "groq-sdk";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const groq = new Groq({ apiKey: env.GROQ_API_KEY });
        const body = await request.json();
        const { image } = body;

        if (!image) {
          return new Response(JSON.stringify({ error: "Data gambar kosong." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response = await groq.chat.completions.create({
          model: "llama3-vision-8b-instant",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Locate the wide bounding box area covering the anime character's face, ears, and neck skin. Return a JSON object with a single key 'box' containing the coordinates [ymin, xmin, ymax, xmax] scaled from 0 to 100. Example: {\"box\": [15, 20, 85, 80]}. Output ONLY raw valid JSON."
                },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const resultText = response.choices[0].message.content;
        return new Response(resultText, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: "Groq gagal", message: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
                                           
