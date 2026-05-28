const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let segmenter;
let originalImage = null;

// Initialize AI Segmenter (MediaPipe Selfie Segmentation)
async function initAI() {
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
    const segmenterConfig = { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation' };
    segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
    console.log("AI Model Loaded!");
}
initAI();

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

// Jalankan proses manipulasi warna berdasarkan segmentasi AI
async function processImage() {
    if (!originalImage || !segmenter) return;

    // 1. Gambar ulang image asli ke canvas
    ctx.drawImage(originalImage, 0, 0);
    
    // 2. Dapatkan segmentasi (masker tubuh/kulit)
    const segmentation = await segmenter.segmentPeople(canvas);
    const mask = await bodySegmentation.toBinaryMask(segmentation);

    // 3. Ambil data piksel canvas
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const maskData = mask.data; // Berisi nilai 0 atau 255 (area orang/kulit)

    const factor = darknessSlider.value / 100; // 0 sampai 1

    // 4. Lakukan looping pada setiap piksel
    for (let i = 0; i < data.length; i += 4) {
        // Jika piksel termasuk dalam masker AI (area karakter/kulit)
        if (maskData[i] === 255) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Algoritma akurat: kurangi kecerahan (Luminance) tapi pertahankan tone warna asli
            // Agar tidak merubah baju/rambut terlalu ekstrem, kita filter warna kulit (opsional)
            // Di sini kita turunkan RGB secara proporsional berdasarkan slider
            data[i]     = r * (1 - factor * 0.4); // Menggelapkan merah
            data[i + 1] = g * (1 - factor * 0.5); // Menggelapkan hijau lebih banyak untuk efek kecoklatan
            data[i + 2] = b * (1 - factor * 0.6); // Menggelapkan biru agar menghasilkan tone warm/tan
        }
    }

    // 5. Masukkan kembali data piksel yang sudah diubah ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Update otomatis saat slider digeser
darknessSlider.addEventListener('input', processImage);

// Download Handler
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu-melanin.png';
    link.href = canvas.toDataURL();
    link.click();
});
