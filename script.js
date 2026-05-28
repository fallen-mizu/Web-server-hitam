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

        // Konversi ke HSL
        const [h, s, l] = rgbToHsl(r, g, b);

        // DETEKSI KULIT YANG DIPERLUAS (Mendukung efek cahaya biru/ungu/bayangan anime)
        // 1. Deteksi kulit normal (Orange-Merah hangat)
        const isWarmSkin = (h >= 0 && h <= 50) && (s >= 10 && s <= 90) && (l > 40);
        
        // 2. Deteksi kulit di bawah pencahayaan dingin/biru/ungu (seperti gambar kamu)
        // Kulit yang terkena tint biru/violet biasanya bergeser ke Hue pink/magenta/indigo (300-355) 
        // atau memiliki nilai Red dan Blue yang relatif tinggi dan dekat dibanding Green (R > G && B > G)
        const isCoolSkinTint = (h >= 300 && h <= 360) && (s >= 10 && s <= 80) && (l > 35);
        
        // 3. Deteksi kondisi pixel spesifik: Kulit waifu di area teduh biasanya sangat cerah 
        // namun nilai RGB-nya berdekatan dengan dominasi merah tipis
        const isBrightSkin = (r > 140 && g > 110 && b > 110) && (r > g) && (Math.abs(g - b) < 40);

        // Gabungkan semua kondisi deteksi kulit
        if (isWarmSkin || isCoolSkinTint || isBrightSkin) {
            
            // Jaga agar rambut putih/kebiruan dan latar belakang emas tidak ikut hancur:
            // Kita filter agar tidak mengenai warna kuning terang latar belakang atau putih rambut murni
            if (h >= 45 && h <= 70 && l > 70) continue; // Skip background emas/kuning cerah
            if (s < 12 && l > 75) continue; // Skip rambut putih/abu-abu netral yang terlalu terang

            // RUMUS MENGUBAH TONE MENJADI TAN/MELANIN
            // Menurunkan Lightness secara logis agar bayangan gradasi asli anime tidak hilang
            let newL = l - (factor * 38); 
            if (newL < 12) newL = 12; 

            // Naikkan saturasi warna merah-oranye untuk memberikan efek kulit eksotis hangat,
            // sekaligus mematikan sisa tint biru/ungu pada kulit asli
            let newH = h;
            if (h > 300 || h < 10) {
                newH = 20; // Belokkan rona warna pink/ungu kulit tadi ke arah Orange hangat (20)
            }
            
            let newS = s + (factor * 25);
            if (newS > 85) newS = 85;

            // Konversi kembali HSL ke RGB
            const hRad = newH / 360;
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
