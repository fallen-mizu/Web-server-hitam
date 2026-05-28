import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getRequestBody(req) {
    if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
        });
        req.on('error', err => reject(err));
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });

    try {
        const body = await getRequestBody(req);
        const { image } = body;

        if (!image) {
            return res.status(400).json({ error: 'Data gambar kosong.' });
        }

        // MENYURUH AI MENCARI TITIK PUSAT WAJAH SAJA (SANGAT AKURAT)
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Locate one single coordinate point [y, x] that lands exactly on the center of the anime character's facial skin (like the nose or center of the cheek). Scale the coordinates from 0 to 100 based on the image size. Return a JSON object with a single key 'center' containing this point. Example format: {\"center\": [35, 52]}. Output ONLY raw JSON."
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
        return res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        console.error("Error backend:", error);
        return res.status(500).json({ error: 'Groq gagal memproses', message: error.message });
    }
}
