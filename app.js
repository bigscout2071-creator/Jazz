const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');

// Player Elements
const playerContainer = document.getElementById('player');
const audioElement = document.getElementById('audioElement');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const timeDisplay = document.getElementById('timeDisplay');
const closePlayerBtn = document.getElementById('closePlayerBtn');

// Player Info Elements
const playerCover = document.getElementById('playerCover');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');

let currentTrackId = null;
let isPlaying = false;

// Format time in MM:SS
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Fetch & Search Logic
async function fetchMusic(query) {
    resultsContainer.innerHTML = '<div class="loader"></div>';
    
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=24`);
        if (!response.ok) throw new Error("Failed to fetch data from iTunes API.");
        
        const data = await response.json();
        displayResults(data.results);
    } catch (error) {
        console.error(error);
        resultsContainer.innerHTML = `<p class="message">Oops! Something went wrong. ${error.message}</p>`;
    }
}

function displayResults(tracks) {
    resultsContainer.innerHTML = '';
    
    if (tracks.length === 0) {
        resultsContainer.innerHTML = '<p class="message">No songs found. Try a different search term.</p>';
        return;
    }

    tracks.forEach((track) => {
        // We only want tracks that actually have an audio preview
        if (!track.previewUrl) return;

        // Upgrade artwork resolution from 100x100 to 300x300 for better display
        const highResArtwork = track.artworkUrl100.replace('100x100bb', '300x300bb'); 
        
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.trackId = track.trackId;
        
        card.innerHTML = `
            <div class="track-cover-container">
                <img class="track-cover" src="${highResArtwork}" alt="${track.trackName}" loading="lazy">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                    <div class="equalizer">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                    </div>
                </div>
            </div>
            <h3 class="track-title" title="${track.trackName}">${track.trackName}</h3>
            <p class="track-artist" title="${track.artistName}">${track.artistName}</p>
        `;

        card.addEventListener('click', () => {
            playTrack(track, card, highResArtwork);
        });

        resultsContainer.appendChild(card);
    });
}

// Player Logic
function playTrack(track, cardElement, coverUrl) {
    // Toggle play/pause if user clicks the currently playing track's card
    if (currentTrackId === track.trackId) {
        togglePlay();
        return;
    }

    // Assign new audio source
    audioElement.src = track.previewUrl;
    
    // Update Player UI Metadata
    playerCover.src = coverUrl;
    playerTitle.textContent = track.trackName;
    playerArtist.textContent = track.artistName;
    
    // Unhide the player bar
    playerContainer.classList.remove('hidden');
    
    // Update glowing active state on track cards
    document.querySelectorAll('.track-card').forEach(c => c.classList.remove('playing'));
    if (cardElement) {
        cardElement.classList.add('playing');
    }
    
    currentTrackId = track.trackId;
    
    // Play Native Audio
    audioElement.play();
    isPlaying = true;
    updatePlayPauseIcon();
}

function togglePlay() {
    if (!audioElement.src) return; // Prevent toggle if no track is loaded
    
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play();
    }
    isPlaying = !isPlaying;
    updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
    const icon = playPauseBtn.querySelector('i');
    const activeCard = document.querySelector(`.track-card[data-track-id="${currentTrackId}"]`);

    if (isPlaying) {
        icon.className = 'fas fa-pause';
        if (activeCard) activeCard.classList.add('playing');
    } else {
        icon.className = 'fas fa-play';
        if (activeCard) activeCard.classList.remove('playing');
    }
}

// Audio Element Event Listeners
audioElement.addEventListener('timeupdate', () => {
    const current = audioElement.currentTime;
    const duration = audioElement.duration || 30; // iOS iTunes previews are commonly ~30s
    
    const progressPercent = (current / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
});

audioElement.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayPauseIcon();
    progressBar.style.width = '0%';
    document.querySelectorAll('.track-card').forEach(c => c.classList.remove('playing'));
});

// Scrubbing behavior on progress bar
progressContainer.addEventListener('click', (e) => {
    if (!audioElement.src) return;
    const clickX = e.offsetX;
    const width = progressContainer.clientWidth;
    const duration = audioElement.duration;
    
    audioElement.currentTime = (clickX / width) * duration;
});

// Global Control Listeners
playPauseBtn.addEventListener('click', togglePlay);

closePlayerBtn.addEventListener('click', () => {
    audioElement.pause();
    isPlaying = false;
    audioElement.src = "";
    playerContainer.classList.add('hidden');
    document.querySelectorAll('.track-card').forEach(c => c.classList.remove('playing'));
    currentTrackId = null;
});

// Search Trigger Listeners
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) fetchMusic(query);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) fetchMusic(query);
    }
});
