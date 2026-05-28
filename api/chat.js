import { Groq } from "groq-sdk";

// Inisialisasi Groq dengan API Key dari Environment Variable Vercel
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
    // Berikan izin CORS agar frontend bisa mengakses API ini tanpa diblokir browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Data gambar kosong' });
        }

        // Kirim data ke Groq AI Vision
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Locate all bounding boxes of visible skin areas (face, neck, hands) of the anime character. Return a JSON object with a single key 'boxes' containing an array of boxes, where each box is [ymin, xmin, ymax, xmax] normalized from 0 to 100. Do not return any other text."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const resultText = response.choices[0].message.content;
        return res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        console.error("Error di dalam serverless function:", error);
        return res.status(500).json({ error: 'Groq AI gagal memproses gambar', rincian: error.message });
    }
}
