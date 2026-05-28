const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;

// 1. Handler Membaca Gambar Saat Dipilih
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
            ctx.drawImage(img, 0, 0);
            
            // Langsung tampilkan tombol secara instan
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Mesin Tanning Global Berbasis Rasio Kontras Kulit Anime
function triggerTanning() {
    if (!originalImage) return;

    // Reset kanvas ke kondisi original sebelum diwarnai ulang
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // NILAI MULTIPLIER UNTUK MENGHASILKAN COKLAT TUA PEKAT NATURAL (Sesuai Target Gambar 772534.jpg)
    // Formula ini mempertahankan garis gelap (line art) dan gradasi pencahayaan asli objek
    const targetR = 0.35; 
    const targetG = 0.22; 
    const targetB = 0.16; 

    // Pindai seluruh piksel dari ujung ke ujung gambar secara menyeluruh
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // A. PROTEKSI OUTLINE & AREA GELAP (Garis gambar, mata, rambut hitam, bayangan baju pekat)
        if (r < 55 && g < 55 && b < 55) continue;

        // B. PROTEKSI WARNA NETRAL (Rambut putih/abu-abu Arisu, latar belakang putih, baju putih murni)
        // Karakteristik warna netral: Nilai selisih antara komponen R, G, dan B sangat kecil
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        if (maxDiff < 10) continue;

        // C. FORMULA RATIO KULIT ANIME (Mengunci rona hangat kulit dan leher)
        // Kulit anime memiliki ciri khas: Komponen Merah selalu mendominasi Hijau, 
        // dan Hijau selalu lebih tinggi atau setara dengan Biru dengan batas toleransi tertentu.
        const isAnimeSkin = (r > g) && (g > b - 10) && (r - g > 15) && (r > 60);

        if (isAnimeSkin) {
            // Campurkan rona gelap eksotis secara presisi per piksel
            data[i]     = Math.round(r * targetR + (r * 0.08)); 
            data[i + 1] = Math.round(g * targetG + (g * 0.05));
            data[i + 2] = Math.round(b * targetB + (b * 0.03));
        }
    }

    // Terapkan kembali seluruh data piksel baru ke layar canvas
    ctx.putImageData(imgData, 0, 0);
}

// Handler klik tombol instan
tanBtn.addEventListener('click', triggerTanning);

// Handler Download Hasil Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
