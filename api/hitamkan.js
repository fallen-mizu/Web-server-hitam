import axios from "axios";
import formidable from "formidable";
import fs from "fs-extra";

export const config = {
    api: {
        bodyParser: false,
    },
};

function parseForm(req) {

    return new Promise((resolve, reject) => {

        const form = formidable({
            multiples: false,
            keepExtensions: true,
        });

        form.parse(req, (err, fields, files) => {

            if (err) {
                reject(err);
                return;
            }

            resolve({ fields, files });
        });
    });
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { files } = await parseForm(req);

        const imageFile = files.image?.[0] || files.image;

        if (!imageFile) {
            return res.status(400).json({
                error: "Image not found"
            });
        }

        const imageBuffer = await fs.readFile(imageFile.filepath);

        const base64 = imageBuffer.toString("base64");

        const prompt = `
        darker brown skin tone,
        realistic human skin,
        preserve original face,
        preserve original image,
        preserve background,
        preserve clothes,
        preserve hair,
        same person,
        only skin color changes,
        realistic lighting
        `;

        const response = await axios.post(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                inputs: prompt,
                image: base64
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`
                responseType: "arraybuffer"
            }
        );

        const resultBase64 = Buffer.from(response.data).toString("base64");

        return res.status(200).json({
            image: `data:image/png;base64,${resultBase64}`
        });

    } catch (err) {

        console.log(err.response?.data || err.message);

        return res.status(500).json({
            error: "AI processing failed"
        });
    }
}
