import { Groq } from "@groq/groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body; // Base64 Image string dari frontend

        // Kirim gambar ke Groq AI Vision untuk mendeteksi koordinat kulit waifu
        const response = await groq.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Locate all visible skin areas (face, neck, hands, legs) of the anime character in this image. Return ONLY a JSON array of bounding boxes in the format: [[ymin, xmin, ymax, xmax]]. Normalized coordinates between 0 and 100. Do not write any explanations, just the JSON."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image // Mengirim base64 data url
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
