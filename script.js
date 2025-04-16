// script.js

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const uploadForm = document.getElementById('uploadForm');
    
    // Function to refresh gallery
    async function refreshGallery() {
        try {
            const response = await fetch('/images');
            const images = await response.json();
            
            if (gallery) {
                gallery.innerHTML = '';
                images.sort((a, b) => b.timestamp - a.timestamp).forEach((image, index) => {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'image-container';
                    
                    const img = document.createElement('img');
                    img.src = image.url;
                    img.alt = `Art Piece ${index + 1}`;
                    img.className = 'gallery-image';
                    
                    // Add click event to open viewer
                    img.addEventListener('click', () => {
                        window.location.href = `viewer.html?id=${index + 1}&url=${encodeURIComponent(image.url)}`;
                    });
                    
                    const label = document.createElement('div');
                    label.className = 'image-label';
                    label.textContent = `Art Piece ${index + 1}`;
                    
                    imageDiv.appendChild(img);
                    imageDiv.appendChild(label);
                    gallery.appendChild(imageDiv);
                });
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    }
    
    // Handle file upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    await refreshGallery();
                    uploadForm.reset();
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Failed to upload file');
            }
        });
    }
    
    // Initial gallery load
    refreshGallery();
});
