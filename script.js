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
        
        // Try uploading through the server first
        try {
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
                timeout: 10000 // 10 second timeout
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
                document.getElementById('loader').style.display = 'none';
                return;
            } else {
                throw new Error(data.error || "Unknown server error");
            }
        } catch (serverError) {
            console.error("Server upload failed:", serverError);
            
            // Server upload failed, display the image locally
            const reader = new FileReader();
            reader.onload = async function(e) {
                // Display the image locally
                clearGallery();
                const cols = Array.from(document.getElementsByClassName("col"));
                const tempImageUrl = e.target.result;
                createCard(tempImageUrl, cols[0], file.name, true);
                
                alert("Server upload failed. Image is displayed locally only.");
            };
            reader.readAsDataURL(file);
        }
    } catch (error) {
        console.error("Error in upload process:", error);
        alert("Upload failed: " + error.message);
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

// Create tiny debug info element at the bottom left
const showDebugInfo = (message) => {
    // Remove existing debug info if it exists
    const existingDebug = document.getElementById('debug-info');
    if (existingDebug) {
        existingDebug.remove();
    }
    
    const debugInfo = document.createElement('div');
    debugInfo.id = 'debug-info';
    debugInfo.style.position = 'fixed';
    debugInfo.style.bottom = '5px';
    debugInfo.style.left = '5px';
    debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    debugInfo.style.color = 'white';
    debugInfo.style.padding = '3px 6px';
    debugInfo.style.fontSize = '10px';
    debugInfo.style.borderRadius = '3px';
    debugInfo.style.zIndex = '1000';
    debugInfo.style.opacity = '0.7';
    
    debugInfo.textContent = message;
    document.body.appendChild(debugInfo);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (debugInfo.parentNode) {
            debugInfo.style.opacity = '0';
            debugInfo.style.transition = 'opacity 1s ease';
        }
    }, 10000);
};

// Fetch Images and Display
const fetchImages = async () => {
    try {
        document.getElementById('loader').style.display = 'block';
        
        // First try to fetch from server API
        let imagesFromServer = [];
        try {
            const response = await fetch('/images');
            if (response.ok) {
                const data = await response.json();
                if (data.images && data.images.length > 0) {
                    imagesFromServer = data.images;
                    console.log("Images loaded from server:", imagesFromServer.length);
                }
            }
        } catch (apiError) {
            console.error("Error fetching from API:", apiError);
        }
        
        // If we got images from the server, use those
        if (imagesFromServer.length > 0) {
            const cols = Array.from(document.getElementsByClassName("col"));
            let loadedImages = 0;
            
            for (const image of imagesFromServer) {
                createCard(image.url, cols[loadedImages % cols.length], image.name);
                loadedImages++;
            }
            
            showDebugInfo(`${loadedImages} images loaded`);
        } else {
            // Fallback to direct S3 loading if server API fails
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
            
            // Try each bucket URL format
            let workingBucketUrl = null;
            for (const bucketUrl of BUCKET_REGIONS) {
                // Test with a simple image
                const testUrl = bucketUrl + "download.jpg";
                const isWorking = await testImageUrl(testUrl);
                
                if (isWorking) {
                    workingBucketUrl = bucketUrl;
                    break;
                }
            }
            
            if (!workingBucketUrl) {
                showDebugInfo("Error: Cannot access S3 bucket");
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
                showDebugInfo(`${loadedImages} images loaded`);
            }
        }
        
        document.getElementById('loader').style.display = 'none';
    } catch (error) {
        console.error("Error fetching images:", error);
        document.getElementById('loader').style.display = 'none';
    }
};

// Function to Create Image Cards in Grid Layout
const createCard = (imageUrl, col, imageName, isLocalOnly = false) => {
    const card = document.createElement("div");
    card.classList.add("card");
    
    if (isLocalOnly) {
        card.style.border = "2px dashed red";
        
        const localLabel = document.createElement("div");
        localLabel.style.position = "absolute";
        localLabel.style.top = "10px";
        localLabel.style.left = "10px";
        localLabel.style.backgroundColor = "rgba(255, 0, 0, 0.7)";
        localLabel.style.color = "white";
        localLabel.style.padding = "5px";
        localLabel.style.borderRadius = "5px";
        localLabel.style.zIndex = "2";
        localLabel.textContent = "Local Only";
        card.appendChild(localLabel);
    }

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = imageName || "Digital Artwork";
    img.style.width = "100%";
    
    // Make image clickable to open in new tab
    img.style.cursor = "pointer";
    img.onclick = () => {
        window.open(imageUrl, '_blank');
    };

    const overlay = document.createElement("div");
    overlay.classList.add("card-overlay");

    const downloadBtn = document.createElement("button");
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.title = "Download image";
    downloadBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        if (isLocalOnly) {
            alert("Cannot download local-only images");
            return;
        }
        
        // Create a temporary link element for downloading
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = imageName || 'download.jpg';
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
    // Load images
    fetchImages();
    
    // Fix upload button if needed
    const uploadButton = document.querySelector('.upload-container button');
    if (uploadButton) {
        uploadButton.onclick = () => {
            document.getElementById('fileInput').click();
        };
    }
});
