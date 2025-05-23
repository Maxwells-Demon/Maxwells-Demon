document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('lightgallery');
    const jsonUrl = 'https://g-photofetch-worker.levin-742.workers.dev'; // Replace with your actual JSON file URL

    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(images => {
            galleryContainer.innerHTML = ''; // Clear "Loading images..." text

            if (images && images.length > 0) {
                images.forEach(image => {
                    const anchor = document.createElement('a');
                    anchor.href = image.src;
                    anchor.setAttribute('data-lg-size', image.size || ''); // Optional: for specifying image size
                    if (image.subHtml) {
                        anchor.setAttribute('data-sub-html', image.subHtml);
                    }

                    const img = document.createElement('img');
                    img.src = image.thumb || image.src; // Use thumb if available, otherwise src
                    img.alt = image.alt || 'Gallery image';

                    anchor.appendChild(img);
                    galleryContainer.appendChild(anchor);
                });

                // Initialize LightGallery after images are loaded
                lightGallery(galleryContainer, {
                    plugins: [lgZoom, lgThumbnail, lgFullscreen, lgPager],
                    licenseKey: 'your_license_key', // Replace with your actual license key if you have one for commercial use
                    speed: 500,
                    thumbnail: true,
                    zoom: true,
                    fullscreen: true,
                    pager: true,
                });

            } else {
                galleryContainer.innerHTML = '<p>No images found in the JSON file.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing JSON:', error);
            galleryContainer.innerHTML = `<p>Failed to load images: ${error.message}</p>`;
        });
});