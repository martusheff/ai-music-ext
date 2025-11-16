// DistroKid Autofill & Suno Helper - Popup Script
// Manages extension popup UI, folder selection, and token display

const selectFolderBtn = document.getElementById('selectFolderBtn');
const folderInput = document.getElementById('folderInput');
const folderInfo = document.getElementById('folderInfo');
const folderName = document.getElementById('folderName');
const fileCount = document.getElementById('fileCount');
const metadataPreview = document.getElementById('metadataPreview');
const statusMessage = document.getElementById('statusMessage');
const tokensContainer = document.getElementById('tokensContainer');
const tagInput = document.getElementById('tagInput');
const tagPosition = document.getElementById('tagPosition');


// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadStoredMetadata();
  loadBearerTokens();
  loadCustomFields();
});


// Trigger folder selection
selectFolderBtn.addEventListener('click', () => {
  folderInput.click();
});

// Handle folder selection
folderInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  
  if (files.length === 0) {
    showStatus('No files selected', 'error');
    return;
  }

  try {
    const metadata = await processFolder(files);
    
    // Store only metadata
    await saveMetadata(metadata);
    
    displayMetadata(metadata);
    
    // Show folder info
    const folderPath = (files[0].webkitRelativePath || '').split('/')[0] || 'Selected Folder';
    folderName.textContent = `📁 ${folderPath}`;
    fileCount.textContent = `${files.length} files found`;
    folderInfo.classList.remove('hidden');
    
    showStatus('✓ Album metadata loaded', 'success');
  } catch (error) {
    console.error('Error processing folder:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
});


// Process folder and extract metadata
async function processFolder(files) {
  // Look for meta.json
  const metaFile = files.find(f => f.name.toLowerCase() === 'meta.json');
  
  if (metaFile) {
    // Parse meta.json
    const text = await metaFile.text();
    const metadata = JSON.parse(text);
    return metadata;
  } else {
    // Infer metadata from filenames
    const audioFiles = files.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['wav', 'mp3', 'flac', 'aiff', 'aif', 'm4a', 'ogg'].includes(ext);
    });

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in folder');
    }

    // Sort by filename
    audioFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Extract folder name as album title
    const folderPath = audioFiles[0].webkitRelativePath;
    const folderNameParts = folderPath.split('/');
    const albumTitle = folderNameParts[folderNameParts.length - 2] || 'Unknown Album';

    // Parse track titles from filenames
    const tracks = audioFiles.map((file, index) => {
      const title = parseTrackTitle(file.name);
      return {
        trackNumber: index + 1,
        title: title,
        fileName: file.name
      };
    });

    return {
      albumTitle: albumTitle,
      artistName: '',
      primaryGenre: '',
      tracks: tracks
    };
  }
}

// Parse track title from filename
function parseTrackTitle(filename) {
  // Remove extension
  let title = filename.replace(/\.[^/.]+$/, '');
  
  // Remove leading track numbers (e.g., "01 - ", "1. ", "01. ", "1 - ")
  title = title.replace(/^\d+[\s\-\.]+/, '');
  
  // Clean up extra spaces
  title = title.trim();
  
  return title;
}


// Save metadata to chrome.storage.local
async function saveMetadata(metadata) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ albumMetadata: metadata }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Load stored metadata
function loadStoredMetadata() {
  chrome.storage.local.get(['albumMetadata'], (result) => {
    if (result.albumMetadata) {
      displayMetadata(result.albumMetadata);
      
      // Show that we have stored data
      folderInfo.classList.remove('hidden');
      folderName.textContent = `📁 ${result.albumMetadata.albumTitle || 'Stored Album'}`;
      fileCount.textContent = `${result.albumMetadata.tracks?.length || 0} tracks`;
    }
  });
}


// Display metadata in preview
function displayMetadata(metadata) {
  if (!metadata || !metadata.tracks || metadata.tracks.length === 0) {
    metadataPreview.innerHTML = '<div class="no-data">No tracks found</div>';
    return;
  }

  let html = '<div class="album-info">';
  
  if (metadata.albumTitle) {
    html += `<div><strong>Album:</strong> ${escapeHtml(metadata.albumTitle)}</div>`;
  }
  
  if (metadata.artistName) {
    html += `<div><strong>Artist:</strong> ${escapeHtml(metadata.artistName)}</div>`;
  }
  
  if (metadata.primaryGenre) {
    html += `<div><strong>Genre:</strong> ${escapeHtml(metadata.primaryGenre)}</div>`;
  }
  
  html += `<div><strong>Tracks:</strong> ${metadata.tracks.length}</div>`;
  html += '</div>';

  html += '<div class="tracks-list">';
  metadata.tracks.forEach(track => {
    html += `
      <div class="track-item">
        <span class="track-number">${track.trackNumber}.</span>
        ${escapeHtml(track.title)}
      </div>
    `;
  });
  html += '</div>';

  // Add clear button
  html += '<button class="clear-button" id="clearMetadata">Clear Metadata</button>';

  metadataPreview.innerHTML = html;

  // Add event listener to clear button
  document.getElementById('clearMetadata')?.addEventListener('click', clearMetadata);
}

// Clear stored metadata
function clearMetadata() {
  chrome.storage.local.remove(['albumMetadata'], () => {
    metadataPreview.innerHTML = '<div class="no-data">No album selected</div>';
    folderInfo.classList.add('hidden');
    showStatus('Metadata cleared', 'success');
  });
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.classList.remove('hidden');
  
  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Save custom fields when they change
tagInput.addEventListener('input', saveCustomFields);
tagPosition.addEventListener('change', saveCustomFields);

function saveCustomFields() {
  const customFields = {
    tag: tagInput.value,
    tagPosition: tagPosition.value
  };
  
  chrome.storage.local.set({ customFields }, () => {
    console.log('Custom fields saved:', customFields);
  });
}

function loadCustomFields() {
  chrome.storage.local.get(['customFields'], (result) => {
    if (result.customFields) {
      tagInput.value = result.customFields.tag || '';
      tagPosition.value = result.customFields.tagPosition || 'prepend';
    }
  });
}


// Load and display bearer tokens
function loadBearerTokens() {
  // Request tokens from background script
  chrome.runtime.sendMessage({ action: 'getTokens' }, (response) => {
    updateTokensList(response?.tokens || []);
  });
  
  // Listen for token updates from background
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.tokens) {
      updateTokensList(changes.tokens.newValue);
    }
  });
}

// Update the tokens list display
function updateTokensList(tokens) {
  if (!tokens || tokens.length === 0) {
    tokensContainer.innerHTML = '<div class="no-tokens">No tokens captured yet. Visit suno.com to capture tokens.</div>';
    return;
  }
  
  tokensContainer.innerHTML = '';
  tokens.forEach((token, index) => {
    const tokenEl = document.createElement('div');
    tokenEl.className = 'token-item';
    
    const tokenPreview = document.createElement('span');
    tokenPreview.className = 'token-preview';
    const previewText = token.length > 20 
      ? `${token.substring(0, 20)}...` 
      : token;
    tokenPreview.textContent = previewText;
    tokenPreview.title = token;
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.className = 'copy-token-btn';
    copyButton.addEventListener('click', () => copyTokenToClipboard(token));
    
    tokenEl.appendChild(tokenPreview);
    tokenEl.appendChild(copyButton);
    tokensContainer.appendChild(tokenEl);
  });
}

// Copy token to clipboard
function copyTokenToClipboard(token) {
  navigator.clipboard.writeText(token).then(() => {
    showStatus('✓ Token copied to clipboard', 'success');
  }).catch(err => {
    console.error('Failed to copy token:', err);
    showStatus('Failed to copy token', 'error');
  });
}

