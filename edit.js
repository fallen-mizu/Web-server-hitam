const imageInput =
document.getElementById("imageInput");

const previewImg =
document.getElementById("previewImg");

const resultImg =
document.getElementById("resultImg");

const hitamkanBtn =
document.getElementById("hitamkanBtn");

let selectedFile;

// load BodyPix
async function loadModel(){

    return await bodyPix.load({

        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
    });
}

let netPromise =
loadModel();

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

        // BODYPIX MODEL
        const net =
        await netPromise;

        // segment person
        const segmentation =
        await net.segmentPerson(
            img,
            {
                internalResolution:"medium",
                segmentationThreshold:0.7
            }
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

        // dark brown target
        const target = {
            r:92,
            g:58,
            b:38
        };

        // helper
        function isSkinLike(r,g,b){

            return (

                r > 35 &&
                g > 20 &&
                b > 15 &&

                r >= g &&
                r >= b &&

                Math.abs(r-g) > 5
            );
        }

        // APPLY ONLY PERSON AREA
        for(
            let i = 0;
            i < segmentation.data.length;
            i++
        ){

            if(segmentation.data[i] === 1){

                const idx =
                i * 4;

                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];

                // extra skin filter
                if(
                    isSkinLike(r,g,b)
                ){

                    // preserve shading
                    const brightness =
                    (r+g+b)/3 / 255;

                    const strength =
                    0.48;

                    data[idx] = Math.round(

                        r * (1-strength) +

                        (
                            target.r *
                            brightness
                        ) * strength
                    );

                    data[idx+1] = Math.round(

                        g * (1-strength) +

                        (
                            target.g *
                            brightness
                        ) * strength
                    );

                    data[idx+2] = Math.round(

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

        hitamkanBtn.innerText =
        "Hitamkan";
    };
});
