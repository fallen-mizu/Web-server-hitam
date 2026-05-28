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

        // decode image
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

        // skin mask
        const mask =
        Buffer.alloc(data.length);

        for (
            let i = 0;
            i < data.length;
            i += info.channels
        ) {

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const max =
            Math.max(r, g, b);

            const min =
            Math.min(r, g, b);

            const diff =
            max - min;

            const avg =
            (r + g + b) / 3;

            // anime skin detection
            const isSkin = (

                r > 45 &&
                g > 28 &&
                b > 20 &&

                r >= g &&
                r >= b &&

                diff > 8 &&
                diff < 120 &&

                avg > 55
            );

            const alpha =
            isSkin ? 255 : 0;

            mask[i] = alpha;
            mask[i + 1] = alpha;
            mask[i + 2] = alpha;

            if (info.channels === 4) {
                mask[i + 3] = 255;
            }
        }

        // feather blur mask
        const featherMask =
        await sharp(mask, {

            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }

        })

        .blur(10)

        .raw()

        .toBuffer();

        // dark brown target
        const target = {
            r: 92,
            g: 58,
            b: 38
        };

        // blend smooth
        for (
            let i = 0;
            i < data.length;
            i += info.channels
        ) {

            const alpha =
            featherMask[i] / 255;

            if (alpha > 0.01) {

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // preserve anime shading
                const brightness =
                (r + g + b) / 3 / 255;

                const strength =
                alpha * 0.72;

                data[i] = Math.round(

                    r * (1 - strength) +

                    (
                        target.r *
                        brightness
                    ) * strength
                );

                data[i + 1] = Math.round(

                    g * (1 - strength) +

                    (
                        target.g *
                        brightness
                    ) * strength
                );

                data[i + 2] = Math.round(

                    b * (1 - strength) +

                    (
                        target.b *
                        brightness
                    ) * strength
                );
            }
        }

        // rebuild image clean
        const output =
        await sharp(data, {

            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }

        })

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
