const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const darknessSlider = document.getElementById('darkness');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = null;

// Sembunyikan status loading karena kita tidak butuh AI luar lagi
const loadingStatus = document.getElementById('loadingStatus');
if (loadingStatus) loadingStatus.classList.add('hidden');

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

// Fungsi Konversi RGB ke HSL untuk seleksi warna kulit yang akurat
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

// Fungsi Utama: Mengubah warna kulit waifu secara presisi
function processImage() {
    if (!originalImage) return;

    // Gambar ulang gambar asli ke canvas
    ctx.drawImage(originalImage, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const factor = darknessSlider.value / 100; // Nilai slider 0 - 1

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Konversi piksel ke HSL (Hue, Saturation, Lightness)
        const [h, s, l] = rgbToHsl(r, g, b);

        // DETEKSI KULIT ANIME YANG SANGAT AKURAT:
        // Kulit waifu umumnya berada di rentang warna Orange-Merah (Hue: 10 - 45)
        // Memiliki saturasi sedang (S: 15% - 80%) dan sangat cerah (L: > 50%)
        const isSkin = (h >= 10 && h <= 45) && (s >= 15 && s <= 85) && (l > 50);

        if (isSkin) {
            // RUMUS MEWARNAI KULIT MENJADI TAN/COKLAT MATANG
            // Kita turunkan Lightness (kecerahan) agar gelap
            let newL = l - (factor * 35); 
            if (newL < 15) newL = 15; // Batas agar tidak hitam pekat gosong

            // Kita naikkan Saturation agar warna coklatnya hidup (eksotis) dan tidak abu-abu
            let newS = s + (factor * 20);
            if (newS > 90) newS = 90;

            // Konversi kembali dari HSL ke RGB untuk dimasukkan ke Canvas
            const hRad = h / 360;
            const sRad = newS / 100;
            const lRad = newL / 100;

            let rTemp, gTemp, bTemp;
            if (sRad === 0) {
                rTemp = gTemp = bTemp = lRad;
            } else {
                const q = lRad < 0.5 ? lRad * (1 + sRad) : lRad + sRad - lRad * sRad;
                const p = 2 * lRad - q;
                
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                rTemp = hue2rgb(p, q, hRad + 1/3);
                gTemp = hue2rgb(p, q, hRad);
                bTemp = hue2rgb(p, q, hRad - 1/3);
            }

            data[i]     = Math.round(rTemp * 255);
            data[i + 1] = Math.round(gTemp * 255);
            data[i + 2] = Math.round(bTemp * 255);
        }
    }

    // Tampilkan hasil perubahan ke canvas
    ctx.putImageData(imgData, 0, 0);
}

// Jalankan fungsi setiap kali slider digeser
darknessSlider.addEventListener('input', processImage);

// Download Handler
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu-tan-presisi.png';
    link.href = canvas.toDataURL();
    link.click();
});
