const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;
let activeBox = null; 

// 1. Handler Upload Gambar
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
            
            // Kompresi resolusi tinggi agar deteksi warna presisi
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

// 2. Mengambil Koordinat Box dari Groq AI
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
            activeBox = data.boxes ? data.boxes[0] : [5, 10, 95, 90];
        }
    } catch (error) {
        console.error("Gagal menghubungi backend Worker:", error);
        activeBox = [5, 10, 95, 90]; 
    }
}

// 3. Mesin Tanning Professional (Mengikuti Contoh Target Gambar)
function triggerTanning() {
    if (!originalImage || !activeBox) return;

    // Reset kanvas ke gambar asli murni
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Konversi koordinat persen ke pixel riil
    const ymin = Math.max(0, Math.floor((activeBox[0] / 100) * canvas.height));
    const xmin = Math.max(0, Math.floor((activeBox[1] / 100) * canvas.width));
    const ymax = Math.min(canvas.height, Math.floor((activeBox[2] / 100) * canvas.height));
    const xmax = Math.min(canvas.width, Math.floor((activeBox[3] / 100) * canvas.width));

    // LANGKAH A: Cari sampel warna kulit asli waifu di titik tengah kotak secara otomatis
    const midY = Math.floor((ymin + ymax) / 2);
    const midX = Math.floor((xmin + xmax) / 2);
    const sampleIdx = (midY * canvas.width + midX) * 4;

    let baseR = data[sampleIdx] || 245;
    let baseG = data[sampleIdx + 1] || 215;
    let baseB = data[sampleIdx + 2] || 200;

    // Jika sampel mendeteksi outline atau warna gelap, reset ke standar rona kulit anime
    if ((baseR + baseG + baseB) / 3 < 50) {
        baseR = 245; baseG = 215; baseB = 200;
    }

    // LANGKAH B: Pemindaian Piksel dengan Logika Soft Masking Multiplier
    // Target warna kulit gelap eksotis yang pekat dan hangat (Mengikuti Gambar Contoh)
    const targetFactorR = 0.32; 
    const targetFactorG = 0.22; 
    const targetFactorB = 0.18; 

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Hitung jarak kemiripan warna piksel saat ini dengan sampel warna kulit dasar
        const diffR = r - baseR;
        const diffG = g - baseG;
        const diffB = b - baseB;
        const colorDistance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

        // Proteksi Garis Outline dan Area Sangat Gelap (Mencegah kompresi pecah)
        const currentBrightness = (r + g + b) / 3;
        if (currentBrightness < 45) continue;

        // Proteksi Rambut Putih/Abu-Abu Netral dan Pakaian Putih Bersih
        const isNeutralColor = Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
        if (isNeutralColor && currentBrightness > 130) continue;

        // Toleransi spektrum warna kulit diperluas hingga 115 agar leher dan bayangan wajah ikut terwarnai
        if (colorDistance < 115 && r > g - 10) {
            
            // Menggunakan fungsi kelandaian (Smoothstep) agar transisi warna di tepi objek tidak kasar/patah
            let weight = (115 - colorDistance) / 115;
            weight = weight * weight * (3 - 2 * weight); // Smooth interpolation

            // Hitung hasil perpaduan warna coklat pekat eksotis yang natural
            const finalR = Math.round(r * (1 - weight) + (r * targetFactorR) * weight);
            const finalG = Math.round(g * (1 - weight) + (g * targetFactorG) * weight);
            const finalB = Math.round(b * (1 - weight) + (b * targetFactorB) * weight);

            // Terapkan warna baru dengan menjaga garis shading asli
            data[i]     = finalR;
            data[i + 1] = finalG;
            data[i + 2] = finalB;
        }
    }

    // Tampilkan hasil akhir yang bersih ke canvas
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
    
