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
                error: "HF_TOKEN missing"
            });
        }

        const response =
        await axios({

            method: "post",

            url:
            "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix",

            headers: {
                Authorization:
                `Bearer ${HF_TOKEN}`,
                "Content-Type":
                req.file.mimetype
            },

            data:
            req.file.buffer,

            responseType:
            "arraybuffer",

            params: {

                inputs:
                "make skin darker naturally while preserving face, hair, clothes and background"
            }
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
