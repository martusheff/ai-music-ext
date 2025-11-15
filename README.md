# DistroKid Autofill & Suno Helper Chrome Extension

A Chrome extension that automatically fills DistroKid's album upload form with metadata from a local album folder and captures Suno.com bearer tokens.

## What It Does

### DistroKid Autofill
- 📁 **Select album folder** containing your audio files
- 🔢 **Auto-select number of songs** in the dropdown
- 📝 **Auto-fill metadata**: album title, track titles, and artist name
- 🏷️ **Custom tags**: Add custom tags to track titles (prepend, append, or random)
- 🎵 **Supports multiple audio formats**: WAV, MP3, FLAC, AIFF, M4A, OGG
- 🎯 **Floating action button**: Easy access with expandable menu

### Suno Token Capture
- 🔑 **Automatically capture bearer tokens** from Suno.com requests
- 📋 **One-click copy** to clipboard
- 💾 **Store up to 10 recent tokens**
- 🔄 **Real-time token updates**

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `distro-kid-autofill` folder
5. Extension is now installed!

## Usage

### Step 1: Prepare Your Album Folder

Organize your files like this:

```
My Album/
├── meta.json (optional)
├── 01 - Song Title.wav
├── 02 - Another Song.wav
└── 03 - Third Song.wav
```

### Step 2: Optional `meta.json`

Create a `meta.json` file for precise metadata control:

```json
{
  "albumTitle": "My Album",
  "artistName": "Artist Name",
  "tracks": [
    { "trackNumber": 1, "title": "Song Title" },
    { "trackNumber": 2, "title": "Another Song" },
    { "trackNumber": 3, "title": "Third Song" }
  ]
}
```

If no `meta.json` exists, the extension will infer track titles from filenames automatically.

### Step 3: Load Metadata

1. Click the extension icon in your Chrome toolbar
2. Click **Select Album Folder**
3. Choose your album folder
4. Review the metadata preview

### Step 4: Auto-fill DistroKid

1. Go to `https://distrokid.com/new`
2. Look for the blue **floating action button** (bottom-right)
3. Click it to open the menu
4. Click **"Auto-fill Metadata"**
5. ✅ Extension fills:
   - Number of songs (dropdown)
   - Album title
   - Track titles (with custom tags if set)
   - Artist name (if provided)
6. Manually upload audio files and cover art

### Custom Tags

1. Click the floating action button
2. Select **"Settings"**
3. Enter your custom tag (e.g., `[Remix]`, `(Demo)`, `- Extended Mix`)
4. Choose position:
   - **Prepend**: `[Remix] Song Title`
   - **Append**: `Song Title [Remix]`
   - **Random**: Randomly chooses prepend or append for each track
5. Click **Save Settings**

### Suno Token Capture

1. Visit `suno.com` and log in
2. Tokens are automatically captured from network requests
3. View tokens in the extension popup
4. Click **Copy** next to any token to copy it to clipboard

## File Structure

```
distro-kid-autofill/
├── manifest.json          # Extension configuration
├── background.js          # Suno token capture service worker
├── popup.html            # Extension popup UI
├── popup.js              # Folder processing, metadata, and token logic
├── contentScript.js      # DistroKid page auto-fill logic with floating UI
├── styles.css            # Content script styles for FAB and panels
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Limitations

- **Cannot auto-upload files**: Browser security prevents scripting file inputs
- **Page structure changes**: DistroKid may update their HTML, breaking selectors
- **Manual verification required**: Always review auto-filled data before submitting

## Troubleshooting

### Extension not loading
- Ensure Developer Mode is enabled
- Check all files are present
- Verify icon files exist

### Floating button not appearing
- Refresh the DistroKid page
- Check you're on `/new`, `/upload`, or `/album` page
- Open console (F12) to check for errors

### Fields not filling correctly
- DistroKid's page structure may have changed
- Try filling one field manually first
- Verify metadata is loaded in the popup

## Technologies

- Manifest V3
- Vanilla JavaScript (no frameworks)
- Chrome Storage API
- Chrome Web Request API (for token capture)
- File System Access API
- Background Service Worker

## Developer Notes

### Code Structure

The codebase is organized into clear sections with comments:

**`contentScript.js`** (~1700 lines)
- **Initialization**: Site detection and DOM ready handling
- **UI Injection**: Floating action button and panel creation
- **DistroKid Auto-fill**: Form detection and filling logic
- **Storage & Data**: Chrome storage interactions
- **Form Filling**: Album, artist, and track field population
- **Input Manipulation**: Event triggering for React/framework compatibility
- **Suno Downloads**: Playlist download and WAV conversion
- **HTML Generation**: Dynamic UI panel creation
- **Panel UI**: Event listeners and state management
- **Utilities**: Notifications, HTML escaping, etc.

**`popup.js`** (~300 lines)
- **DOM Elements**: Element references
- **Initialization**: Popup setup on load
- **Event Listeners**: User interaction handlers
- **Folder Processing**: Audio file detection and metadata extraction
- **Storage Functions**: Save/load metadata and settings
- **UI Display**: Preview rendering and status messages
- **Custom Fields**: Tag management and persistence
- **Bearer Token Display**: Token list rendering and copy functionality

**`background.js`** (~50 lines)
- **Token Storage**: In-memory token array
- **Network Listener**: Bearer token capture from Suno API
- **Message Handler**: Communication with popup/content scripts

### Key Design Decisions

1. **No external dependencies**: Pure vanilla JS for minimal bundle size
2. **Section comments**: Each major functionality is clearly marked
3. **Defensive coding**: Extensive error handling and Chrome API availability checks
4. **Framework compatibility**: Event triggering to work with React-based DistroKid forms
5. **Modular organization**: Functions grouped by purpose for easier maintenance

---

**Note**: This extension is not affiliated with DistroKid or Suno. It's a third-party tool to assist with data entry and API access.
