const upload = document.getElementById('upload');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const tanBtn = document.getElementById('tanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingStatus = document.getElementById('loadingStatus');
const loadingText = document.getElementById('loadingText');

let currentBase64Image = null;

// 1. Handler Membaca Gambar Saat Dipilih
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
            
            // Simpan data base64 asli untuk dikirim ke AI nanti
            currentBase64Image = event.target.result;

            // Langsung munculkan tombol tanpa syarat kotak koordinat
            tanBtn.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Kirim Gambar ke AI untuk Diedit Langsung Sekali Klik
async function triggerTanning() {
    if (!currentBase64Image) {
        alert("Silakan pilih gambar terlebih dahulu.");
        return;
    }

    try {
        // Tampilkan loading status di atas layar
        loadingStatus.classList.remove('hidden');
        loadingText.innerText = "Groq AI sedang mengedit rona kulit gambar...";

        const response = await fetch(`${window.location.origin}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: currentBase64Image })
        });

        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        
        if (data && data.editedImage) {
            // Bersihkan kanvas lama, lalu muat gambar hasil editan langsung dari AI
            const editedImg = new Image();
            editedImg.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(editedImg, 0, 0);
                loadingStatus.classList.add('hidden');
                alert("Warna kulit sukses diedit langsung oleh AI!");
            };
            editedImg.src = data.editedImage;
        } else {
            throw new Error("Format respons gambar dari AI tidak sesuai.");
        }

    } catch (error) {
        console.error("Gagal memproses gambar lewat AI:", error);
        loadingStatus.classList.add('hidden');
        alert("Terjadi kesalahan saat AI mencoba mengedit gambar secara langsung.");
    }
}

tanBtn.addEventListener('click', triggerTanning);

// Handler Download Hasil Akhir
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'waifu_ai_tanned.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
        
