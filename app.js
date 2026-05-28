const imageInput = document.getElementById("imageInput");
const previewImg = document.getElementById("previewImg");
const resultImg = document.getElementById("resultImg");
const hitamkanBtn = document.getElementById("hitamkanBtn");

let selectedFile;

imageInput.addEventListener("change", (e) => {

    selectedFile = e.target.files[0];

    if (!selectedFile) return;

    previewImg.src = URL.createObjectURL(selectedFile);
});
previewImg.classList.add("show");

hitamkanBtn.addEventListener("click", async () => {

    if (!selectedFile) {
        alert("Upload gambar terlebih dahulu");
        return;
    }

    hitamkanBtn.innerText = "Processing...";

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {

        const response = await fetch("/api/hitamkan", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        resultImg.src = data.image;

    } catch (err) {

        alert(err.message);
    }

    hitamkanBtn.innerText = "Hitamkan";
});
