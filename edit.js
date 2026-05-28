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

        // ====================================
        // AUTO FACE SAMPLE
        // ====================================

        const startX =
        Math.floor(width / 2);

        const startY =
        Math.floor(height / 3);

        const startIndex =
        (startY * width + startX) * 4;

        const baseSkin = {

            r: data[startIndex],
            g: data[startIndex + 1],
            b: data[startIndex + 2]
        };

        // ====================================
        // FLOOD FILL MASK
        // ====================================

        const mask =
        new Float32Array(
            width * height
        );

        const visited =
        new Uint8Array(
            width * height
        );

        const queue = [
            [startX,startY]
        ];

        function distance(
            r1,g1,b1,
            r2,g2,b2
        ){

            return Math.sqrt(

                (r1-r2)**2 +

                (g1-g2)**2 +

                (b1-b2)**2
            );
        }

        while(queue.length){

            const [x,y] =
            queue.shift();

            if(
                x < 0 ||
                y < 0 ||
                x >= width ||
                y >= height
            ) continue;

            const index =
            y * width + x;

            if(visited[index])
            continue;

            visited[index] = 1;

            const i =
            index * 4;

            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // brightness
            const brightness =
            (r+g+b)/3;

            if(brightness < 35)
            continue;

            // saturation
            const max =
            Math.max(r,g,b);

            const min =
            Math.min(r,g,b);

            const saturation =
            (max-min)/(max||1);

            // skip vivid anime hair
            if(
                saturation > 0.42
            ) continue;

            // stronger skin rule
            if(
                r < g ||
                r < b
            ) continue;

            // distance from skin sample
            const dist =
            distance(

                r,g,b,

                baseSkin.r,
                baseSkin.g,
                baseSkin.b
            );

            // adaptive threshold
            if(dist > 48)
            continue;

            // smooth alpha
            const alpha =
            1 - (dist / 48);

            mask[index] = alpha;

            // flood neighbors
            queue.push([x+1,y]);
            queue.push([x-1,y]);
            queue.push([x,y+1]);
            queue.push([x,y-1]);
        }

        // ====================================
        // FEATHER SMOOTH
        // ====================================

        const smooth =
        new Float32Array(
            width * height
        );

        const radius = 5;

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

        // ====================================
        // APPLY DARK BROWN
        // ====================================

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

                if(alpha > 0.015){

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
                    alpha * 0.88;

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

        // ====================================
        // RENDER FINAL
        // ====================================

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
