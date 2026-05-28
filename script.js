const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');

let bodySegmenter;
let faceDetector;
let originalImage = null;

// Initialize AI Models
async function initAI() {
    loadingStatus.classList.remove('hidden');
    
    // 1. Load Body Segmenter (lebih detail dari selfie segmentation)
    const bodyModel = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation; 
    const bodyConfig = { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation' };
    bodySegmenter = await bodySegmentation.createSegmenter(bodyModel, bodyConfig);

    // 2. Load Face Detector
    const faceModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const faceConfig = { runtime: 'mediapipe', refineLandmarks: false, solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh' };
    faceDetector = await faceLandmarksDetection.createDetector(faceModel, faceConfig);

    console.log("AI Models Loaded!");
    loadingStatus.classList.add('hidden');
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

async function processImage() {
    if (!originalImage || !bodySegmenter || !faceDetector) return;

    // 1. Gambar ulang image asli ke canvas
    ctx.drawImage(originalImage, 0, 0);
    
    // 2. DAPATKAN MASKER TUBUH (Body Segmentation)
    const bodySegmentationRes = await bodySegmenter.segmentPeople(canvas);
    const bodyMask = await bodySegmentation.toBinaryMask(bodySegmentationRes);

    // 3. DAPATKAN MASKER WAJAH (Face Detection)
    // Untuk wajah, kita perlu membuat masker sendiri berdasarkan bounding box wajah yang dideteksi
    const faces = await faceDetector.estimateFaces(canvas);
    
    // 4. Ambil data piksel canvas
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const bodyMaskData = bodyMask.data; // Nilai 0 (BG) atau 255 (Body)

    // Buat canvas sementara untuk masker wajah
    const faceMaskCanvas = document.createElement('canvas');
    faceMaskCanvas.width = canvas.width;
    faceMaskCanvas.height = canvas.height;
    const faceMaskCtx = faceMaskCanvas.getContext('2d');
    faceMaskCtx.fillStyle = 'black'; // Default, tidak ada wajah
    faceMaskCtx.fillRect(0, 0, faceMaskCanvas.width, faceMaskCanvas.height);

    if (faces.length > 0) {
        faceMaskCtx.fillStyle = 'white'; // Gambar area wajah dengan putih
        faces.forEach(face => {
            // Gunakan bounding box wajah untuk membuat masker sederhana
            const box = face.box;
            // Sedikit diperkecil/disesuaikan agar tidak mengenai rambut
            const shrinkFactor = 0.1; 
            const widthShrink = box.width * shrinkFactor;
            const heightShrink = box.height * shrinkFactor;
            
            faceMaskCtx.beginPath();
            faceMaskCtx.ellipse(
                box.x + box.width/2, 
                box.y + box.height/2, 
                (box.width - widthShrink)/2, 
                (box.height - heightShrink)/2, 
                0, 0, 2*Math.PI
            );
            faceMaskCtx.fill();
        });
    }
    
    const faceMaskData = faceMaskCtx.getImageData(0, 0, canvas.width, canvas.height).data;
    const factor = darknessSlider.value / 100; // 0 sampai 1

    // 5. LAKUKAN LOOPING PADA SETIAP PIKSEL DENGAN LOGIKA PRESEISI
    for (let i = 0; i < data.length; i += 4) {
        // Logika Masker:
        // - Piksel ada di area tubuh (bodyMaskData[i] === 255)
        // - DAN Piksel BUKAN di area wajah (faceMaskData[i] < 128) -> Kita gunakan threshold 128 karena faceMaskData adalah grayscale
        
        const isBody = bodyMaskData[i] === 255;
        const isNotFace = faceMaskData[i] < 128; // Dianggap bukan wajah jika maskernya gelap

        if (isBody && isNotFace) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Terapkan efek kegelapan hanya pada area ini
            // Gunakan rumus yang lebih halus agar tidak merusak baju secara total jika terdeteksi
            data[i]     = r * (1 - factor * 0.4); // Menggelapkan merah
            data[i + 1] = g * (1 - factor * 0.5); // Menggelapkan hijau lebih banyak
            data[i + 2] = b * (1 - factor * 0.6); // Menggelapkan biru paling banyak
        }
    }

    // 6. Masukkan kembali data piksel yang sudah diubah ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Update otomatis saat slider digeser
darknessSlider.addEventListener('input', processImage);

// Download Handler
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu-melanin-accurate.png';
    link.href = canvas.toDataURL();
    link.click();
});
