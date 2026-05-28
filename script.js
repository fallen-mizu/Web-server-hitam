const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinBoxes = [];

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Kompresi otomatis biar aman dari limit Vercel
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let maxDim = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.75);

            alert("Groq AI sedang mendeteksi struktur wajah dan kulit waifu...");
            await hubungiGroqAI(compressedBase64);
            
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

async function hubungiGroqAI(base64Image) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        if (data && data.boxes) {
            skinBoxes = data.boxes;
        } else if (Array.isArray(data)) {
            skinBoxes = data;
        } else if (data && typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length > 0 && Array.isArray(data[keys[0]])) {
                skinBoxes = data[keys[0]];
            } else { skinBoxes = []; }
        } else { skinBoxes = []; }

        alert("Groq AI sukses memetakan struktur kulit wajah!");
    } catch (error) {
        console.error(error);
        alert("Koneksi ke Groq AI gagal.");
    }
}

function processImage() {
    if (!originalImage || !skinBoxes || skinBoxes.length === 0) return;

    ctx.drawImage(originalImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100;

    skinBoxes.forEach(box => {
        const ymin = Math.max(0, Math.floor((box[0] / 100) * canvas.height));
        const xmin = Math.max(0, Math.floor((box[1] / 100) * canvas.width));
        const ymax = Math.min(canvas.height, Math.floor((box[2] / 100) * canvas.height));
        const xmax = Math.min(canvas.width, Math.floor((box[3] / 100) * canvas.width));

        for (let y = ymin; y < ymax; y++) {
            for (let x = xmin; x < xmax; x++) {
                const i = (y * canvas.width + x) * 4;

                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // FILTER DETECTION AMAN (RGB BASED)
                // Memastikan piksel berwarna rona kulit (Red dominan) dan bukan outline gelap gulita
                if (r > g && r > b - 30 && (r + g + b) / 3 > 35) {
                    
                    // VALIDASI PROTEKSI RAMBUT PUTIH/BIRU & SWEATER
                    // Jika warna cenderung ke arah abu-abu/biru murni (R, G, B nilainya mirip sekali), skip agar tidak bocor
                    if (Math.abs(r - b) < 12 && Math.abs(g - b) < 12) continue;

                    // FORMULA MEWARNAI (TANNING ENGINE V4)
                    // Menggunakan multiplier blending agar shadow/bayangan asli tetap terjaga mulus
                    const targetR = 0.75; 
                    const targetG = 0.50; 
                    const targetB = 0.32; 

                    data[i]     = Math.round(r * (1 - factor) + (r * targetR) * factor);
                    data[i + 1] = Math.round(g * (1 - factor) + (g * targetG) * factor);
                    data[i + 2] = Math.round(b * (1 - factor) + (b * targetB) * factor);
                }
            }
        }
    });

    ctx.putImageData(imgData, 0, 0);
}

darknessSlider.addEventListener('input', processImage);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_tanned_fixed.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
                        
