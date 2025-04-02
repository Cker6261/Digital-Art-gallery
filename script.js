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
        // Show loader
        document.getElementById('loader').style.display = 'block';
        
        const response = await fetch("/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

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
        alert("Upload failed. Image will be shown locally but not saved to server.");
        
        // Preview the image locally even if upload failed
        clearGallery();
        await fetchImages();
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
};

// Clear the gallery
const clearGallery = () => {
    const cols = document.getElementsByClassName("col");
    Array.from(cols).forEach(col => {
        col.innerHTML = '';
    });
};

// Test if an image URL is accessible
const testImageUrl = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
};

// Fetch Images and Display
const fetchImages = async () => {
    try {
        document.getElementById('loader').style.display = 'block';
        
        // Load hardcoded images directly from S3 - trying different URL formats
        const BUCKET_REGIONS = [
            "https://art-gallery-images-bucket.s3.eu-north-1.amazonaws.com/",
            "https://s3.eu-north-1.amazonaws.com/art-gallery-images-bucket/",
            "https://art-gallery-images-bucket.s3.amazonaws.com/"
        ];
        
        // Get a list of all images in S3 - add all known filenames from our listing
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
            "wp3614529-star-wars-4k-wallpapers.jpg",
            // Add all files we saw in the bucket listing
            "1198790-3840x2160-desktop-4k-studio-ghibli-wallpaper.jpg",
            "1198799-3840x2160-desktop-4k-studio-ghibli-background-photo.jpg",
            "1374174.png",
            "1743335748510-guts-neon-iconic-5120x2880-21415.png",
            "1743340184178-guts-berserk-amoled-5120x2880-19129.jpg",
            "653393.jpg",
            "galaxy-space-pixel-art-digital-art-4k-wallpaper-uhdpaper.com-762@0@i.jpg"
        ];
        
        // Add debug info to page
        const debugInfo = document.createElement('div');
        debugInfo.id = 'debug-info';
        debugInfo.style.position = 'fixed';
        debugInfo.style.top = '0';
        debugInfo.style.left = '0';
        debugInfo.style.backgroundColor = 'white';
        debugInfo.style.padding = '10px';
        debugInfo.style.zIndex = '1000';
        
        // Remove existing debug info if it exists
        const existingDebug = document.getElementById('debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        document.body.appendChild(debugInfo);
        
        // Try each bucket URL format
        let workingBucketUrl = null;
        for (const bucketUrl of BUCKET_REGIONS) {
            // Test with a simple image
            const testUrl = bucketUrl + "download.jpg";
            const isWorking = await testImageUrl(testUrl);
            
            if (isWorking) {
                workingBucketUrl = bucketUrl;
                debugInfo.textContent = `Working bucket URL: ${workingBucketUrl}`;
                break;
            }
        }
        
        if (!workingBucketUrl) {
            debugInfo.textContent = "ERROR: Could not access any S3 bucket URL. Check S3 permissions!";
        } else {
            const cols = Array.from(document.getElementsByClassName("col"));
            let loadedImages = 0;
            let failedImages = 0;
            
            for (const imageName of imageNames) {
                try {
                    // Try different URL encoding approaches
                    const encodings = [
                        encodeURIComponent(imageName),   // Full encoding
                        imageName.replace(/ /g, '%20'),  // Just spaces
                        imageName                        // No encoding
                    ];
                    
                    let loaded = false;
                    
                    for (const encodedName of encodings) {
                        const fullUrl = workingBucketUrl + encodedName;
                        
                        const isLoaded = await testImageUrl(fullUrl);
                        if (isLoaded) {
                            createCard(fullUrl, cols[loadedImages % cols.length], imageName);
                            loadedImages++;
                            loaded = true;
                            break;
                        }
                    }
                    
                    if (!loaded) {
                        failedImages++;
                    }
                } catch (error) {
                    console.error(`Error loading image ${imageName}:`, error);
                    failedImages++;
                }
            }
            
            // Update debug info with loaded images count
            debugInfo.textContent = `Working bucket URL: ${workingBucketUrl} | Loaded ${loadedImages} images | Failed: ${failedImages}`;
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
    downloadBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        // Create a temporary link element
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = imageName || 'download.jpg';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
document.addEventListener("DOMContentLoaded", () => {
    // Remove any duplicate event handlers from the window.onload script
    fetchImages();
    
    // Fix upload button if needed
    const uploadButton = document.querySelector('.upload-container button');
    if (uploadButton) {
        uploadButton.onclick = () => {
            document.getElementById('fileInput').click();
        };
    }
});
