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
        alert("Koneksi ke Groq AI gagal atau API Key bermasalah.");
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

    if (!skinBoxes || skinBoxes.length === 0) {
        console.log("Pemrosesan dibatalkan: Koordinat kulit tidak ditemukan.");
        return;
    }

    // Fungsi pembantu konversi RGB ke HSL untuk menyeleksi kulit secara presisi
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } 
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
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

                // Konversi piksel ke HSL untuk deteksi akurat
                const [h, s, l] = rgbToHsl(r, g, b);

                // FILTER PEMISAH KULIT VS RAMBUT (Menghindari efek kotak kaku)
                // Piksel kulit asli waifu di dalam pencahayaan ungu/biru umumnya:
                // - Cukup cerah (Lightness > 58)
                // - Memiliki tone hangat (Nilai Red lebih besar dari Green dan Blue)
                // - Bukan warna putih/abu-abu netral tipis milik rambut (Saturation > 8)
                const isSkinColor = (l > 58) && (r > g) && (r > b - 10) && (s > 8);

                // Proteksi tambahan: Singkirkan aksesoris pita biru tua dan background emas di sekitar kepala
                const isNotBlueAccessory = !(h > 200 && h < 260 && l < 50);
                const isNotBackgroundGold = !(h > 40 && h < 65 && l > 65);

                if (isSkinColor && isNotBlueAccessory && isNotBackgroundGold) {
                    
                    // ALGORITMA PENGIKUT WARNA TAN WARM
                    // Kurangi tingkat kecerahan sebanding dengan nilai slider
                    let newL = l - (factor * 35);
                    if (newL < 15) newL = 15; // Batas aman agar tidak menjadi hitam legam

                    // Belokkan Hue ke arah spektrum orange/kulit matang hangat (sekitar 22 derajat)
                    let newH = (h > 300 || h < 35) ? 22 : h;
                    let newS = s + (factor * 20);
                    if (newS > 85) newS = 85;

                    // Konversi balik dari HSL ke RGB untuk diterapkan ke canvas
                    const hRad = newH / 360;
                    const sRad = newS / 100;
                    const lRad = newL / 100;

                    let rTemp, gTemp, bTemp;
                    if (sRad === 0) {
                        rTemp = gTemp = bTemp = lRad;
                    } else {
                        const q = lRad < 0.5 ? lRad * (1 + sRad) : lRad + sRad - lRad * sRad;
                        const p = 2 * lRad - q;
                        const hue2rgb = (p, q, t) => {
                            if (t < 0) t += 1;
                            if (t > 1) t -= 1;
                            if (t < 1/6) return p + (q - p) * 6 * t;
                            if (t < 1/2) return q;
                            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                            return p;
                        };
                        rTemp = hue2rgb(p, q, hRad + 1/3);
                        gTemp = hue2rgb(p, q, hRad);
                        bTemp = hue2rgb(p, q, hRad - 1/3);
                    }

                    data[i]     = Math.round(rTemp * 255);
                    data[i + 1] = Math.round(gTemp * 255);
                    data[i + 2] = Math.round(bTemp * 255);
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
                              
