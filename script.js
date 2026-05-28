const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinBoxes = []; // Menyimpan koordinat [ymin, xmin, ymax, xmax] dari Groq AI

// 1. Handler Event Proses Upload Gambar
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            
            // Atur resolusi canvas utama sesuai ukuran asli gambar waifu
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // --- PROSES KOMPRESI GAMBAR OTOMATIS (MENGHINDARI LIMIT VERCEL 4.5MB) ---
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            let maxDim = 800; // Batas resolusi maksimal untuk Groq Vision
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
            // ---------------------------------------------------------------------

            alert("Groq AI sedang mendeteksi struktur wajah dan kulit waifu...");
            
            // Kirim gambar hasil kompresi ke backend Vercel
            await hubungiGroqAI(compressedBase64);
            
            // Eksekusi pemrosesan visual awal
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Fungsi Komunikasi ke Backend Serverless Vercel
async function hubungiGroqAI(base64Image) {
    try {
        console.log("Menghubungi endpoint API backend...");
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respon data mentah dari Groq:", data);

        if (data && data.boxes) {
            skinBoxes = data.boxes;
        } else if (Array.isArray(data)) {
            skinBoxes = data;
        } else if (data && typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length > 0 && Array.isArray(data[keys[0]])) {
                skinBoxes = data[keys[0]];
            } else {
                skinBoxes = [];
            }
        } else {
            skinBoxes = [];
        }

        console.log("Koordinat berhasil dikunci:", skinBoxes);
        alert("Groq AI sukses mendeteksi area wajah dan kulit!");

    } catch (error) {
        console.error("Gagal melakukan deteksi lewat Groq:", error);
        alert("Koneksi ke Groq AI gagal. Cek kembali GROQ_API_KEY di dashboard Vercel.");
    }
}

// 3. Fungsi Utama Pemrosesan Piksel Warna Kulit (Tanning Engine v3)
function processImage() {
    if (!originalImage) return;

    // Gambar ulang gambar asli ke canvas utama agar slider fleksibel digeser
    ctx.drawImage(originalImage, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100; // Skala slider 0.0 - 1.0

    if (!skinBoxes || skinBoxes.length === 0) {
        return;
    }

    // Jalankan manipulasi warna untuk setiap area box yang diberikan oleh Groq
    skinBoxes.forEach(box => {
        // Konversi koordinat persen (0-100) menjadi piksel riil canvas
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

                // Hitung nilai kecerahan dasar piksel
                const brightness = (r + g + b) / 3;

                // FILTER SELEKTIF RGB (Menghapus efek garis potong tajam)
                // Kulit anime (termasuk yang terkena bayangan) memiliki karakteristik:
                // Komponen Red (R) selalu menjadi warna yang paling dominan dibandingkan Green (G) maupun Blue (B).
                // Kita juga pastikan piksel tersebut bukan bagian dari outline hitam gelap (brightness > 40).
                if ((r > g && r > b - 20) && brightness > 40) {
                    
                    // ALGORITMA MULTIPLIER BLENDING
                    // Kita tidak memaksa merubah angka Hue secara kaku, melainkan mengalikan piksel asli 
                    // dengan rasio "Warm Tanning Blend" secara lembut. 
                    // Ini menjaga bayangan asli bawaan gambar tetap menyatu mulus (gradasi halus).
                    
                    const rTarget = 0.78; // Mempertahankan rona merah hangat
                    const gTarget = 0.52; // Menurunkan warna hijau untuk memicu efek coklat
                    const bTarget = 0.35; // Memotong warna biru secara agresif untuk membuang tint cahaya ungu-biru gambar

                    // Interpolasi linier antara warna asli dengan warna tanning berdasarkan posisi slider (factor)
                    data[i]     = Math.round(r * (1 - factor) + (r * rTarget) * factor);
                    data[i + 1] = Math.round(g * (1 - factor) + (g * gTarget) * factor);
                    data[i + 2] = Math.round(b * (1 - factor) + (b * bTarget) * factor);
                }
            }
        }
    });

    // Kembalikan data piksel yang telah dimodifikasi secara halus ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// 4. Sinkronisasi Perubahan Slider secara Real-time
darknessSlider.addEventListener('input', processImage);

// 5. Handler Unduh Gambar Hasil Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_tan.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
            
