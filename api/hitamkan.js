import multer from "multer";
import axios from "axios";

const upload = multer({
    storage: multer.memoryStorage()
});

function runMiddleware(req, res, fn) {

    return new Promise((resolve, reject) => {

        fn(req, res, (result) => {

            if (result instanceof Error) {
                return reject(result);
            }

            resolve(result);
        });
    });
}

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        await runMiddleware(
            req,
            res,
            upload.single("image")
        );

        if (!req.file) {

            return res.status(400).json({
                error: "No image uploaded"
            });
        }

        const HF_TOKEN =
        process.env.HF_TOKEN;

        if (!HF_TOKEN) {

            return res.status(500).json({
                error: "HF_TOKEN not found"
            });
        }

        const imageBase64 =
        req.file.buffer.toString("base64");

        const response =
        await axios.post(

        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",

        {
            inputs:
            `
            dark brown skin tone,
            realistic human skin,
            preserve original face,
            preserve original image,
            preserve background,
            preserve clothes,
            preserve hair,
            same person,
            only skin color changes,
            realistic lighting
            `,

            image: imageBase64
        },

        {
            headers: {
                Authorization:
                `Bearer ${HF_TOKEN}`
            },

            responseType:
            "arraybuffer"
        });

        const resultBase64 =
        Buffer
        .from(response.data)
        .toString("base64");

        return res.status(200).json({

            image:
            `data:image/png;base64,${resultBase64}`

        });

    } catch (err) {

        console.log(
            err.response?.data ||
            err.message
        );

        return res.status(500).json({

            error:
            "AI processing failed"

        });
    }
                }
