# Workspace Download Feature

## Overview
Added support for downloading all songs from Suno workspaces using page-based pagination.

## What Was Changed

### 1. New Function: `downloadWorkspace()`
- Located in `contentScript.js` as a separate function from `downloadPlaylist()`
- Fetches ALL clips from a workspace using page-based pagination
- Assumes 20 clips per page (standard page size)
- Uses the same download infrastructure as playlists (MP3/WAV conversion, ZIP creation, metadata generation)

### 2. Pagination Logic
The API returns:
- `clip_count`: Total number of clips (e.g., 138)
- `current_page`: Current page number
- `project_clips`: Array of ~20 clips per page

The function:
1. Fetches page 1 to get `clip_count`
2. Calculates total pages: `Math.ceil(clip_count / 20)`
3. Constructs all page URLs upfront (e.g., `?page=1`, `?page=2`, ... `?page=7`)
4. Fetches each page sequentially
5. Combines all clips and downloads them with progress tracking

### 3. URL Detection
Updated helper functions to detect workspace URLs:
- `getCurrentPlaylistId()` - Now detects `wid=` parameter in URLs
- `extractPlaylistId()` - Extracts workspace IDs from URLs like `https://suno.com/create?wid=9bf8204f-7b2d-46f8-861e-1d5e8347fa90`
- `isWorkspaceId()` - New function to determine if input is a workspace (checks for `wid=` or `/create` in URL)

### 4. UI Updates
- **Separated workspace and playlist downloads** into two distinct sections for clarity
- **Workspace Download section**:
  - Input field: `workspace-url-input` (auto-fills with workspace ID if on workspace page)
  - Format selector: `workspace-format-select` (WAV or MP3)
  - Checkbox: `workspace-save-to-zip` (checked by default)
  - Button: "Download Workspace"
- **Playlist Download section**:
  - Input field: `playlist-url-input`
  - Format selector: `audio-format-select` (WAV or MP3)
  - Checkbox: `playlist-save-to-zip` (checked by default)
  - Button: "Download Playlist"
- Each section has its own help text explaining what it does
- **Save to ZIP option**: When checked, downloads all files in a single ZIP. When unchecked, downloads each song as a separate file

### 5. Separate Download Functions
- **Workspace downloads**: Use `downloadWorkspace()` → `/api/project/{id}?page={n}` endpoint with pagination
- **Playlist downloads**: Use `downloadPlaylist()` → `/api/playlist/{id}` endpoint (existing functionality)

## How to Use

### Workspace Download
1. Navigate to your Suno workspace (e.g., `https://suno.com/create?wid=9bf8204f-7b2d-46f8-861e-1d5e8347fa90`)
2. Click the "Suno Helper" button
3. Go to the "Download" tab
4. In the **Workspace Download** section, the workspace ID should be auto-filled
5. Select format (MP3 or WAV)
6. Choose download method:
   - **Checked (default)**: Downloads as a single ZIP file
   - **Unchecked**: Downloads each song as a separate file
7. Click "Download Workspace"
8. The extension will:
   - Fetch page 1 to get total clip count (e.g., 138 clips)
   - Calculate pages needed (e.g., 7 pages for 138 clips)
   - Fetch all pages sequentially (page 1, 2, 3... 7)
   - Download all 138 clips (or however many exist)
   - Create a ZIP file (if checked) or download individual files (if unchecked)

### Playlist Download
1. Navigate to a Suno playlist or copy the playlist URL
2. Click the "Suno Helper" button
3. Go to the "Download" tab
4. In the **Playlist Download** section, paste the playlist URL or ID
5. Select format (MP3 or WAV)
6. Choose download method:
   - **Checked (default)**: Downloads as a single ZIP file
   - **Unchecked**: Downloads each song as a separate file
7. Click "Download Playlist"

## API Endpoints Used

### Workspace (with pagination)
```
GET https://studio-api.prod.suno.com/api/project/{workspaceId}?page=1
GET https://studio-api.prod.suno.com/api/project/{workspaceId}?page=2
GET https://studio-api.prod.suno.com/api/project/{workspaceId}?page=3
... (continues for all pages)
```

### Playlist
```
GET https://studio-api.prod.suno.com/api/playlist/{playlistId}
```

**Headers:**
- `Authorization: Bearer {token}`
- `Accept: */*`
- `Origin: https://suno.com`
- `Referer: https://suno.com/`

## Example Workspace URL Formats Supported

- Full URL: `https://suno.com/create?wid=9bf8204f-7b2d-46f8-861e-1d5e8347fa90`
- Just the ID: `9bf8204f-7b2d-46f8-861e-1d5e8347fa90`
- URL with other params: `https://suno.com/create?tab=songs&wid=9bf8204f-7b2d-46f8-861e-1d5e8347fa90`

## Testing

To test with your workspace (138 clips example):
1. Open the extension on your workspace page (`https://suno.com/create?wid=...`)
2. Verify the workspace ID is auto-detected in the Workspace Download section
3. Click "Download Workspace" and watch the console logs
4. You should see messages like:
   - "Found 138 total clips in workspace. Calculated 7 pages to fetch."
   - "Constructed 7 URLs to fetch: [array of URLs]"
   - "Fetching page 1/7..."
   - "Page 1: Retrieved 20 clips. Total so far: 20/138"
   - "Fetching page 2/7..."
   - "Page 2: Retrieved 20 clips. Total so far: 40/138"
   - ... (continues through all pages)
   - "Successfully retrieved 138 clips out of 138"

## Notes

- **Workspace and playlist downloads are now separate** - use the appropriate section for your needs
- Uses page-based pagination (assumes 20 clips per page)
- Constructs all page URLs upfront, then fetches them sequentially
- Progress is shown for both page fetching and file downloading
- All existing playlist functionality remains unchanged
- The workspace ID auto-fills when you're on a workspace page
