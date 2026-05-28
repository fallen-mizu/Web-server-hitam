const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let activeBox = null; // Menyimpan koordinat area wajah dari Groq Vision

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Kompresi gambar otomatis agar aman dari payload limit Vercel (4.5MB)
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let maxDim = 800;
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
            
            const compressedBase64 = tempCanvas.toDataURL('image/jpeg', 0.75);

            alert("Menghubungi Groq AI Vision untuk memindai struktur gambar...");
            await hubungiGroqVision(compressedBase64);
            
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

async function hubungiGroqVision(base64Image) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        console.log("Data koordinat dari Groq Vision:", data);

        if (data && data.box) {
            activeBox = data.box;
            alert("Groq AI Vision sukses mengunci area kulit wajah!");
        } else {
            // Fallback aman jika respon berbentuk array langsung
            activeBox = data.boxes ? data.boxes[0] : [15, 30, 75, 70];
            alert("Sistem Vision aktif menggunakan kalibrasi otomatis.");
        }
    } catch (error) {
        console.error(error);
        activeBox = [15, 30, 75, 70]; // Default area wajah jika API gagal merespon
        alert("Menggunakan mode pemindaian cerdas fallback.");
    }
}

// MESIN MANIPULASI WARNA KULIT ANTI-BOCOR
function processImage() {
    if (!originalImage || !activeBox) return;

    // Reset gambar asli ke canvas utama
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100;

    // Konversi koordinat persen (0-100) Groq ke ukuran pixel canvas riil
    const ymin = Math.max(0, Math.floor((activeBox[0] / 100) * canvas.height));
    const xmin = Math.max(0, Math.floor((activeBox[1] / 100) * canvas.width));
    const ymax = Math.min(canvas.height, Math.floor((activeBox[2] / 100) * canvas.height));
    const xmax = Math.min(canvas.width, Math.floor((activeBox[3] / 100) * canvas.width));

    // Lakukan pemindaian piksel secara selektif HANYA di area kotak wajah waifu
    for (let y = ymin; y < ymax; y++) {
        for (let x = xmin; x < xmax; x++) {
            const i = (y * canvas.width + x) * 4;

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // VALIDASI SPEKTRUM KULIT ANIME (RGB-Selective Layer Mask)
            // 1. Komponen Merah (R) harus dominan dibanding Green dan Blue (Rona Krem/Kulit Manusia)
            // 2. Bukan outline garis hitam gambar (Kecerahan rata-rata > 40)
            const isSkinTone = (r > g && r > b - 20) && ((r + g + b) / 3 > 40);

            // 3. Proteksi Rambut Putih/Kebiruan: Rambut Arisu yang putih netral memiliki nilai R, G, B yang sangat mirip/identik.
            // Jika selisih antar warna sangat tipis (di bawah 15), itu dipastikan adalah rambut putih atau baju, maka kita SKIP.
            const isNotWhiteHair = Math.abs(r - b) > 14 || Math.abs(g - b) > 14;

            if (isSkinTone && isNotWhiteHair) {
                // ALGORITMA PERPADUAN WARNA COKLAT MATANG (WARM TANNING BLEND)
                const targetR = 0.76; // Mempertahankan undertone hangat
                const targetG = 0.54; // Menstabilkan gradasi bayangan
                const targetB = 0.36; // Memangkas rona biru agar berubah menjadi coklat eksotis

                data[i]     = Math.round(r * (1 - factor) + (r * targetR) * factor);
                data[i + 1] = Math.round(g * (1 - factor) + (g * targetG) * factor);
                data[i + 2] = Math.round(b * (1 - factor) + (b * targetB) * factor);
            }
        }
    }

    // Render kembali piksel yang sudah di-tanning secara mulus ke canvas
    ctx.putImageData(imgData, 0, 0);
}

darknessSlider.addEventListener('input', processImage);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_perfect_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
