const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;
let activeBox = null; 

// 1. Jalankan upload gambar
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
            
            // Kompresi resolusi tinggi dengan menjaga kualitas agar noise rambut hilang
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let maxDim = 1024; // Diperbesar ke 1024 agar deteksi mata Groq lebih halus
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
                loadingText.innerText = "Groq AI Vision sedang mengunci koordinat wajah...";
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

// 2. Hubungi backend Groq Vision resmi di Cloudflare Workers
async function hubungiGroqVision(base64Image) {
    try {
        const response = await fetch(`${window.location.origin}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        console.log("Data koordinat dari Groq Vision:", data);

        if (data && data.box) {
            activeBox = data.box;
        } else {
            activeBox = data.boxes ? data.boxes[0] : [5, 15, 90, 85];
        }
    } catch (error) {
        console.error("Gagal menghubungi backend Worker:", error);
        activeBox = [5, 15, 90, 85]; 
    }
}

// 3. Fungsi Eksekusi Tanning Sekali Klik dengan Algoritma Soft Edge Blending
function triggerTanning() {
    if (!originalImage || !activeBox) return;

    // Reset ke kondisi awal gambar murni
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Faktor kegelapan dioptimalkan ke 0.68 agar gradasi bayangan menyatu alami
    const maxFactor = 0.68; 

    const ymin = Math.max(0, Math.floor((activeBox[0] / 100) * canvas.height));
    const xmin = Math.max(0, Math.floor((activeBox[1] / 100) * canvas.width));
    const ymax = Math.min(canvas.height, Math.floor((activeBox[2] / 100) * canvas.height));
    const xmax = Math.min(canvas.width, Math.floor((activeBox[3] / 100) * canvas.width));

    // Ukuran border luar untuk transisi pemudaran efek (mencegah garis lurus kaku)
    const feather = 15; 

    for (let y = ymin; y < ymax; y++) {
        for (let x = xmin; x < xmax; x++) {
            const i = (y * canvas.width + x) * 4;

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. FILTER SPEKTRUM KULIT ANIME (DIPERKETAT AGAR RAMBUT PUTIH / BG TIDAK TEMBUS)
            const isSkinTone = (r > g) && (g > b || Math.abs(g - b) < 20) && (r > 40);

            // 2. PROTEKSI RAMBUT PUTIH/ABU ARISU (Nilai RGB sangat berdekatan)
            const isWhiteOrGrayHair = Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && (r > 120);

            // 3. PROTEKSI OUTLINE DAN AREA GELAP
            const isOutline = r < 40 && g < 40 && b < 40;

            if (isSkinTone && !isWhiteOrGrayHair && !isOutline) {
                
                // HITUNG FEATHERING (Mencegah efek patah kotak di tepi deteksi)
                let distY = Math.min(y - ymin, ymax - y);
                let distX = Math.min(x - xmin, xmax - x);
                let minDist = Math.min(distX, distY);
                
                let factor = maxFactor;
                if (minDist < feather) {
                    factor = maxFactor * (minDist / feather); // Memudar halus di ujung area kotak
                }

                // Formula Warm Skin Blend Multiplier
                const targetR = 0.74; 
                const targetG = 0.50; 
                const targetB = 0.33; 

                data[i]     = Math.round(r * (1 - factor) + (r * targetR) * factor);
                data[i + 1] = Math.round(g * (1 - factor) + (g * targetG) * factor);
                data[i + 2] = Math.round(b * (1 - factor) + (b * targetB) * factor);
            }
        }
    }

    // Render kembali ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Event listener tombol
tanBtn.addEventListener('click', triggerTanning);

// Event listener download gambar
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
    
