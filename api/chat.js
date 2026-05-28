import { Groq } from "groq-sdk";

// Inisialisasi Groq dengan API Key dari environment variable
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
    // Set header CORS agar tidak diblokir browser ponsel
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

        // MENGGUNAKAN MODEL VISION RESMI GROQ: llama3-vision-8b-instant
        const response = await groq.chat.completions.create({
            model: "llama3-vision-8b-instant",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Locate the continuous bounding box area of the anime character's visible facial skin and neck skin. Return a JSON object with a single key 'box' containing the coordinates [ymin, xmin, ymax, xmax] scaled from 0 to 100. Example format: {\"box\": [20, 35, 65, 70]}. Output ONLY raw valid JSON, no markdown, no explanation."
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
        console.error("Error pada Groq Vision Backend:", error);
        return res.status(500).json({ error: 'Groq Vision gagal memproses gambar', message: error.message });
    }
}
