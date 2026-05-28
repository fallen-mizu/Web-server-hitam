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

        const imageFile =
        files.image?.[0] || files.image;

        if (!imageFile) {

            return res.status(400).json({
                error: "No image uploaded"
            });
        }

        const imageBuffer =
        await fs.readFile(imageFile.filepath);

        const base64 =
        imageBuffer.toString("base64");

        return res.status(200).json({

            image:
            `data:image/jpeg;base64,${base64}`

        });

    } catch (err) {

        return res.status(500).json({
            error: err.message
        });
    }
    }
