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
        const response = await fetch("/upload", {
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
        
        // Get images from S3 bucket
        const S3_BUCKET_URL = "https://art-gallery-images-bucket.s3.eu-north-1.amazonaws.com/";
        
        try {
            // Try fetching from the API first
            const response = await fetch("/images");
            const data = await response.json();
            
            if (data.images && data.images.length > 0) {
                const cols = Array.from(document.getElementsByClassName("col"));
                data.images.forEach((image, index) => {
                    createCard(image.url, cols[index % cols.length], image.name);
                });
            }
        } catch (error) {
            console.log("Fetching from API failed, using direct S3 access");
            
            // Fallback: Load hardcoded images directly from S3
            const imageNames = [
                "download.jpg",
                "glWla8v.png",
                "1198598-3840x2160-desktop-4k-studio-ghibli-background-image.jpg",
                "1743335438225-653393.jpg",
                "1198712-3840x2160-desktop-4k-studio-ghibli-wallpaper.jpg", 
                "sea-of-stars-game-screenshot-4k-wallpaper-uhdpaper.com-905@1@h.jpg",
                "star-wars-kylo-ren-rey-from-star-wars-bb-8-wallpaper-0788ce9a3b1dfa6ddfe2779fd7d6b4f1.jpg",
                "wallpaperflare.com_wallpaper (1).jpg",
                "wallpaperflare.com_wallpaper (2).jpg", 
                "wallpaperflare.com_wallpaper (3).jpg",
                "wallpaperflare.com_wallpaper.jpg",
                "wp3614529-star-wars-4k-wallpapers.jpg"
            ];
            
            const cols = Array.from(document.getElementsByClassName("col"));
            imageNames.forEach((imageName, index) => {
                const fullUrl = S3_BUCKET_URL + imageName;
                createCard(fullUrl, cols[index % cols.length], imageName);
            });
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
        window.open(imageUrl, '_blank');
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
