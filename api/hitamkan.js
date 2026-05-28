import multer from "multer";
import axios from "axios";
import FormData from "form-data";

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

        const formData =
        new FormData();

        formData.append(
            "init_image",
            req.file.buffer,
            {
                filename: "image.png"
            }
        );

        formData.append(
            "image_strength",
            "0.35"
        );

        formData.append(
            "text_prompts[0][text]",
            "dark brown skin tone, preserve face, preserve clothes, preserve background, realistic human skin"
        );

        const response =
        await axios.post(

        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image",

        formData,

        {
            headers: {
                ...formData.getHeaders(),

                Authorization:
                `Bearer ${API_KEY}`,

                Accept:
                "application/json"
            }
        });

        const image =
        response.data
        .artifacts?.[0]?.base64;

        if (!image) {

            return res.status(500).json({
                error: "No image generated"
            });
        }

        return res.status(200).json({

            image:
            `data:image/png;base64,${image}`

        });

    } catch (err) {

        console.log(
            err.response?.data ||
            err.message
        );

        return res.status(500).json({

            error:
            err.response?.data?.message ||
            err.message

        });
    }
}
