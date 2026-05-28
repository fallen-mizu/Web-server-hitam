const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let originalImage = null;
let activeBox = null; 

// 1. Jalankan upload gambar
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
            
            // Kompresi otomatis bypass Vercel payload limit (4.5MB)
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

            // Munculkan animasi loading Tailwind di atas canvas
            loadingStatus.classList.remove('hidden');
            loadingText.innerText = "Groq AI Vision sedang memindai wajah...";
            
            await hubungiGroqVision(compressedBase64);
            
            // Sembunyikan loading, munculkan tombol kontrol instan
            loadingStatus.classList.add('hidden');
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Hubungi backend Groq Vision resmi
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
        } else {
            activeBox = data.boxes ? data.boxes[0] : [10, 25, 80, 75];
        }
    } catch (error) {
        console.error(error);
        activeBox = [10, 25, 80, 75]; // Fallback area wajah standar
    }
}

// 3. Fungsi Eksekusi Tanning Sekali Klik
function triggerTanning() {
    if (!originalImage || !activeBox) return;

    // Kembalikan ke kondisi asli sebelum pewarnaan biar tidak menumpuk
    ctx.drawImage(originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Nilai kegelapan dikunci di angka 0.72 (Hasil Tan Coklat Matang Eksotis Terbaik)
    const factor = 0.72; 

    // Konversi koordinat persen Groq ke pixel canvas riil
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

            // Filter rona kulit anime dengan toleransi lighting ungu/biru
            const isSkinTone = (r > g - 15) && (r > b - 25) && ((r + g + b) / 3 > 30);

            // Amankan outline hitam garis gambar
            const isNotDarkOutline = !(r < 35 && g < 35 && b < 35);

            // Amankan rambut putih Arisu
            const isNotWhiteHair = Math.abs(r - g) > 6 || Math.abs(r - b) > 6;

            if (isSkinTone && isNotDarkOutline && isNotWhiteHair) {
                const targetR = 0.75; 
                const targetG = 0.52; 
                const targetB = 0.35; 

                data[i]     = Math.round(r * (1 - factor) + (r * targetR) * factor);
                data[i + 1] = Math.round(g * (1 - factor) + (g * targetG) * factor);
                data[i + 2] = Math.round(b * (1 - factor) + (b * targetB) * factor);
            }
        }
    }

    // Terapkan data warna baru ke layar canvas
    ctx.putImageData(imgData, 0, 0);
}

// Event listener tombol instan
tanBtn.addEventListener('click', triggerTanning);

// Event listener download gambar
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_instant_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
