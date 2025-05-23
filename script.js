// --- Configuration ---
// IMPORTANT: REPLACE WITH YOUR ACTUAL CLIENT ID
const CLIENT_ID = '322612768318-80h32spe5u74600u5b27tsqnd9772u7j.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

// --- DOM Elements ---
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const albumListDiv = document.getElementById('album-list');
const photoListDiv = document.getElementById('photo-list');
const albumListSection = document.getElementById('album-list-section');
const photoDisplaySection = document.getElementById('photo-display-section');
const currentAlbumTitleEl = document.getElementById('current-album-title');
const backToAlbumsButton = document.getElementById('back-to-albums');
const loadingPhotosDiv = document.getElementById('loading-photos');


let tokenClient;
let gapiInited = false;
let gisInited = false;

// --- Google Identity Services (GIS) and API Initialization ---

function gisInit() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', //  handled by .requestAccessToken() promise
    });
    gisInited = true;
    checkAuth();
}

function checkAuth() {
    if (gisInited) {
        authorizeButton.style.display = 'block';
    }
}

// --- Authentication ---

authorizeButton.onclick = async () => {
    tokenClient.requestAccessToken({prompt: 'consent'});
    // The actual token handling will be implicit via gapi client if using gapi.client.init
    // For direct fetch, the callback in initTokenClient or the promise would give the token.
    // For this example, we'll use a brief timeout to let auth complete, then load gapi.client
    // This is a simplification; a more robust app would use the callback from requestAccessToken.

    // For simplicity in this example, we'll assume the token is obtained
    // and proceed to load the Photos API client.
    // In a production app, you'd use the actual token from the response.
    // Since gapi.client handles token management after GIS login,
    // we just need to ensure the user is signed in.

    // A more robust way after requestAccessToken:
    // tokenClient.requestAccessToken({prompt: ''}).then(async (tokenResponse) => {
    //    gapi.client.setToken(tokenResponse); // Set token for gapi.client
    //    updateSigninStatus(true);
    //    loadPhotosApiAndListAlbums();
    // }).catch((err) => {
    //    console.error("Access token error", err);
    // });
    // For now, let's use a simpler approach for demo:
    try {
        const tokenResponse = await new Promise((resolve, reject) => {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                prompt: 'consent', // Force consent screen for the first time or if scopes change
                callback: (response) => {
                    if (response.error) {
                        reject(response);
                        return;
                    }
                    resolve(response);
                },
            });
            client.requestAccessToken();
        });

        gapi.client.setToken({ access_token: tokenResponse.access_token });
        updateSigninStatus(true);
        loadPhotosApiAndListAlbums();

    } catch (error) {
        console.error('Authentication error:', error);
        updateSigninStatus(false);
        // Display an error message to the user if needed
        albumListDiv.innerHTML = `<p class="error">Authentication failed. Please try again. Details: ${error.details || error.error || JSON.stringify(error)}</p>`;

    }
};

signoutButton.onclick = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(''); // Clear gapi token
            updateSigninStatus(false);
            albumListDiv.innerHTML = '';
            photoListDiv.innerHTML = '';
            albumListSection.style.display = 'block';
            photoDisplaySection.style.display = 'none';
        });
    }
};

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        albumListSection.style.display = 'block';
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        albumListSection.style.display = 'block'; // Show album section to allow sign-in
        photoDisplaySection.style.display = 'none';
    }
}

async function loadPhotosApiAndListAlbums() {
    try {
        // GAPI client library is loaded via HTML script tag for accounts.google.com/gsi/client
        // For photos library, we use gapi.client.request for direct REST calls
        // Or ensure gapi.client.init has been called for Photos API if using specific client libraries (less common now for simple REST)
        // The main thing is having the access token via gapi.client.setToken()

        // Check if gapi client is loaded and Photos API is available
        // For Photos API, we usually just use fetch with Authorization header
        // but gapi.client.request is also an option.
        // Let's ensure gapi.load('client', cb) is completed.
        await new Promise((resolve) => gapi.load('client', resolve));
        console.log("GAPI client loaded.");
        listAlbums();
    } catch (err) {
        console.error("Error loading GAPI client or listing albums", err);
        albumListDiv.innerHTML = "<p class='error'>Error initializing API. Please try refreshing.</p>";
    }
}


// --- API Interaction & Display ---

async function listAlbums() {
    albumListDiv.innerHTML = '<p>Loading albums...</p>';
    photoDisplaySection.style.display = 'none';
    albumListSection.style.display = 'block';

    try {
        const response = await gapi.client.request({
            path: 'https://photoslibrary.googleapis.com/v1/albums?pageSize=50', // Adjust pageSize as needed
            method: 'GET',
        });

        albumListDiv.innerHTML = ''; // Clear loading message
        const albums = response.result.albums;
        if (albums && albums.length > 0) {
            albums.forEach(album => {
                if (!album.title) return; // Skip albums without titles (e.g., some auto-created ones)

                const albumElement = document.createElement('div');
                albumElement.className = 'album-item';
                albumElement.onclick = () => loadAlbum(album.id, album.title);

                const coverPhotoUrl = album.coverPhotoBaseUrl ? `${album.coverPhotoBaseUrl}=w200-h150-c` : 'placeholder.png'; // -c for crop
                // Check if coverPhotoBaseUrl is present
                const imgHTML = album.coverPhotoBaseUrl
                    ? `<img src="${coverPhotoUrl}" alt="${album.title}" loading="lazy">`
                    : `<div class="album-placeholder-img">No Cover</div>`;


                albumElement.innerHTML = `
                    ${imgHTML}
                    <div class="album-title">${album.title}</div>
                    <div class="photo-count">${album.mediaItemsCount || 0} photos</div>
                `;
                albumListDiv.appendChild(albumElement);
            });
        } else {
            albumListDiv.innerHTML = '<p>No albums found.</p>';
        }
    } catch (err) {
        console.error('Error fetching albums:', err);
        albumListDiv.innerHTML = `<p class="error">Error fetching albums: ${err.result?.error?.message || err.message}. Ensure you have granted permissions.</p>`;
        // If 401/403, might be token issue
        if (err.status === 401 || err.status === 403) {
            // Attempt to re-authenticate or guide user.
            // For simplicity, just show error. A robust app might try to refresh token.
             updateSigninStatus(false); // Force sign-in state update
        }
    }
}

async function loadAlbum(albumId, albumTitle) {
    albumListSection.style.display = 'none';
    photoDisplaySection.style.display = 'block';
    photoListDiv.innerHTML = ''; // Clear previous photos
    loadingPhotosDiv.style.display = 'block';
    currentAlbumTitleEl.textContent = `Photos in "${albumTitle}"`;

    let nextPageToken = null;
    let allMediaItems = [];

    try {
        do {
            const searchPayload = {
                albumId: albumId,
                pageSize: 100 // Max allowed by API is 100
            };
            if (nextPageToken) {
                searchPayload.pageToken = nextPageToken;
            }

            const response = await gapi.client.request({
                path: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
                method: 'POST',
                body: searchPayload,
            });

            const mediaItems = response.result.mediaItems;
            if (mediaItems && mediaItems.length > 0) {
                allMediaItems = allMediaItems.concat(mediaItems);
            }
            nextPageToken = response.result.nextPageToken;
        } while (nextPageToken && allMediaItems.length < 500); // Limit to avoid too many calls in this example

        loadingPhotosDiv.style.display = 'none';
        if (allMediaItems.length > 0) {
            allMediaItems.forEach(item => {
                // We are only interested in photos for this example
                if (item.mimeType && item.mimeType.startsWith('image/')) {
                    const photoElement = document.createElement('div');
                    photoElement.className = 'photo-item';
                    // Use baseUrl with parameters for display size
                    // e.g., =w400-h300 for a 400x300 thumbnail
                    const thumbnailUrl = `${item.baseUrl}=w200-h150-c`; // c for crop to fit
                    photoElement.innerHTML = `
                        <img src="${thumbnailUrl}" alt="${item.filename || 'Photo'}" loading="lazy" onclick="openPhotoNewTab('${item.baseUrl}=d')">
                        `;
                    photoListDiv.appendChild(photoElement);
                }
            });
        } else {
            photoListDiv.innerHTML = '<p>No photos found in this album or API limit reached.</p>';
        }
    } catch (err) {
        console.error('Error fetching photos from album:', err);
        loadingPhotosDiv.style.display = 'none';
        photoListDiv.innerHTML = `<p class="error">Error fetching photos: ${err.result?.error?.message || err.message}</p>`;
    }
}

function openPhotoNewTab(url) {
    window.open(url, '_blank');
}


backToAlbumsButton.onclick = () => {
    photoDisplaySection.style.display = 'none';
    albumListSection.style.display = 'block';
    currentAlbumTitleEl.textContent = '';
    photoListDiv.innerHTML = '';
};

// Ensure gisInit is called after the GSI script loads
// This is handled by `onload="gisInit()"` in the script tag for GSI.
