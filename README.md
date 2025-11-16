# AI Music Extension

Chrome extension for DistroKid album uploads and Suno.com integration.

## Features

### DistroKid Auto-fill
- Auto-fill album metadata from JSON files
- Support for custom tags (prepend, append, random)
- Songwriter name fields support
- Instrumental track marking
- Reverse track order option

### Suno Helper
- Capture bearer tokens from API requests
- Download playlists in MP3 or WAV format
- Auto-generate track metadata
- Select all songs on page

## Installation

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension folder

## Usage

### DistroKid Workflow

1. Create a `meta.json` file with your album metadata:
```json
{
  "albumTitle": "My Album",
  "artistName": "Artist Name",
  "tracks": [
    { "trackNumber": 1, "title": "Song Title" },
    { "trackNumber": 2, "title": "Another Song" }
  ]
}
```

2. On DistroKid's upload page, click the helper button (bottom-right)
3. Load your `meta.json` file
4. Configure custom tags, songwriter info, or other options
5. Click **Auto-fill DistroKid Form**

### Suno Workflow

1. Visit `suno.com` - tokens are captured automatically
2. Open the helper panel
3. Enter playlist URL or ID
4. Choose format (MP3/WAV)
5. Click **Download Suno Playlist**

## File Structure

```
ai-music-ext/
├── manifest.json          # Extension configuration
├── background.js          # Token capture service worker
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic and metadata handling
├── contentScript.js      # Page interaction and auto-fill logic
├── styles.css            # UI styles
├── jszip.min.js          # ZIP file creation library
└── icons/                # Extension icons
```

## Technical Details

- **Manifest V3** Chrome extension
- Pure vanilla JavaScript (no frameworks)
- Chrome Storage API for data persistence
- Chrome Web Request API for token capture
- JSZip for playlist downloads

## Notes

- Browser security prevents automatic file uploads
- Always verify auto-filled data before submitting
- DistroKid page structure changes may require updates
- This is a third-party tool, not affiliated with DistroKid or Suno
