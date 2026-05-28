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

    // brightness
    const avg =
    (r + g + b) / 3;

    // anime skin detect lebih luas
    const isSkin = (

        r > 40 &&
        g > 25 &&
        b > 20 &&

        r >= g &&
        r >= b &&

        avg > 45 &&

        Math.abs(r - g) < 80 &&
        Math.abs(r - b) < 120
    );

    if (isSkin) {

        // dark brown target
        const targetR = 92;
        const targetG = 58;
        const targetB = 38;

        // preserve shading
        const shade =
        avg / 255;

        // blend lebih kuat
        const blend = 0.55;

        data[i] = Math.max(
            0,

            Math.min(
                255,

                Math.round(
                    r * (1 - blend) +
                    targetR * blend * shade
                )
            )
        );

        data[i + 1] = Math.max(
            0,

            Math.min(
                255,

                Math.round(
                    g * (1 - blend) +
                    targetG * blend * shade
                )
            )
        );

        data[i + 2] = Math.max(
            0,

            Math.min(
                255,

                Math.round(
                    b * (1 - blend) +
                    targetB * blend * shade
                )
            )
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
        .median(1)

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
