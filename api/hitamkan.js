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

        // ambil raw pixel
        const image =
        sharp(req.file.buffer);

        const {
            data,
            info
        } = await image
        .raw()
        .toBuffer({
            resolveWithObject: true
        });

        // target dark brown
        const targetSkin = {
            r: 92,
            g: 58,
            b: 38
        };

        for (
            let i = 0;
            i < data.length;
            i += info.channels
        ) {

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // skin detection lebih smooth
            const isSkin = (

                r > 65 &&
                g > 35 &&
                b > 20 &&

                r > g &&
                r > b &&

                (r - g) > 8 &&
                (r - b) > 12 &&

                Math.abs(r - g) < 120
            );

            if (isSkin) {

                // preserve shading asli
                const brightness =
                (r + g + b) / 3 / 255;

                // blend natural
                data[i] = Math.min(
                    255,

                    Math.round(
                        r * 0.58 +
                        targetSkin.r * 0.42 * brightness
                    )
                );

                data[i + 1] = Math.min(
                    255,

                    Math.round(
                        g * 0.58 +
                        targetSkin.g * 0.42 * brightness
                    )
                );

                data[i + 2] = Math.min(
                    255,

                    Math.round(
                        b * 0.58 +
                        targetSkin.b * 0.42 * brightness
                    )
                );
            }
        }

        // rebuild image halus
        const output =
        await sharp(data, {

            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }

        })

        .median(1)

        .png({
            compressionLevel: 0,
            quality: 100
        })

        .toBuffer();

        return res.status(200).json({

            image:
            `data:image/png;base64,${output.toString("base64")}`

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            error:
            err.message
        });
    }
}
