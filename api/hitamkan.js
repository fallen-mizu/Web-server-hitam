import multer from "multer";
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

        const image =
        sharp(req.file.buffer);

        const {
            data,
            info
        } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

        for (
            let i = 0;
            i < data.length;
            i += info.channels
        ) {

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // deteksi warna kulit anime/manusia
            const isSkin = (

                r > 95 &&
                g > 40 &&
                b > 20 &&

                r > g &&
                r > b &&

                Math.abs(r - g) > 15
            );

            if (isSkin) {

                // hitamkan kulit
                data[i] =
                Math.max(0, r * 0.65);

                data[i + 1] =
                Math.max(0, g * 0.65);

                data[i + 2] =
                Math.max(0, b * 0.65);
            }
        }

        const output =
        await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }
        })

        .png()

        .toBuffer();

        return res.status(200).json({

            image:
            `data:image/png;base64,${output.toString("base64")}`

        });

    } catch (err) {

        return res.status(500).json({

            error:
            err.message
        });
    }
                                      }
