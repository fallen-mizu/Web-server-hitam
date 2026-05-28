const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;

// Handle Image Upload
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
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fungsi manipulasi warna kulit anime berbasis Pixel-Color Filter
function processImage() {
    if (!originalImage) return;

    // 1. Gambar ulang image asli ke canvas agar slider bisa digeser bolak-balik
    ctx.drawImage(originalImage, 0, 0);
    
    // 2. Ambil data piksel canvas
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Ambil nilai dari slider (0 sampai 1)
    const factor = darknessSlider.value / 100; 

    // 3. Lakukan looping pada setiap piksel gambar
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // DETEKSI WARNA KULIT ANIME (Krem, Putih, Merah Muda Pucat)
        // Karakteristik kulit anime umumnya: R > G, G > B, dan tingkat kecerahan tinggi.
        const isSkinColor = (r > 60 && g > 40 && b > 30) && 
                            (r > g && g >= b) && 
                            (r - g >= 15) && 
                            (r > 120); // Menandakan area terang/kulit

        if (isSkinColor) {
            // Rumus mengubah tone menjadi coklat/melanin matang
            // Mengurangi persentase RGB secara proporsional agar bayangan asli waifu tidak hilang
            data[i]     = r * (1 - factor * 0.35); // Kurangi merah sedikit (agar tetap hangat/warm tone)
            data[i + 1] = g * (1 - factor * 0.50); // Kurangi hijau lebih banyak
            data[i + 2] = b * (1 - factor * 0.65); // Kurangi biru paling banyak (menciptakan warna eksotis/tan)
        }
    }

    // 4. Masukkan kembali data piksel yang sudah diubah ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Jalankan fungsi setiap kali slider digeser
darknessSlider.addEventListener('input', processImage);

// Download Handler
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu-melanin.png';
    link.href = canvas.toDataURL();
    link.click();
});
