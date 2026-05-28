import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        const response = await groq.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Identify all bounding boxes of visible skin areas (face, neck, hands) of the anime character. Return a JSON object with a single key 'boxes' containing an array of boxes, where each box is [ymin, xmin, ymax, xmax] normalized from 0 to 100. Example: {\"boxes\": [[10, 20, 50, 60]]}. Do not return any other text."
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
        console.error(error);
        return res.status(500).json({ error: 'Gagal memproses gambar lewat Groq AI' });
    }
}
