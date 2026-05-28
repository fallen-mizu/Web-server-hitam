const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;
let modelAIWajah = null; // Menyimpan model Google Face AI

// LANGKAH 1: Muat Model Google AI Secara Otomatis Saat Halaman Terbuka
async function muatGoogleAI() {
    console.log("Sedang memuat Google MediaPipe Face Mesh AI...");
    try {
        if(loadingStatus) {
            loadingStatus.classList.remove('hidden');
            loadingText.innerText = "Memuat Google AI Wajah (Tunggu)...";
        }
        
        modelAIWajah = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            { runtime: 'tfjs', refineLandmarks: true }
        );
        
        console.log("Google MediaPipe AI Siap Digunakan!");
        if(loadingStatus) loadingStatus.classList.add('hidden');
    } catch (error) {
        console.error("Gagal memuat Google AI:", error);
        if(loadingText) loadingText.innerText = "Eror: Google AI Gagal Memuat.";
    }
}
muatGoogleAI(); // Jalankan fungsi muat AI

// LANGKAH 2: Ambil Gambar Saat Pengguna Memilih File
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
            
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// LANGKAH 3: Mesin Tanning Berbasis Topeng AI Google (ANTI-BOCOR!)
async function triggerTanning() {
    if (!originalImage || !modelAIWajah) {
        alert("Silakan tunggu sampai Google AI selesai memuat atau pilih gambar.");
        return;
    }

    // Reset kanvas ke kondisi gambar original asli
    ctx.drawImage(originalImage, 0, 0);

    // AI mendeteksi struktur wajah pada gambar waifu kamu
    const predictions = await modelAIWajah.estimateFaces(canvas);

    if (predictions.length === 0) {
        alert("AI Google tidak berhasil menemukan wajah pada gambar ini. Pastikan wajah waifu terlihat jelas.");
        return;
    }

    console.log("Struktur wajah sukses dikunci oleh AI Google.");

    // Buat Topeng Seleksi (Masking) transparan berbasis anatomi wajah AI
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    // Gambar topeng hitam pekat berdasarkan titikperimeter wajah luar
    maskCtx.fillStyle = 'black';
    maskCtx.beginPath();
    
    // Titik perimeter luar wajah (indeks 0 sampai 36 di library MediaPipe)
    predictions[0].keypoints.forEach((pt, index) => {
        if (index < 36) { // Titik perimeter dahi, rahang, dan dagu
            if (index === 0) maskCtx.moveTo(pt.x, pt.y);
            else maskCtx.lineTo(pt.x, pt.y);
        }
    });
    
    maskCtx.closePath();
    maskCtx.fill();

    // Lakukan manipulasi piksel warna coklat pekat HANYA di area topeng wajah
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height).data;
    const data = imgData.data;

    // Multiplier warna coklat pekat eksotis yang tebal dan matang (#3D231F style)
    const targetR = 0.32;
    const targetG = 0.19;
    const targetB = 0.15;

    for (let i = 0; i < data.length; i += 4) {
        // Jika piksel ini berada di dalam area topeng hitam pekat (area kulit wajah yang divalidasi AI)
        if (maskData[i + 3] > 0) { 
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Proteksi agar warna garis komik hitam kaku dan putih mata tidak ikut hitam kaku
            const brightness = (r + g + b) / 3;
            if (brightness < 40 || (r > 210 && g > 210 && b > 21
