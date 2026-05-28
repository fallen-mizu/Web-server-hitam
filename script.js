const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;
let skinBoxes = []; // Menyimpan koordinat kulit dari Groq

// Handle Image Upload
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
            originalImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Tampilkan loading pas manggil Groq
            alert("Groq AI sedang mendeteksi struktur wajah dan kulit waifu...");
            await getSkinCoordinatesFromGroq(event.target.result);
            
            processImage();
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fungsi menembak API Groq Vision
async function getSkinCoordinatesFromGroq(base64Image) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        const data = await response.json();
        
        // Asumsikan Groq mengembalikan object berisi array koordinat, e.g., { boxes: [[ymin, xmin, ymax, xmax]] }
        skinBoxes = data.boxes || [];
        alert("Groq AI Berhasil mendeteksi kulit!");
    } catch (error) {
        console.error("Error Groq:", error);
        alert("Gagal koneksi ke Groq AI.");
    }
}

// Proses pewarnaan berdasarkan Koordinat Presisi dari Groq
function processImage() {
    if (!originalImage) return;

    // Reset gambar asli
    ctx.drawImage(originalImage, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100;

    if (skinBoxes.length === 0) return;

    // Loop koordinat yang dideteksi Groq
    skinBoxes.forEach(box => {
        // Konversi dari persen (0-100) ke piksel canvas asli
        const ymin = Math.floor((box[0] / 100) * canvas.height);
        const xmin = Math.floor((box[1] / 100) * canvas.width);
        const ymax = Math.floor((box[2] / 100) * canvas.height);
        const xmax = Math.floor((box[3] / 100) * canvas.width);

        // Hanya manipulasi piksel di dalam kotak koordinat dari Groq
        for (let y = ymin; y < ymax; y++) {
            for (let x = xmin; x < xmax; x++) {
                const i = (y * canvas.width + x) * 4;

                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Di dalam kotak wajah/kulit ini, kita lakukan seleksi warna cerah 
                // agar rambut/baju di area sekitar kotak tidak ikut hancur secara ekstrem
                if (r > 100 && g > 80) { 
                    data[i]     = r * (1 - factor * 0.45); // Coklat eksotis
                    data[i + 1] = g * (1 - factor * 0.60);
                    data[i + 2] = b * (1 - factor * 0.75);
                }
            }
        }
    });

    ctx.putImageData(imgData, 0, 0);
}

darknessSlider.addEventListener('input', processImage);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu-groq-tan.png';
    link.href = canvas.toDataURL();
    link.click();
});
