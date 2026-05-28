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

        // MEMAKSA AI MENGIRIM TITIK POLIGON STRUKTUR KULIT SECARA DETAIL
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Act as an advanced image segmentation AI. Trace the exact perimeter of the visible skin on the anime character's face and neck. Identify 15 to 25 dense sequential landmark points [y, x] along the outline of the facial skin and neck skin to form a closed polygon mask. Scale all coordinates from 0 to 100 based on image dimensions. Return a JSON object with a single key 'points' containing the array of these coordinates. Example: {\"points\": [[20,45], [22,50], [28,55], [35,52], [32,42]]}. Output ONLY raw JSON."
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
            
