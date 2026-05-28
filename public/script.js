const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;

// 1. Ambil dan Tampilkan Gambar Secara Instan Saat Dipilih
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Bersihkan kanvas lama, gambar yang baru langsung dimuat tanpa lag
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            // Munculkan tombol kontrol instan
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fungsi Pembantu: Konversi RGB ke format HSV untuk akurasi isolasi warna rambut
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, v * 100];
}

// 2. Mesin Tanning Presisi (Mengunci Shading Bawaan & Melindungi Rambut Putih/Baju)
function triggerTanning() {
    if (!originalImage) return;

    // Kembalikan ke kondisi asli sebelum manipulasi warna
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // TARGET EMULASI COKELAT MATANG DAN EKSOTIS SEPERTI GAMBAR CONTOHMU (772534.jpg)
    // Formula multiplier rendah menjaga kontur bayangan gelap bawaan ilustrasi
    const targetR = 0.34; 
    const targetG = 0.20; 
    const targetB = 0.15; 

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // A. AMANKAN OUTLINE HITAM & WARNA GELAP (Garis gambar, mata, rambut hitam, bayangan baju tua)
        if (r < 50 && g < 50 && b < 50) continue;

        // B. AMANKAN BAJU BIRU / RAMBUT UNGU (Komponen Biru dominan tinggi tidak boleh disentuh)
        if (b > r && b > g && b > 80) continue;

        // C. AMANKAN RAMBUT PUTIH / ABU / BG PUTIH NETRAL (Selisih warna seimbang)
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        const brightness = (r + g + b) / 3;
        if (maxDiff < 10 && brightness > 120) continue; 

        // D. VALIDASI KULIT ANIME GLOBAL (Rona hangat dominasi warna merah)
        // Kulit wajah, leher, telinga, dan tangan pada anime selalu memiliki rasio R > G dan G >= B - 12
        const [h, s, v] = rgbToHsv(r, g, b);
        const isSkinTone = (h >= 0 && h <= 32) && (s >= 8 && s <= 65) && (v >= 30);

        if (isSkinTone) {
            // Terapkan perkalian warna eksotis hangat per piksel
            data[i]     = Math.round(r * targetR + (r * 0.05)); 
            data[i + 1] = Math.round(g * targetG + (g * 0.03));
            data[i + 2] = Math.round(b * targetB + (b * 0.02));
        }
    }

    // Masukkan kembali hasil pemrosesan piksel yang bersih ke canvas
    ctx.putImageData(imgData, 0, 0);
}

tanBtn.addEventListener('click', triggerTanning);

// Handler Download Hasil Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
