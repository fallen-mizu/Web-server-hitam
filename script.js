const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinBoxes = []; // Menyimpan array koordinat [ymin, xmin, ymax, xmax]

// 1. Handle proses Upload Gambar
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            
            // Set resolusi canvas sesuai ukuran gambar asli
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Gambar awal ke canvas
            ctx.drawImage(img, 0, 0);
            
            // Ambil data base64 untuk dikirim ke backend Groq
            const base64Data = event.target.result;
            
            // Panggil API Groq di backend Vercel
            await dapatkanKoordinatKulit(base64Data);
            
            // Jalankan manipulasi warna & munculkan tombol download
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Fungsi untuk menembak API Backend Groq AI Vision
async function dapatkanKoordinatKulit(base64Image) {
    try {
        console.log("Mengirim gambar ke Groq AI Vision...");
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) throw new Error("Serverless function api/chat error");

        const data = await response.json();
        console.log("Respon kasar dari server:", data);

        // Validasi dan amankan ekstraksi koordinat box dari Groq
        if (data && data.boxes) {
            skinBoxes = data.boxes;
        } else if (Array.isArray(data)) {
            skinBoxes = data;
        } else {
            skinBoxes = [];
        }

        console.log("Koordinat kulit berhasil dikunci:", skinBoxes);
        alert("Groq AI selesai menganalisis posisi kulit waifu!");

    } catch (error) {
        console.error("Gagal mendapatkan koordinat:", error);
        alert("Koneksi ke Groq AI gagal atau API Key belum terpasang di Vercel.");
    }
}

// 3. Fungsi utama pemrosesan warna piksel (Tanning / Penghitaman)
function processImage() {
    if (!originalImage) return;

    // Gambar ulang data asli agar slider bisa digeser bolak-balik tanpa menumpuk efek
    ctx.drawImage(originalImage, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100; // Skala slider (0.0 - 1.0)

    // Jika AI belum mengembalikan koordinat atau gagal, stop proses agar tidak error
    if (!skinBoxes || skinBoxes.length === 0) {
        return;
    }

    // Lakukan perulangan untuk setiap kotak (box) wajah/kulit yang ditemukan Groq
    skinBoxes.forEach(box => {
        // Konversi koordinat persen (0-100) dari Groq menjadi ukuran piksel canvas sesungguhnya
        const ymin = Math.max(0, Math.floor((box[0] / 100) * canvas.height));
        const xmin = Math.max(0, Math.floor((box[1] / 100) * canvas.width));
        const ymax = Math.min(canvas.height, Math.floor((box[2] / 100) * canvas.height));
        const xmax = Math.min(canvas.width, Math.floor((box[3] / 100) * canvas.width));

        // Telusuri piksel khusus di dalam area koordinat kotak tersebut
        for (let y = ymin; y < ymax; y++) {
            for (let x = xmin; x < xmax; x++) {
                const i = (y * canvas.width + x) * 4;

                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Hitung tingkat kecerahan piksel (0 - 255)
                const brightness = (r + g + b) / 3;

                // Proteksi: Hanya ubah piksel yang terang (Wajah/Kulit asli) 
                // Abaikan piksel gelap (Garis mata, bola mata hitam, atau outline rambut)
                if (brightness > 55) {
                    
                    // ALGORITMA PENGIKUT WARNA MELANIN/TAN EXOTIC
                    // Memotong warna biru (B) dan hijau (G) secara agresif untuk membuang tint cahaya biru,
                    // lalu mempertahankan warna merah (R) agar menghasilkan tone kecoklatan yang hangat.
                    data[i]     = r * (1 - factor * 0.25); // Red dikurangi tipis
                    data[i + 1] = g * (1 - factor * 0.52); // Green dikurangi sedang
                    data[i + 2] = b * (1 - factor * 0.72); // Blue dikurangi tajam
                }
            }
        }
    });

    // Perbarui visual canvas dengan data piksel baru
    ctx.putImageData(imgData, 0, 0);
}

// 4. Jalankan perubahan secara real-time saat slider digeser
darknessSlider.addEventListener('input', processImage);

// 5. Handler untuk mengunduh hasil gambar
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_melanin_processed.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
        
