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

        // target dark brown
        const target = {
            r: 92,
            g: 58,
            b: 38
        };

        // mask
        const mask =
        new Float32Array(
            canvas.width *
            canvas.height
        );

        // ======================
        // SKIN DETECTION
        // ======================

        for(
            let y = 0;
            y < canvas.height;
            y++
        ){

            for(
                let x = 0;
                x < canvas.width;
                x++
            ){

                const index =
                (y * canvas.width + x);

                const i =
                index * 4;

                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                // RGB -> HSV
                const rn = r/255;
                const gn = g/255;
                const bn = b/255;

                const max =
                Math.max(rn,gn,bn);

                const min =
                Math.min(rn,gn,bn);

                const diff =
                max - min;

                let h = 0;

                if(diff !== 0){

                    switch(max){

                        case rn:
                            h =
                            ((gn-bn)/diff)%6;
                        break;

                        case gn:
                            h =
                            (bn-rn)/diff + 2;
                        break;

                        case bn:
                            h =
                            (rn-gn)/diff + 4;
                        break;
                    }

                    h *= 60;

                    if(h < 0)
                    h += 360;
                }

                const s =
                max === 0
                ? 0
                : diff/max;

                const v = max;

                let skin = 0;

                // anime skin range
                if(

                    h >= 0 &&
                    h <= 35 &&

                    s >= 0.12 &&
                    s <= 0.68 &&

                    v >= 0.32

                ){

                    skin = 1;

                    // anti false positive
                    if(
                        Math.abs(r-g) < 6 &&
                        Math.abs(r-b) < 6
                    ){
                        skin = 0;
                    }

                    // avoid dark objects
                    if(v < 0.38){
                        skin = 0;
                    }
                }

                mask[index] = skin;
            }
        }

        // ======================
        // FEATHER SMOOTH
        // ======================

        const smoothMask =
        new Float32Array(mask.length);

        const radius = 4;

        for(
            let y = 0;
            y < canvas.height;
            y++
        ){

            for(
                let x = 0;
                x < canvas.width;
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
                            nx < canvas.width &&
                            ny < canvas.height
                        ){

                            total +=
                            mask[
                                ny *
                                canvas.width +
                                nx
                            ];

                            count++;
                        }
                    }
                }

                smoothMask[
                    y * canvas.width + x
                ] = total / count;
            }
        }

        // ======================
        // APPLY DARK BROWN
        // ======================

        for(
            let y = 0;
            y < canvas.height;
            y++
        ){

            for(
                let x = 0;
                x < canvas.width;
                x++
            ){

                const index =
                y * canvas.width + x;

                const i =
                index * 4;

                const alpha =
                smoothMask[index];

                if(alpha > 0.02){

                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];

                    // preserve shading
                    const brightness =
                    (r+g+b)/3 / 255;

                    const strength =
                    alpha * 0.52;

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

        // render final
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
    };
});
