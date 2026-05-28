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
        const body = await request.json();
        const { image } = body; // Membaca data:image/jpeg;base64,...

        if (!image) {
          return new Response(JSON.stringify({ error: "Gambar kosong." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Konversi string Base64 menjadi data biner (Blob) yang dipahami Hugging Face
        const rawBase64 = image.split(",")[1];
        const binaryString = atob(rawBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const imageBlob = new Blob([bytes], { type: "image/jpeg" });

        // MENEMBAK MODEL ANIME SDXL DI HUGGING FACE SECARA GRATIS
        // Kamu bisa ganti nama modelnya jika ingin mencoba model anime lain
        const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
        
        const hfResponse = await fetch(modelUrl, {
          method: "POST",
          headers: {
            // Kita tidak memerlukan API Key berbayar untuk penggunaan basic inference
            "Content-Type": "image/jpeg",
          },
          body: imageBlob,
        });

        if (!hfResponse.ok) {
          throw new Error(`Hugging Face Error: ${hfResponse.status}`);
        }

        // Hugging Face langsung mengembalikan biner gambar baru hasil proses AI
        const arrayBuffer = await hfResponse.arrayBuffer();
        const outputBase64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const hasilFinal = `data:image/jpeg;base64,${outputBase64}`;

        return new Response(JSON.stringify({ editedImage: hasilFinal }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: "Hugging Face gagal", message: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
