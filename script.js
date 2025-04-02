// Handle file upload
const uploadFile = async () => {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file!");
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch("http://localhost:5000/upload", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        if (data.success) {
            // Clear existing images and fetch all images again
            clearGallery();
            await fetchImages();
            alert("Upload successful!");
        } else {
            alert("Upload failed: " + (data.error || "Unknown error"));
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("Upload failed!");
    }
};

// Clear the gallery
const clearGallery = () => {
    const cols = document.getElementsByClassName("col");
    Array.from(cols).forEach(col => {
        col.innerHTML = '';
    });
};

// Fetch Images and Display
const fetchImages = async () => {
    try {
        document.getElementById('loader').style.display = 'block';
        const response = await fetch("http://localhost:5000/images");
        const data = await response.json();

        if (data.images && data.images.length > 0) {
            const cols = Array.from(document.getElementsByClassName("col"));
            data.images.forEach((image, index) => {
                const fullUrl = `http://localhost:5000${image.url}`;
                createCard(fullUrl, cols[index % cols.length], image.name);
            });
        } else {
            console.log("No images found.");
        }
        document.getElementById('loader').style.display = 'none';
    } catch (error) {
        console.error("Error fetching images:", error);
        document.getElementById('loader').style.display = 'none';
    }
};

// Function to Create Image Cards in Grid Layout
const createCard = (imageUrl, col, imageName) => {
    const card = document.createElement("div");
    card.classList.add("card");

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = imageName || "Digital Artwork";
    img.style.width = "100%";

    const overlay = document.createElement("div");
    overlay.classList.add("card-overlay");

    const downloadBtn = document.createElement("button");
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.onclick = () => {
        const filename = imageUrl.split("/").pop();
        window.open(`http://localhost:5000/download/${filename}`, '_blank');
    };

    overlay.appendChild(downloadBtn);
    card.appendChild(img);
    card.appendChild(overlay);
    col.appendChild(card);

    // Hide image if it fails to load
    img.onerror = function () {
        this.parentElement.style.display = "none";
    };
};

// Ensure images load on page load
document.addEventListener("DOMContentLoaded", fetchImages);
