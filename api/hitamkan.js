import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";

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

        const API_KEY =
        process.env.STABILITY_API_KEY;

        if (!API_KEY) {

            return res.status(500).json({
                error: "Missing STABILITY_API_KEY"
            });
        }

        // resize agar support SDXL
        const resizedBuffer =
        await sharp(req.file.buffer)

        .resize(1024, 1024)

        .png()

        .toBuffer();

        const formData =
        new FormData();

        formData.append(
            "image",
            resizedBuffer,
            {
                filename: "image.png"
            }
        );

        formData.append(
            "prompt",
            `
            darker brown skin tone,
            realistic human skin,
            preserve original face,
            preserve clothes,
            preserve background,
            preserve hairstyle,
            same person,
            only skin color changes
            `
        );

        formData.append(
            "search_prompt",
            "skin"
        );

        const response =
        await axios.post(

        "https://api.stability.ai/v2beta/stable-image/edit/search-and-replace",

        formData,

        {
            headers: {
                Authorization:
                `Bearer ${API_KEY}`,

                Accept:
                "image/*",

                ...formData.getHeaders()
            },

            responseType:
            "arraybuffer"
        });

        const base64 =
        Buffer
        .from(response.data)
        .toString("base64");

        return res.status(200).json({

            image:
            `data:image/png;base64,${base64}`

        });

    } catch (err) {

        console.log(
            err.response?.data?.toString() ||
            err.message
        );

        return res.status(500).json({

            error:
            err.response?.data?.toString() ||
            err.message

        });
    }
                }
