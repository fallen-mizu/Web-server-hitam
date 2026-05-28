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

    previewImg.classList.add(
        "show"
    );
});

hitamkanBtn.addEventListener(
"click",
()=>{

    if(!selectedFile){

        alert(
        "Upload gambar dulu"
        );

        return;
    }

    hitamkanBtn.innerText =
    "Processing...";

    const img =
    new Image();

    img.src =
    URL.createObjectURL(selectedFile);

    img.onload = ()=>{

        const canvas =
        document.createElement(
            "canvas"
        );

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

        // =========================================
        // AUTO SKIN SAMPLE
        // =========================================

        const centerX =
        Math.floor(width / 2);

        const centerY =
        Math.floor(height / 3);

        let sampleR = 0;
        let sampleG = 0;
        let sampleB = 0;
        let sampleCount = 0;

        for(
            let y = centerY - 25;
            y < centerY + 25;
            y++
        ){

            for(
                let x = centerX - 25;
                x < centerX + 25;
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

                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                // skip oversaturated anime hair
                const max =
                Math.max(r,g,b);

                const min =
                Math.min(r,g,b);

                const sat =
                (max-min)/(max||1);

                if(sat > 0.45)
                continue;

                sampleR += r;
                sampleG += g;
                sampleB += b;

                sampleCount++;
            }
        }

        const baseSkin = {

            r: sampleR / sampleCount,
            g: sampleG / sampleCount,
            b: sampleB / sampleCount
        };

        // =========================================
        // BUILD MASK
        // =========================================

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

                const max =
                Math.max(r,g,b);

                const min =
                Math.min(r,g,b);

                const saturation =
                (max-min)/(max||1);

                // exclude vivid anime hair
                if(
                    saturation > 0.48
                ){
                    continue;
                }

                // exclude strong yellow/orange
                if(
                    r > 160 &&
                    g > 120 &&
                    b < 120
                ){
                    continue;
                }

                // exclude dark regions
                const brightness =
                (r+g+b)/3;

                if(brightness < 45)
                continue;

                // color distance
                const dist =
                Math.sqrt(

                    (r-baseSkin.r)**2 +

                    (g-baseSkin.g)**2 +

                    (b-baseSkin.b)**2
                );

                if(dist < 75){

                    let alpha =
                    1 - (dist / 75);

                    // center bias
                    const cx =
                    Math.abs(
                        x - width/2
                    ) / (width/2);

                    alpha *=
                    (1 - cx * 0.3);

                    mask[index] = alpha;
                }
            }
        }

        // =========================================
        // FEATHER SMOOTH
        // =========================================

        const smooth =
        new Float32Array(
            width * height
        );

        const radius = 4;

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

        // =========================================
        // APPLY DARK BROWN
        // =========================================

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

                if(alpha > 0.02){

                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];

                    // luminance only
                    const luminance =

                    (
                        0.299 * r +
                        0.587 * g +
                        0.114 * b
                    ) / 255;

                    const strength =
                    alpha * 0.82;

                    const darkR =
                    92 * luminance;

                    const darkG =
                    58 * luminance;

                    const darkB =
                    38 * luminance;

                    data[i] = Math.round(

                        r * (1-strength) +

                        darkR * strength
                    );

                    data[i+1] = Math.round(

                        g * (1-strength) +

                        darkG * strength
                    );

                    data[i+2] = Math.round(

                        b * (1-strength) +

                        darkB * strength
                    );
                }
            }
        }

        // =========================================
        // RENDER
        // =========================================

        ctx.putImageData(
            imageData,
            0,
            0
        );

        resultImg.src =
        canvas.toDataURL(
            "image/png"
        );

        resultImg.classList.add(
            "show"
        );

        hitamkanBtn.innerText =
        "Hitamkan";
    };
});
