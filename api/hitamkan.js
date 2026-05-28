import multer from "multer";

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
                error: "No image"
            });
        }

        return res.status(200).json({

            image:
            `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`

        });

    } catch (err) {

        return res.status(500).json({
            error: err.message
        });
    }
}
