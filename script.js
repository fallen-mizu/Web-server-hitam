const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinPoints = []; // Menyimpan koordinat titik poligon [y, x] dari Groq AI

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
            
            // Kompresi otomatis untuk bypass limit Vercel payload
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

            alert("Groq AI sedang memetakan titik anatomi kulit wajah waifu...");
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
        console.log("Titik Anatomi diterima:", data);

        // Ekstraksi array titik poligon [y, x]
        if (data && data.points) {
            skinPoints = data.points;
        } else if (Array.isArray(data)) {
            skinPoints = data;
        } else {
            skinPoints = [];
        }

        alert("Groq AI sukses mengunci koordinat struktur wajah waifu!");
    } catch (error) {
        console.error(error);
        alert("Koneksi ke Groq AI gagal atau format AI meleset.");
    }
}

// FUNGSI UTAMA PEWARNAAN BERBASIS POLYGON MASKING (ANTI BOCOR)
function processImage() {
    if (!originalImage) return;

    // 1. Gambar ulang gambar asli secara bersih ke canvas luar
    ctx.drawImage(originalImage, 0, 0);

    if (!skinPoints || skinPoints.length < 3) {
        console.log("Pemrosesan visual dilewati: Titik poligon tidak cukup.");
        return;
    }

    const factor = darknessSlider.value / 100;
    if (factor === 0) return;

    // 2. Buat Canvas Tersembunyi (Buffer) untuk memanipulasi warna kulit secara penuh
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
    const bCtx = bufferCanvas.getContext('2d');
    
    // Gambar gambar asli ke buffer dan ambil datanya
    bCtx.drawImage(originalImage, 0, 0);
    const imgData = bCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
    const data = imgData.data;

    // Jalankan mesin pengubah warna piksel kecoklatan ke seluruh permukaan gambar di buffer
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Saring tipis agar garis outline hitam bawaan gambar anime tidak hilang/luntur
        if ((r + g + b) / 3 > 35 && r > g) {
            const targetR = 0.76;
            const targetG = 0.53;
            const targetB = 0.36;

            data[i]     = Math.round(r * (1 - factor) + (r * targetR) * factor);
            data[i + 1] = Math.round(g * (1 - factor) + (g * targetG) * factor);
            data[i + 2] = Math.round(b * (1 - factor) + (b * targetB) * factor);
        }
    }
    // Masukkan hasil manipulasi warna penuh ke buffer canvas
    bCtx.putImageData(imgData, 0, 0);

    // 3. TEKNIK IMAGE-TO-IMAGE SEGMEN MASKING DI CANVAS UTAMA
    // Kita gunakan data koordinat titik dari Groq untuk memotong buffer canvas secara presisi
    ctx.save();
    ctx.beginPath();
    
    // Hubungkan koordinat titik persen menjadi path poligon pelindung wajah
    skinPoints.forEach((pt, index) => {
        const y = Math.floor((pt[0] / 100) * canvas.height);
        const x = Math.floor((pt[1] / 100) * canvas.width);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.closePath();
    ctx.clip(); // Kunci canvas utama! Hanya area di dalam poligon ini yang boleh dimodifikasi

    // Tempelkan gambar buffer kecoklatan ke dalam area potongan poligon kulit wajah
    ctx.drawImage(bufferCanvas, 0, 0);
    ctx.restore(); // Lepas kunci masking untuk rendering berikutnya
}

darknessSlider.addEventListener('input', processImage);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_segmentation.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
                
