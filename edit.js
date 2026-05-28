const imageInput =
document.getElementById("imageInput");

const previewImg =
document.getElementById("previewImg");

const resultImg =
document.getElementById("resultImg");

const hitamkanBtn =
document.getElementById("hitamkanBtn");

let selectedFile;

imageInput.addEventListener(
"change",
(e)=>{

    selectedFile =
    e.target.files[0];

    if(!selectedFile) return;

    previewImg.src =
    URL.createObjectURL(selectedFile);

    previewImg.classList.add("show");
});

hitamkanBtn.addEventListener(
"click",
()=>{

    if(!selectedFile){

        alert("Upload gambar dulu");

        return;
    }

    const img =
    new Image();

    img.src =
    URL.createObjectURL(selectedFile);

    img.onload = ()=>{

        const canvas =
        document.createElement("canvas");

        const ctx =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:true
            }
        );

        canvas.width =
        img.width;

        canvas.height =
        img.height;

        ctx.drawImage(
            img,
            0,
            0
        );

        const imageData =
        ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const data =
        imageData.data;

        const width =
        canvas.width;

        const height =
        canvas.height;

        // =================================================
        // AUTO PICK CENTER FACE COLOR
        // =================================================

        const centerX =
        Math.floor(width / 2);

        const centerY =
        Math.floor(height / 3);

        const sampleSize = 20;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let count = 0;

        for(
            let y = centerY - sampleSize;
            y < centerY + sampleSize;
            y++
        ){

            for(
                let x = centerX - sampleSize;
                x < centerX + sampleSize;
                x++
            ){

                if(
                    x < 0 ||
                    y < 0 ||
                    x >= width ||
                    y >= height
                ) continue;

                const i =
                (y * width + x) * 4;

                totalR += data[i];
                totalG += data[i+1];
                totalB += data[i+2];

                count++;
            }
        }

        const baseSkin = {

            r: totalR / count,
            g: totalG / count,
            b: totalB / count
        };

        // =================================================
        // BUILD SMOOTH MASK
        // =================================================

        const mask =
        new Float32Array(
            width * height
        );

        for(
            let y = 0;
            y < height;
            y++
        ){

            for(
                let x = 0;
                x < width;
                x++
            ){

                const index =
                y * width + x;

                const i =
                index * 4;

                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                // color distance
                const dist =
                Math.sqrt(

                    (r - baseSkin.r) ** 2 +

                    (g - baseSkin.g) ** 2 +

                    (b - baseSkin.b) ** 2
                );

                // adaptive threshold
                let alpha = 0;

                if(dist < 95){

                    alpha =
                    1 - (dist / 95);
                }

                // face/body area bias
                const faceBias =
                Math.max(
                    0,
                    1 - (
                        Math.abs(
                            x - width/2
                        ) / (width/2)
                    )
                );

                alpha *= faceBias;

                mask[index] = alpha;
            }
        }

        // =================================================
        // FEATHER SMOOTH
        // =================================================

        const smooth =
        new Float32Array(
            width * height
        );

        const radius = 3;

        for(
            let y = 0;
            y < height;
            y++
        ){

            for(
                let x = 0;
                x < width;
                x++
            ){

                let total = 0;
                let count = 0;

                for(
                    let dy = -radius;
                    dy <= radius;
                    dy++
                ){

                    for(
                        let dx = -radius;
                        dx <= radius;
                        dx++
                    ){

                        const nx = x + dx;
                        const ny = y + dy;

                        if(
                            nx >= 0 &&
                            ny >= 0 &&
                            nx < width &&
                            ny < height
                        ){

                            total +=
                            mask[
                                ny * width + nx
                            ];

                            count++;
                        }
                    }
                }

                smooth[
                    y * width + x
                ] = total / count;
            }
        }

        // =================================================
        // APPLY DARK BROWN
        // =================================================

        const target = {

            r: 92,
            g: 58,
            b: 38
        };

        for(
            let y = 0;
            y < height;
            y++
        ){

            for(
                let x = 0;
                x < width;
                x++
            ){

                const index =
                y * width + x;

                const i =
                index * 4;

                const alpha =
                smooth[index];

                if(alpha > 0.03){

                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];

                    // preserve shading
                    const brightness =
                    (r+g+b)/3 / 255;

                    const strength =
                    alpha * 0.72;

                    data[i] = Math.round(

                        r * (1-strength) +

                        (
                            target.r *
                            brightness
                        ) * strength
                    );

                    data[i+1] = Math.round(

                        g * (1-strength) +

                        (
                            target.g *
                            brightness
                        ) * strength
                    );

                    data[i+2] = Math.round(

                        b * (1-strength) +

                        (
                            target.b *
                            brightness
                        ) * strength
                    );
                }
            }
        }

        // =================================================
        // RENDER FINAL
        // =================================================

        ctx.putImageData(
            imageData,
            0,
            0
        );

        resultImg.src =
        canvas.toDataURL(
            "image/png"
        );

        resultImg.classList.add("show");
    };
});
