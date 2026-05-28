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

        // PERINTAH LANGSUNG KE AI UNTUK MENGEDIT DAN MENGEMBALIKAN GAMBAR BASE64
        const response = await groq.chat.completions.create({
          model: "llama3-vision-8b-instant",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "You are an advanced image processing AI. Do not redraw, do not rebuild, and do not change the art style, the clothes, the eyes, or the white hair of the character in this image. Your ONLY task is to edit and modify the color of the visible skin (face, ears, neck) to a deep, dark, realistic exotic tan (#4A2E2B / #3D231F style) while perfectly preserving all original line art, shading, and highlights. Return the final edited image as a base64 Data URL string inside a JSON object with the key 'editedImage'. Example: {\"editedImage\": \"data:image/jpeg;base64,...\"}. Output ONLY raw valid JSON."
                },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const resultText = response.choices[0].message.content;
        return new Response(resultText, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: "Groq gagal mengedit gambar", message: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
