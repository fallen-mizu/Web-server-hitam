const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;

// 1. Handler Upload Gambar
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
            
            // Tampilkan tombol instan langsung tanpa menunggu Groq Box
            if(tanBtn) tanBtn.classList.remove('hidden');
            if(downloadBtn) downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fungsi Konversi RGB ke HSV untuk seleksi warna kulit akurat
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

// 2. Mesin Pindai Kulit Global (Akurat & Pekat)
function triggerTanning() {
    if (!originalImage) return;

    // Reset kanvas ke kondisi original
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // TARGET EMULASI WARNA COKLAT MATANG SEPERTI GAMBAR CONTOH (772534.jpg)
    // Menurunkan tingkat kecerahan kulit secara masif namun menjaga rona merah/hangat asli
    const targetR = 0.28; 
    const targetG = 0.18; 
    const targetB = 0.15; 

    // Pindai 100% piksel gambar secara menyeluruh tanpa batas kotak AI
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Amankan area super gelap seperti garis komik / mata / baju hitam
        if (r < 45 && g < 45 && b < 45) continue;

        // Amankan putih mata dan baju putih bersih
        if (r > 220 && g > 220 && b > 220 && Math.abs(r - g) < 5 && Math.abs(g - b) < 5) continue;

        // Konversi warna piksel ke format HSV
        const [h, s, v] = rgbToHsv(r, g, b);

        // KUNCI SPEKTRUM KULIT ANIMESecara Global:
        // Hue kulit manusia/anime berada di rentang 0 (merah) sampai 34 (oranye/krem)
        // Saturation minimal 6% agar warna putih netral/abu-abu (seperti rambut Arisu) tidak ikut terkena
        const isAnimeSkin = (h >= 0 && h <= 34) && (s >= 6 && s <= 65) && (v >= 25);

        if (isAnimeSkin) {
            // Efek seleksi transisi gradasi agar bagian pinggir shading mulus
            let weight = 1.0;
            if (h > 28) weight *= (34 - h) / 6; // Menghaluskan transisi di warna kekuningan

            // Eksekusi perpaduan warna deep tanning
            data[i]     = Math.round(r * (1 - weight) + (r * targetR) * weight);
            data[i + 1] = Math.round(g * (1 - weight) + (g * targetG) * weight);
            data[i + 2] = Math.round(b * (1 - weight) + (b * targetB) * weight);
        }
    }

    // Terapkan hasil modifikasi warna ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Event listener tombol
tanBtn.addEventListener('click', triggerTanning);

// Event listener download gambar
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_global_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
