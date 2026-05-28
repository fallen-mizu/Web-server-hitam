const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;
let activeBox = null; 

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
            
            // Kompresi resolusi tinggi untuk deteksi akurat
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let maxDim = 1024;
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
            
            const compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.85);

            if(loadingStatus) {
                loadingStatus.classList.remove('hidden');
                loadingText.innerText = "Groq AI sedang menganalisis struktur gambar...";
            }
            
            await hubungiGroqVision(compressedBase64);
            
            if(loadingStatus) loadingStatus.classList.add('hidden');
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

async function hubungiGroqVision(base64Image) {
    try {
        const response = await fetch(`${window.location.origin}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        if (data && data.box) {
            activeBox = data.box;
        } else {
            activeBox = [5, 10, 95, 90];
        }
    } catch (error) {
        console.error(error);
        activeBox = [5, 10, 95, 90]; 
    }
}

// Algoritma Pewarnaan Kulit Adaptif Anti-Bocor (Deep Exotic Tan)
function triggerTanning() {
    if (!originalImage || !activeBox) return;

    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Koordinat area dari AI
    const ymin = Math.max(0, Math.floor((activeBox[0] / 100) * canvas.height));
    const xmin = Math.max(0, Math.floor((activeBox[1] / 100) * canvas.width));
    const ymax = Math.min(canvas.height, Math.floor((activeBox[2] / 100) * canvas.height));
    const xmax = Math.min(canvas.width, Math.floor((activeBox[3] / 100) * canvas.width));

    // Target multiplier untuk hasil coklat matang eksotis dan pekat (#3D231F / #4A2E2B style)
    const targetR = 0.30;
    const targetG = 0.18;
    const targetB = 0.14;

    for (let y = ymin; y < ymax; y++) {
        for (let x = xmin; x < xmax; x++) {
            const i = (y * canvas.width + x) * 4;

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Amankan outline hitam/gelap (rambut gelap, garis gambar, bayangan pekat baju)
            if (r < 50 && g < 50 && b < 50) continue;

            // 2. Amankan mata, pakaian putih, dan rambut putih murni Arisu
            // Karakteristik warna putih/abu-abu netral: nilai R, G, B sangat dekat/seimbang
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            if (maxDiff < 12 && r > 115) continue; 

            // 3. Validasi Spektrum Kulit Anime (Kombinasi rona hangat & deteksi bayangan leher)
            // Kulit anime memiliki komponen Merah (R) yang selalu lebih tinggi dari Hijau (G) dan Biru (B)
            const isSkin = (r > g) && (g > b - 15) && (r > 45);

            if (isSkin) {
                // Terapkan perkalian warna secara langsung untuk mengunci shading bawaan gambar asli
                data[i]     = Math.round(r * targetR + (r * 0.1)); 
                data[i + 1] = Math.round(g * targetG + (g * 0.08));
                data[i + 2] = Math.round(b * targetB + (b * 0.05));
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

tanBtn.addEventListener('click', triggerTanning);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
