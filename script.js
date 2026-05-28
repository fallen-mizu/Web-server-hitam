const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinBoxes = []; // Tempat menyimpan koordinat [ymin, xmin, ymax, xmax] dari Groq AI

// 1. Handler Event saat User Memilih Gambar Waifu
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            
            // Set resolusi canvas utama sesuai ukuran asli gambar waifu
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // --- PROSES KOMPRESI GAMBAR OTOMATIS (UNTUK MENGHINDARI LIMIT VERCEL 4.5MB) ---
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            let maxDim = 800; // Batas dimensi maksimal untuk diproses oleh Groq Vision
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
            
            // Kompres gambar menjadi format JPEG dengan kualitas 75% agar filenya sangat ringan
            const compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.75);
            // -----------------------------------------------------------------------------

            alert("Groq AI sedang mendeteksi struktur wajah dan kulit waifu...");
            
            // Kirim data base64 hasil kompresi ke backend serverless function Vercel
            await hubungiGroqAI(compressedBase64);
            
            // Jalankan manipulasi warna kulit & tampilkan tombol download
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Fungsi Komunikasi ke Backend Serverless Vercel (/api/chat.js)
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

        // Amankan proses ekstraksi koordinat box
        if (data && data.boxes) {
            skinBoxes = data.boxes;
        } else if (Array.isArray(data)) {
            skinBoxes = data;
        } else if (data && typeof data === 'object') {
            // Jika Groq mengembalikan key acak, coba cari array di dalamnya
            const keys = Object.keys(data);
            if (keys.length > 0 && Array.isArray(data[keys[0]])) {
                skinBoxes = data[keys[0]];
            } else {
                skinBoxes = [];
            }
        } else {
            skinBoxes = [];
        }

        console.log("Koordinat yang berhasil dikunci:", skinBoxes);
        alert("Groq AI sukses mendeteksi area wajah dan kulit!");

    } catch (error) {
        console.error("Gagal melakukan deteksi lewat Groq:", error);
        alert("Koneksi ke Groq AI gagal. Pastikan GROQ_API_KEY sudah terpasang di Environment Variables project waifu-delta pada dashboard Vercel.");
    }
}

// 3. Fungsi Inti Manipulasi Piksel Warna Kulit (Tanning Engine)
function processImage() {
    if (!originalImage) return;

    // Bersihkan canvas dan gambar ulang gambar asli agar slider bisa digeser bolak-balik secara dinamis
    ctx.drawImage(originalImage, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100; // Mengubah skala slider menjadi 0.0 - 1.0

    // Jika koordinat kosong atau deteksi gagal, lewati pemrosesan visual
    if (!skinBoxes || skinBoxes.length === 0) {
        console.log("Pemrosesan dibatalkan: Koordinat kulit tidak ditemukan.");
        return;
    }

    // Eksekusi perubahan warna untuk setiap box koordinat yang dikirim oleh Groq
    skinBoxes.forEach(box => {
        // Konversi koordinat persentase (0-100) menjadi skala piksel riil pada canvas
        const ymin = Math.max(0, Math.floor((box[0] / 100) * canvas.height));
        const xmin = Math.max(0, Math.floor((box[1] / 100) * canvas.width));
        const ymax = Math.min(canvas.height, Math.floor((box[2] / 100) * canvas.height));
        const xmax = Math.min(canvas.width, Math.floor((box[3] / 100) * canvas.width));

        // Telusuri baris demi baris piksel di dalam batasan kotak koordinat AI
        for (let y = ymin; y < ymax; y++) {
            for (let x = xmin; x < xmax; x++) {
                const i = (y * canvas.width + x) * 4;

                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Hitung nilai rata-rata tingkat kecerahan piksel (Luminance)
                const brightness = (r + g + b) / 3;

                // Proteksi Komponen Esensial: Hanya ubah area kulit/wajah yang cerah
                // Abaikan piksel gelap seperti garis hitam kelopak mata, pupil, alis, atau bayangan rambut tajam
                if (brightness > 60) {
                    
                    // ALGORITMA PENGIKUT WARNA TAN WARM
                    // Untuk meredam filter ambient cahaya biru/ungu yang menempel pada wajah waifu:
                    // Kita potong nilai biru (B) dan hijau (G) secara masif, lalu biarkan nilai merah (R) dominan.
                    data[i]     = r * (1 - factor * 0.22); // Red diturunkan sedikit saja agar tetap hangat
                    data[i + 1] = g * (1 - factor * 0.52); // Green diturunkan sedang
                    data[i + 2] = b * (1 - factor * 0.72); // Blue dipotong tajam untuk membuang tint ungu/biru bawaan
                }
            }
        }
    });

    // Terapkan perubahan data piksel ke canvas utama
    ctx.putImageData(imgData, 0, 0);
}

// 4. Sinkronisasi Slider secara Real-time
darknessSlider.addEventListener('input', processImage);

// 5. Handler untuk Mengunduh Gambar Hasil Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_tanned_output.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
                    
