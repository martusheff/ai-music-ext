// ============================================================================
// DistroKid Autofill & Suno Helper - Background Script
// ============================================================================
// This service worker captures Bearer tokens from Suno.com API requests
// and makes them available to the popup and content scripts.
// ============================================================================

// ===== TOKEN STORAGE =====

let capturedTokens = [];

// ===== NETWORK REQUEST LISTENER =====

// Listen for network requests to capture bearer tokens from Suno.com
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const authHeader = details.requestHeaders.find(
      header => header.name.toLowerCase() === 'authorization'
    );

    if (authHeader && authHeader.value.startsWith('Bearer ')) {
      const token = authHeader.value.replace('Bearer ', '');
      
      // Store only unique tokens
      if (!capturedTokens.includes(token)) {
        capturedTokens.unshift(token);
        
        // Keep only the last 10 tokens
        if (capturedTokens.length > 10) {
          capturedTokens = capturedTokens.slice(0, 10);
        }
        
        // Notify popup about new token
        chrome.storage.local.set({ tokens: capturedTokens });
        console.log('Captured new Suno bearer token');
      }
    }
  },
  { urls: ["*://*.suno.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

// ===== MESSAGE HANDLER =====

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTokens') {
    sendResponse({ tokens: capturedTokens });
    return false;
  }
  
  return false;
});
