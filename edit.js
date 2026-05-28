const imageInput =
document.getElementById("imageInput");

const previewImg =
document.getElementById("previewImg");

const resultImg =
document.getElementById("resultImg");

const hitamkanBtn =
document.getElementById("hitamkanBtn");

let selectedFile;

let pickedColor = null;

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

// PICK SKIN COLOR
previewImg.addEventListener(
"click",
(e)=>{

    const canvas =
    document.createElement("canvas");

    const ctx =
    canvas.getContext("2d");

    canvas.width =
    previewImg.naturalWidth;

    canvas.height =
    previewImg.naturalHeight;

    ctx.drawImage(
        previewImg,
        0,
        0
    );

    const rect =
    previewImg.getBoundingClientRect();

    const scaleX =
    previewImg.naturalWidth /
    rect.width;

    const scaleY =
    previewImg.naturalHeight /
    rect.height;

    const x =
    Math.floor(
        (e.clientX - rect.left)
        * scaleX
    );

    const y =
    Math.floor(
        (e.clientY - rect.top)
        * scaleY
    );

    const pixel =
    ctx.getImageData(
        x,
        y,
        1,
        1
    ).data;

    pickedColor = {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2]
    };

    alert(
        "Warna kulit dipilih!"
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

    if(!pickedColor){

        alert(
        "Klik warna kulit dulu pada preview"
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

        const target = {
            r:92,
            g:58,
            b:38
        };

        // smooth mask
        const mask =
        new Float32Array(
            canvas.width *
            canvas.height
        );

        // DETECT SIMILAR COLOR
        for(
            let y=0;
            y<canvas.height;
            y++
        ){

            for(
                let x=0;
                x<canvas.width;
                x++
            ){

                const index =
                y * canvas.width + x;

                const i =
                index * 4;

                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                const dist = Math.sqrt(

                    (r-pickedColor.r)**2 +

                    (g-pickedColor.g)**2 +

                    (b-pickedColor.b)**2
                );

                // tolerance
                let alpha = 0;

                if(dist < 85){

                    alpha =
                    1 - (dist / 85);
                }

                mask[index] = alpha;
            }
        }

        // APPLY DARK BROWN
        for(
            let y=0;
            y<canvas.height;
            y++
        ){

            for(
                let x=0;
                x<canvas.width;
                x++
            ){

                const index =
                y * canvas.width + x;

                const i =
                index * 4;

                const alpha =
                mask[index];

                if(alpha > 0.01){

                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];

                    const brightness =
                    (r+g+b)/3 / 255;

                    const strength =
                    alpha * 0.58;

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
