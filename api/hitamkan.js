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

function rgbToHsv(r, g, b) {

    r /= 255;
    g /= 255;
    b /= 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);

    let h, s, v = max;

    let d = max - min;

    s = max === 0 ? 0 : d / max;

    if (max === min) {

        h = 0;

    } else {

        switch (max) {

            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;

            case g:
                h = (b - r) / d + 2;
                break;

            case b:
                h = (r - g) / d + 4;
                break;
        }

        h /= 6;
    }

    return {
        h: h * 360,
        s,
        v
    };
}

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
        .toBuffer({
            resolveWithObject: true
        });

        for (
            let i = 0;
            i < data.length;
            i += info.channels
        ) {

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            const hsv =
            rgbToHsv(r, g, b);

            // skin detect jauh lebih smooth
            const isSkin = (

                hsv.h > 0 &&
                hsv.h < 45 &&

                hsv.s > 0.15 &&
                hsv.s < 0.75 &&

                hsv.v > 0.25
            );

            if (isSkin) {

                // dark brown blend smooth
                const blend = 0.35;

                const targetR = 92;
                const targetG = 58;
                const targetB = 38;

                data[i] = Math.round(
                    r * (1 - blend) +
                    targetR * blend
                );

                data[i + 1] = Math.round(
                    g * (1 - blend) +
                    targetG * blend
                );

                data[i + 2] = Math.round(
                    b * (1 - blend) +
                    targetB * blend
                );
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

        // smoothing agar tidak bercak
        .blur(0.6)

        .png({
            quality: 100,
            compressionLevel: 0
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
