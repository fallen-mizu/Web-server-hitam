const imageInput =
document.getElementById("imageInput");

const previewImg =
document.getElementById("previewImg");

const resultImg =
document.getElementById("resultImg");

const hitamkanBtn =
document.getElementById("hitamkanBtn");

let selectedFile;

// MEDIAPIPE
const faceDetection =
new FaceDetection({

    locateFile: (file)=>{

        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
    }
});

faceDetection.setOptions({

    model: "short",

    minDetectionConfidence: 0.3
});

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
async ()=>{

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

    img.onload = async ()=>{

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

        // detect face
        let faceBox = null;

        faceDetection.onResults(
        (results)=>{

            if(
                results.detections &&
                results.detections.length > 0
            ){

                const box =
                results
                .detections[0]
                .boundingBox;

                faceBox = box;
            }
        });

        await faceDetection.send({
            image: img
        });

        // fallback jika anime tidak terdeteksi
        if(!faceBox){

            faceBox = {

                xmin: 0.2,
                ymin: 0.15,

                width: 0.6,
                height: 0.7
            };
        }

        const fx =
        faceBox.xmin *
        canvas.width;

        const fy =
        faceBox.ymin *
        canvas.height;

        const fw =
        faceBox.width *
        canvas.width;

        const fh =
        faceBox.height *
        canvas.height;

        // dark brown
        const target = {

            r: 92,
            g: 58,
            b: 38
        };

        // process pixel
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

                // area wajah/tubuh
                const insideFace = (

                    x > fx - fw*0.3 &&
                    x < fx + fw*1.3 &&

                    y > fy - fh*0.15 &&
                    y < fy + fh*1.6
                );

                if(!insideFace)
                continue;

                // anime skin detect
                const isSkin = (

                    r > 40 &&
                    g > 20 &&
                    b > 15 &&

                    r >= g &&
                    r >= b &&

                    Math.abs(r-g) > 4
                );

                if(isSkin){

                    // feather edge
                    const cx =
                    fx + fw/2;

                    const cy =
                    fy + fh/2;

                    const dx =
                    (x-cx)/(fw*0.9);

                    const dy =
                    (y-cy)/(fh*1.2);

                    const dist =
                    Math.sqrt(
                        dx*dx + dy*dy
                    );

                    const falloff =
                    Math.max(
                        0,
                        1 - dist
                    );

                    // preserve shading
                    const brightness =
                    (r+g+b)/3 / 255;

                    const strength =
                    0.58 * falloff;

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

        hitamkanBtn.innerText =
        "Hitamkan";
    };
});
