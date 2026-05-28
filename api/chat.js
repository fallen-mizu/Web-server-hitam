import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fungsi pembantu untuk membaca data body yang dikirim oleh frontend
async function getRequestBody(req) {
    if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', err => reject(err));
    });
}

export default async function handler(req, res) {
    // Pengaturan Header CORS agar tidak diblokir oleh browser ponsel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan' });
    }

    try {
        // Ambil data gambar menggunakan fungsi pembantu yang aman
        const body = await getRequestBody(req);
        const { image } = body;

        if (!image) {
            return res.status(400).json({ error: 'Request gagal: Data gambar kosong atau tidak terbaca.' });
        }

        // Kirim request analisis gambar ke Groq AI Vision
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Locate all bounding boxes of visible skin areas (face, neck, hands) of the anime character. Return a JSON object with a single key 'boxes' containing an array of boxes, where each box is [ymin, xmin, ymax, xmax] normalized from 0 to 100. Example format: {\"boxes\": [[15, 20, 60, 70]]}. Do not output any markdown or explanation text outside the JSON object."
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
        console.error("Error pada serverless function:", error);
        return res.status(500).json({ 
            error: 'Groq AI gagal memproses gambar', 
            message: error.message 
        });
    }
}
    
