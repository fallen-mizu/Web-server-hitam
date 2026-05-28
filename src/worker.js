export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Header CORS agar tidak diblokir oleh browser
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Tangani rute POST ke /api/chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const { image } = body; // Menerima data:image/jpeg;base64,...

        if (!image) {
          return new Response(JSON.stringify({ error: "Gambar tidak ditemukan." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Segmind membutuhkan raw Base64 tanpa prefix "data:image/...;base64,"
        const rawBase64 = image.split(",")[1];

        // Lakukan request langsung ke endpoint SDXL Image-to-Image milik Segmind
        const segmindResponse = await fetch("https://api.segmind.com/v1/sdxl-img2img", {
          method: "POST",
          headers: {
            "x-api-key": env.SEGMIND_API_KEY, // Mengambil API Key dari Environment Variables Cloudflare
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "image": rawBase64,
            "prompt": "anime character, flawless very deep dark exotic tanned skin, smooth rich dark skin tone, beautiful highlights, highly detailed shading, masterpiece, official art",
            "negative_prompt": "white skin, pale skin, bright skin, sunburn, red skin, deformed face, changed clothes, altered hair color, blurry, low quality",
            "samples": 1,
            "scheduler": "UniPC",
            "num_inference_steps": 25,
            "guidance_scale": 7.5,
            "strength": 0.32, // KUNCI UTAMA: 0.32 berarti AI hanya mengubah warna kulit tanpa mengubah bentuk mata/baju/rambut waifu
            "base64": true    // Meminta Segmind mengembalikan hasil dalam format Base64 langsung
          }),
        });

        if (!segmindResponse.ok) {
          const errText = await segmindResponse.text();
          throw new Error(`Segmind API Error: ${segmindResponse.status} - ${errText}`);
        }

        const segmindData = await segmindResponse.json();
        
        // Segmind mengembalikan data berupa biner gambar dalam bentuk string Base64 langsung
        const hasilBase64 = `data:image/jpeg;base64,${segmindData.image}`;

        return new Response(JSON.stringify({ editedImage: hasilBase64 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: "Gagal memproses gambar lewat Segmind", message: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sajikan file statis (index.html, script.js)
    return env.ASSETS.fetch(request);
  },
};
          
