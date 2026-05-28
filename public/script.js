const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let currentBase64Image = null;

// 1. Ambil Gambar Saat Pengguna Memilih File
upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Simpan base64 gambar asli untuk dikirim ke backend
            currentBase64Image = event.target.result;

            // Tampilkan tombol pemroses
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Kirim ke Server Cloudflare Worker untuk Diproses Segmind API Sekali Klik
async function triggerTanning() {
    if (!currentBase64Image) {
        alert("Silakan pilih gambar terlebih dahulu.");
        return;
    }

    try {
        // Tampilkan indikator loading proses AI
        if (loadingStatus) {
            loadingStatus.classList.remove('hidden');
            loadingText.innerText = "Segmind SDXL AI sedang memproses perubahan rona kulit waifu...";
        }

        const response = await fetch(`${window.location.origin}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: currentBase64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        
        if (data && data.editedImage) {
            // Bersihkan kanvas lama, lalu muat gambar baru hasil editan Segmind AI
            const editedImg = new Image();
            editedImg.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(editedImg, 0, 0);
                if (loadingStatus) loadingStatus.classList.add('hidden');
            };
            editedImg.src = data.editedImage;
        } else {
            throw new Error("Format respon gambar dari server tidak sesuai.");
        }

    } catch (error) {
        console.error("Gagal melakukan tanning:", error);
        if (loadingStatus) loadingStatus.classList.add('hidden');
        alert("Terjadi kesalahan koneksi ke server AI.");
    }
}

tanBtn.addEventListener('click', triggerTanning);

// Unduh Hasil Gambar Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_segmind_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
