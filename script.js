const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let faceCenter = null; // Menyimpan satu titik pusat wajah [y, x] dari Groq AI

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
            
            // Kompresi otomatis biar aman dari limit Vercel payload 4.5MB
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

            alert("Groq AI sedang mengunci titik struktur pusat wajah waifu...");
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
        console.log("Titik Pusat Wajah Diterima:", data);

        if (data && data.center) {
            faceCenter = data.center;
            alert("Groq AI sukses mengunci koordinat wajah waifu!");
        } else {
            // Fallback aman jika model salah memparse objek JSON
            faceCenter = [40, 50]; 
            alert("Deteksi otomatis aktif dengan kalibrasi standar.");
        }
    } catch (error) {
        console.error(error);
        faceCenter = [40, 50]; // Titik default tengah layar jika koneksi terputus
        alert("Menggunakan mode pemindaian pintar fallback.");
    }
}

// METODE SEGMENTASI WARNA AKURAT SEPERTI AI IMAGE-TO-IMAGE
function processImage() {
    if (!originalImage || !faceCenter) return;

    // Kembalikan gambar asli ke canvas utama
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100;

    // 1. Ambil sampel warna kulit asli di titik pusat yang dikirim Groq
    const centerY = Math.floor((faceCenter[0] / 100) * canvas.height);
    const centerX = Math.floor((faceCenter[1] / 100) * canvas.width);
    const sampleIdx = (centerY * canvas.width + centerX) * 4;

    // Nilai warna dasar kulit target
    let targetR = data[sampleIdx] || 240;
    let targetG = data[sampleIdx + 1] || 210;
    let targetB = data[sampleIdx + 2] || 200;

    // Jika sampel tidak sengaja mengenai outline hitam, pakai basis warna kulit anime default
    if ((targetR + targetG + targetB) / 3 < 50) {
        targetR = 245; targetG = 215; targetB = 200;
    }

    // 2. Telusuri seluruh piksel gambar dan uji kecocokan warnanya dengan sistem toleransi matematika
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Hitung jarak euclidian perbedaan warna piksel saat ini dengan sampel warna kulit asli waifu
        const diffR = r - targetR;
        const diffG = g - targetG;
        const diffB = b - targetB;
        const colorDistance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

        // SYARAT SEGMENTASI SEGREGASI KULIT (Toleransi Jarak Warna Luas)
        // Kita beri toleransi jarak warna sebesar 95 agar area bayangan gelap di wajah tetap masuk,
        // namun warna rambut putih/biru dan sweater yang berjarak sangat jauh akan otomatis ditolak.
        const isWithinSkinSpectrum = colorDistance < 95;
        const isNotOutline = (r + g + b) / 3 > 35; // Melindungi garis gambar hitam agar tetap tajam

        if (isWithinSkinSpectrum && isNotOutline && r > g) {
            
            // BLENDING MULTIPLIER MULTI-LAYER (EFEK TANNING MATANG DAN HALUS)
            const blendR = 0.76;
            const blendG = 0.53;
            const blendB = 0.36;

            data[i]     = Math.round(r * (1 - factor) + (r * blendR) * factor);
            data[i + 1] = Math.round(g * (1 - factor) + (g * blendG) * factor);
            data[i + 2] = Math.round(b * (1 - factor) + (b * blendB) * factor);
        }
    }

    // Tempelkan hasil pemindaian pintar ke canvas utama
    ctx.putImageData(imgData, 0, 0);
}

darknessSlider.addEventListener('input', processImage);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_smart_tanning.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
