// ============================================================================
// DistroKid Autofill & Suno Helper - Content Script
// ============================================================================
// This script provides auto-fill functionality for DistroKid album uploads
// and Suno playlist downloads directly on the respective websites.
// ============================================================================

(function() {
  'use strict';

  // ===== INITIALIZATION =====

  console.log('DistroKid Autofill extension loaded');
  console.log('Chrome API available:', typeof chrome !== 'undefined');
  console.log('Chrome storage available:', typeof chrome?.storage !== 'undefined');

  // Check if we're on a supported site
  const isDistroKid = window.location.hostname.includes('distrokid.com');
  const isSuno = window.location.hostname.includes('suno.com');
  
  if (!isDistroKid && !isSuno) {
    console.log('Not on a supported site, exiting');
    return;
  }
  
  // For DistroKid, only run on upload pages
  if (isDistroKid && !window.location.href.includes('/new') && 
      !window.location.href.includes('/upload') &&
      !window.location.href.includes('/album')) {
    console.log('Not on a DistroKid upload page, exiting');
    return;
  }
  
  console.log(`On ${isDistroKid ? 'DistroKid' : 'Suno'} page, initializing...`);

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Wait for dynamic content to load
    setTimeout(() => {
      injectAutofillButton();
    }, 1000);
  }

  // ===== UI INJECTION =====

  // Inject the floating action button that opens main panel
  function injectAutofillButton() {
    // Check if button already exists
    if (document.getElementById('distrokid-fab')) {
      return;
    }

    // Create main FAB
    const fab = document.createElement('button');
    fab.id = 'distrokid-fab';
    fab.className = 'distrokid-fab';
    
    // Set button text based on site
    const isDistroKid = window.location.hostname.includes('distrokid.com');
    const isSuno = window.location.hostname.includes('suno.com');
    
    if (isDistroKid) {
      fab.textContent = 'DistroKid Helper';
    } else if (isSuno) {
      fab.textContent = 'Suno Helper';
    } else {
      fab.textContent = 'Autofill';
    }

    document.body.appendChild(fab);

    // FAB click toggles main panel
    let isPanelOpen = false;
    fab.addEventListener('click', () => {
      if (isPanelOpen) {
        closeMainPanel();
        isPanelOpen = false;
      } else {
        showMainPanel();
        isPanelOpen = true;
      }
    });
    
    // Store reference for closing
    window.distrokidTogglePanel = () => {
      if (isPanelOpen) {
        closeMainPanel();
        isPanelOpen = false;
      }
    };
  }

  // ===== DISTROKID AUTO-FILL FUNCTIONS =====

  // Handle auto-fill button click
  async function handleAutofill() {
    try {
      const metadata = await getStoredMetadata();
      
      console.log('Retrieved metadata:', metadata);
      
      if (!metadata || !metadata.tracks || metadata.tracks.length === 0) {
        showNotification('No album metadata found. Please open the extension popup and select a folder first.', 'error');
        return;
      }

      showNotification('Applying metadata...', 'info');
      
      let fieldsFilledCount = 0;
      
      // Set number of songs in dropdown
      const numSongs = metadata.tracks.length;
      console.log(`Attempting to set song count to: ${numSongs}`);
      const dropdownSet = setNumberOfSongs(numSongs);
      if (dropdownSet) {
        console.log('✅ Dropdown set, waiting 2.5s for DistroKid to create inputs...');
        fieldsFilledCount++;
        // Wait longer for DistroKid to create the file input fields
        await new Promise(resolve => setTimeout(resolve, 2500));
      } else {
        console.log('⚠️ Dropdown not found, waiting 1s anyway...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Fill album title
      if (metadata.albumTitle) {
        const albumFilled = fillAlbumTitle(metadata.albumTitle);
        if (albumFilled) fieldsFilledCount++;
      }

      // Fill artist name
      if (metadata.artistName) {
        console.log('Attempting to fill artist name:', metadata.artistName);
        const artistFilled = fillArtistName(metadata.artistName);
        if (artistFilled) {
          fieldsFilledCount++;
          console.log('✓ Artist name filled successfully');
        } else {
          console.log('✗ Failed to fill artist name');
        }
      } else {
        console.log('No artist name in metadata:', metadata);
      }

      // Fill track titles (with custom tags)
      const tracksFilled = await fillTrackTitles(metadata.tracks);
      fieldsFilledCount += tracksFilled;

      // Fill songwriter fields if available
      const customFields = await getCustomFields();
      if (customFields.songwriterFirst && customFields.songwriterLast) {
        console.log('Filling songwriter fields...');
        const songwriterFilled = fillSongwriterFields(customFields.songwriterFirst, customFields.songwriterLast);
        if (songwriterFilled) {
          fieldsFilledCount++;
          console.log('✓ Songwriter real name fields filled');
        }
      }
      
      // Select instrumental radio buttons if checkbox is checked
      if (customFields.instrumental) {
        console.log('Selecting instrumental radio buttons...');
        const instrumentalFilled = selectInstrumentalRadios();
        if (instrumentalFilled) {
          fieldsFilledCount++;
          console.log('✓ Instrumental radio buttons selected');
        }
      }

      if (fieldsFilledCount > 0) {
        showNotification(`✓ Successfully filled ${fieldsFilledCount} field(s).`, 'success', 3000);
      } else {
        showNotification(
          'Could not find any fields to fill. The page structure may have changed.',
          'warning'
        );
      }
      
    } catch (error) {
      console.error('Auto-fill error:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = error.message;
      if (error.message.includes('Chrome storage API not available')) {
        errorMessage = 'Extension error: Please reload the page and try again.';
      }
      
      showNotification(`Error: ${errorMessage}`, 'error', 5000);
    }
  }

  // ===== STORAGE & DATA FUNCTIONS =====

  // Get stored metadata from chrome.storage
  function getStoredMetadata() {
    return new Promise((resolve) => {
      try {
        if (!chrome || !chrome.storage || !chrome.storage.local || chrome.runtime?.id === undefined) {
          console.log('Chrome storage API not available or extension context invalidated');
          resolve(null);
          return;
        }
        
        chrome.storage.local.get(['albumMetadata'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('Storage error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result.albumMetadata);
          }
        });
      } catch (error) {
        console.log('Storage access error:', error);
        resolve(null);
      }
    });
  }

  // ===== FORM FILLING FUNCTIONS =====

  // Fill album/release title
  function fillAlbumTitle(title) {
    const selectors = [
      'input[name*="album" i][name*="title" i]',
      'input[name*="release" i][name*="title" i]',
      'input[placeholder*="album" i][placeholder*="title" i]',
      'input[placeholder*="release" i][placeholder*="title" i]',
      'input[name*="album" i]:not([type="file"]):not([type="checkbox"]):not([type="radio"])',
      'input[aria-label*="album" i][aria-label*="title" i]',
      'textarea[name*="album" i]',
      'textarea[placeholder*="album" i]'
    ];

    for (const selector of selectors) {
      const input = document.querySelector(selector);
      if (input && isVisible(input)) {
        setInputValue(input, title);
        console.log('Filled album title:', selector);
        return true;
      }
    }

    // Fallback: search by label
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const text = label.textContent.toLowerCase();
      if ((text.includes('album') || text.includes('release')) && text.includes('title')) {
        const input = findInputForLabel(label);
        if (input && isVisible(input)) {
          setInputValue(input, title);
          console.log('Filled album title via label');
          return true;
        }
      }
    }

    return false;
  }

  // Fill artist name
  function fillArtistName(artistName) {
    console.log('fillArtistName called with:', artistName);
    
    // Try DistroKid's specific field first
    const artistNameField = document.getElementById('artistName');
    if (artistNameField && isVisible(artistNameField)) {
      setInputValue(artistNameField, artistName);
      console.log('✓ Filled artist name using #artistName');
      return true;
    }
    
    // Fallback selectors if the main field isn't found
    const selectors = [
      'input[name="artistName"]',
      'input[name*="artist" i][name*="name" i]',
      'input[placeholder*="artist" i][placeholder*="name" i]',
      'input[name*="primary" i][name*="artist" i]',
      'input[name*="artist" i]:not([type="file"]):not([type="checkbox"]):not([type="radio"])',
      'input[id*="artist" i]:not([type="file"]):not([type="checkbox"]):not([type="radio"])',
      'input[placeholder*="artist" i]',
      'input[aria-label*="artist" i]'
    ];

    for (const selector of selectors) {
      const inputs = document.querySelectorAll(selector);
      for (const input of inputs) {
        if (isVisible(input)) {
          setInputValue(input, artistName);
          console.log('✓ Filled artist name with selector:', selector);
          return true;
        }
      }
    }

    // Fallback: search by label
    console.log('Trying label fallback...');
    const labels = document.querySelectorAll('label');
    console.log('Found labels:', labels.length);
    
    for (const label of labels) {
      const text = label.textContent.toLowerCase().trim();
      // More flexible matching for artist labels
      const isArtistLabel = (
        text.includes('artist') || 
        text === 'primary artist' ||
        text === 'artist name' ||
        text.startsWith('artist') ||
        (text.includes('primary') && text.includes('artist'))
      );
      
      if (isArtistLabel) {
        console.log('Found artist label:', text);
        const input = findInputForLabel(label);
        console.log('Associated input:', input);
        if (input && isVisible(input)) {
          setInputValue(input, artistName);
          console.log('✓ Filled artist name via label:', text);
          return true;
        }
      }
    }

    // Final fallback: search for inputs near text containing "artist"
    console.log('Trying final fallback - searching near artist text...');
    const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    
    for (const input of allInputs) {
      if (!isVisible(input)) continue;
      
      // Check if input has artist-related attributes we might have missed
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const className = (input.className || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      
      if (name.includes('artist') || id.includes('artist') || 
          className.includes('artist') || placeholder.includes('artist')) {
        console.log('Found artist input via final fallback:', input);
        setInputValue(input, artistName);
        console.log('✓ Filled artist name via final fallback');
        return true;
      }
      
      // Check surrounding text
      const parent = input.parentElement;
      if (parent) {
        const parentText = parent.textContent.toLowerCase();
        if (parentText.includes('artist') && parentText.length < 100) { // Avoid matching large blocks
          console.log('Found artist input via surrounding text:', input, 'text:', parentText);
          setInputValue(input, artistName);
          console.log('✓ Filled artist name via surrounding text');
          return true;
        }
      }
    }
    
    console.log('✗ No artist name field found after all attempts');
    return false;
  }

  // Select instrumental radio buttons for all tracks
  function selectInstrumentalRadios() {
    console.log('Selecting instrumental radio buttons for all tracks');
    
    let radiosSelectedCount = 0;
    
    // Find all radio buttons that indicate instrumental/no lyrics
    // DistroKid uses radio buttons with specific values or labels
    const allRadios = document.querySelectorAll('input[type="radio"]');
    
    console.log(`Found ${allRadios.length} total radio buttons`);
    
    allRadios.forEach((radio, index) => {
      // Check if this radio button is for instrumental/no lyrics
      // Look at the value, name, id, or associated label
      const value = (radio.value || '').toLowerCase();
      const name = (radio.name || '').toLowerCase();
      const id = (radio.id || '').toLowerCase();
      
      // Find associated label
      let labelText = '';
      if (radio.id) {
        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (label) {
          labelText = label.textContent.toLowerCase();
        }
      }
      
      // Also check parent label
      const parentLabel = radio.closest('label');
      if (parentLabel) {
        labelText += ' ' + parentLabel.textContent.toLowerCase();
      }
      
      // Check if this is an instrumental/no lyrics option
      const isInstrumental = (
        value.includes('instrumental') ||
        value.includes('no lyrics') ||
        labelText.includes('instrumental') ||
        labelText.includes('no lyrics') ||
        labelText.includes('contains no lyrics')
      );
      
      if (isInstrumental && isVisible(radio)) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.dispatchEvent(new Event('click', { bubbles: true }));
        radiosSelectedCount++;
        console.log(`✓ Selected instrumental radio ${index + 1}: ${labelText || value}`);
      }
    });
    
    if (radiosSelectedCount > 0) {
      console.log(`✓ Selected ${radiosSelectedCount} instrumental radio buttons`);
      return true;
    } else {
      console.log('No instrumental radio buttons found or visible');
      return false;
    }
  }

  // Fill songwriter fields for all tracks
  function fillSongwriterFields(firstName, lastName) {
    if (!firstName || !lastName) {
      console.log('No songwriter names provided');
      return false;
    }

    console.log('Filling songwriter real name fields:', firstName, lastName);
    
    let fieldsFilledCount = 0;
    
    // Find all songwriter real name fields (first and last name inputs)
    const firstNameInputs = document.querySelectorAll('input[name^="songwriter_real_name_first"]');
    const lastNameInputs = document.querySelectorAll('input[name^="songwriter_real_name_last"]');
    
    console.log(`Found ${firstNameInputs.length} first name fields and ${lastNameInputs.length} last name fields`);
    
    // Fill all first name fields
    firstNameInputs.forEach((input, index) => {
      if (isVisible(input)) {
        setInputValue(input, firstName);
        fieldsFilledCount++;
        console.log(`✓ Filled first name field ${index + 1}`);
      }
    });
    
    // Fill all last name fields
    lastNameInputs.forEach((input, index) => {
      if (isVisible(input)) {
        setInputValue(input, lastName);
        fieldsFilledCount++;
        console.log(`✓ Filled last name field ${index + 1}`);
      }
    });
    
    if (fieldsFilledCount > 0) {
      console.log(`✓ Filled ${fieldsFilledCount} songwriter real name fields`);
      return true;
    } else {
      console.log('No songwriter real name fields found or visible');
      return false;
    }
  }

  // Fill track titles (with custom tags)
  async function fillTrackTitles(tracks) {
    // Get custom fields
    const customFields = await getCustomFields();
    
    // Reverse tracks array if reverseOrder is enabled
    let tracksToFill = tracks;
    if (customFields.reverseOrder) {
      tracksToFill = [...tracks].reverse();
      console.log('Applying tracklist in reverse order');
    }
    
    const selectors = [
      'input[name*="song" i][name*="title" i]',
      'input[name*="track" i][name*="title" i]',
      'input[placeholder*="song" i][placeholder*="title" i]',
      'input[placeholder*="track" i][placeholder*="title" i]',
      'input[name*="song" i]:not([type="file"]):not([type="checkbox"]):not([type="radio"])',
      'input[name*="track" i]:not([type="file"]):not([type="checkbox"]):not([type="radio"])'
    ];

    let trackInputs = [];
    
    // Try each selector
    for (const selector of selectors) {
      trackInputs = Array.from(document.querySelectorAll(selector))
        .filter(input => isVisible(input));
      
      if (trackInputs.length > 0) {
        console.log('Found track inputs with selector:', selector);
        break;
      }
    }

    // Fallback: find by label
    if (trackInputs.length === 0) {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        const text = label.textContent.toLowerCase();
        if ((text.includes('song') || text.includes('track')) && 
            (text.includes('title') || text.includes('name'))) {
          const input = findInputForLabel(label);
          if (input && isVisible(input) && !trackInputs.includes(input)) {
            trackInputs.push(input);
          }
        }
      }
    }

    if (trackInputs.length === 0) {
      console.log('No track title inputs found');
      return 0;
    }

    // Fill track titles
    let filledCount = 0;
    const maxTracks = Math.min(tracksToFill.length, trackInputs.length);
    
    for (let i = 0; i < maxTracks; i++) {
      if (tracksToFill[i] && tracksToFill[i].title) {
        let title = tracksToFill[i].title;
        
        // Apply custom tag if set
        if (customFields.tag && customFields.tag.trim()) {
          const tag = customFields.tag.trim();
          const position = customFields.tagPosition || 'prepend';
          
          if (position === 'prepend') {
            title = `${tag} ${title}`;
          } else if (position === 'append') {
            title = `${title} ${tag}`;
          } else if (position === 'random') {
            title = Math.random() > 0.5 ? `${tag} ${title}` : `${title} ${tag}`;
          }
        }
        
        setInputValue(trackInputs[i], title);
        filledCount++;
      }
    }

    console.log(`Filled ${filledCount} track titles`);
    return filledCount;
  }

  // ===== INPUT MANIPULATION HELPERS =====

  // Set input value and trigger events to ensure frameworks detect the change
  function setInputValue(input, value) {
    // Set the value
    input.value = value;
    
    // Trigger events that frameworks might listen to
    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('blur', { bubbles: true })
    ];
    
    events.forEach(event => input.dispatchEvent(event));
    
    // For React inputs
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Find input associated with a label
  function findInputForLabel(label) {
    // Check for 'for' attribute
    if (label.htmlFor) {
      return document.getElementById(label.htmlFor);
    }
    
    // Check for nested input
    const nestedInput = label.querySelector('input, textarea');
    if (nestedInput) {
      return nestedInput;
    }
    
    // Check for sibling input
    const sibling = label.nextElementSibling;
    if (sibling && (sibling.tagName === 'INPUT' || sibling.tagName === 'TEXTAREA')) {
      return sibling;
    }
    
    return null;
  }

  // Check if element is visible
  function isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  // Set the number of songs in the dropdown
  function setNumberOfSongs(numSongs) {
    console.log('Looking for song count dropdown...');
    
    const selectors = [
      'select[name*="song" i][name*="count" i]',
      'select[name*="track" i][name*="count" i]',
      'select[name*="number" i][name*="song" i]',
      'select[name*="number" i][name*="track" i]',
      'select[name*="songs" i]',
      'select[name*="tracks" i]',
      'select[name*="how" i]',
      'select[aria-label*="number" i][aria-label*="song" i]',
      'select[aria-label*="number" i][aria-label*="track" i]',
      'select[id*="song" i]',
      'select[id*="track" i]'
    ];

    // Try to find the dropdown
    for (const selector of selectors) {
      const dropdown = document.querySelector(selector);
      if (dropdown && isVisible(dropdown)) {
        console.log('Found dropdown with selector:', selector);
        return setDropdownValue(dropdown, numSongs);
      }
    }

    // Fallback: search by label
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      const text = label.textContent.toLowerCase();
      if ((text.includes('how many') || text.includes('number of') || text.includes('how') || text.includes('upload')) && 
          (text.includes('song') || text.includes('track'))) {
        const select = findSelectForLabel(label);
        if (select && isVisible(select)) {
          console.log('Found dropdown via label:', text);
          return setDropdownValue(select, numSongs);
        }
      }
    }

    // Additional fallback: find any select near text mentioning songs/tracks
    const allSelects = document.querySelectorAll('select');
    console.log(`Found ${allSelects.length} total select elements`);
    
    for (const select of allSelects) {
      if (!isVisible(select)) continue;
      
      console.log('Checking select:', select.name, select.id, select.className);
      
      // Check parent element text
      const parent = select.closest('div, form, fieldset, section');
      if (parent) {
        const parentText = parent.textContent.toLowerCase();
        if ((parentText.includes('how many') || parentText.includes('number of') || parentText.includes('upload')) && 
            (parentText.includes('song') || parentText.includes('track'))) {
          console.log('Found dropdown via parent text');
          return setDropdownValue(select, numSongs);
        }
      }
    }

    // Last resort: try the first visible select with numeric options
    for (const select of allSelects) {
      if (!isVisible(select)) continue;
      
      const options = Array.from(select.options);
      const hasNumericOptions = options.some(opt => /^\d+$/.test(opt.value) || /^\d+$/.test(opt.textContent.trim()));
      
      if (hasNumericOptions && options.length > 1) {
        console.log('Found potential dropdown with numeric options:', select);
        const result = setDropdownValue(select, numSongs);
        if (result) return true;
      }
    }

    console.log('Could not find song count dropdown');
    console.log('All selects:', allSelects);
    return false;
  }

  // Set dropdown value
  function setDropdownValue(dropdown, value) {
    // Try to find an option with the matching value
    const options = Array.from(dropdown.options);
    
    // Try exact match
    let option = options.find(opt => opt.value === String(value));
    
    // Try text content match
    if (!option) {
      option = options.find(opt => opt.textContent.trim() === String(value));
    }
    
    // Try partial match
    if (!option) {
      option = options.find(opt => opt.textContent.includes(String(value)));
    }

    if (option) {
      dropdown.value = option.value;
      
      // Trigger change events
      const events = [
        new Event('change', { bubbles: true }),
        new Event('input', { bubbles: true }),
        new Event('blur', { bubbles: true })
      ];
      
      events.forEach(event => dropdown.dispatchEvent(event));
      
      console.log(`Set song count dropdown to: ${value}`);
      return true;
    }

    console.log(`Could not find option for ${value} songs in dropdown`);
    return false;
  }

  // Find select associated with a label
  function findSelectForLabel(label) {
    // Check for 'for' attribute
    if (label.htmlFor) {
      const element = document.getElementById(label.htmlFor);
      if (element && element.tagName === 'SELECT') {
        return element;
      }
    }
    
    // Check for nested select
    const nestedSelect = label.querySelector('select');
    if (nestedSelect) {
      return nestedSelect;
    }
    
    // Check for sibling select
    const sibling = label.nextElementSibling;
    if (sibling && sibling.tagName === 'SELECT') {
      return sibling;
    }
    
    return null;
  }

  // Get custom fields from storage
  function getCustomFields() {
    return new Promise((resolve) => {
      try {
        if (!chrome || !chrome.storage || !chrome.storage.local || chrome.runtime?.id === undefined) {
          console.log('Chrome storage API not available or extension context invalidated');
          resolve({});
          return;
        }
        
        chrome.storage.local.get(['customFields'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('Storage error:', chrome.runtime.lastError);
            resolve({});
          } else {
            resolve(result.customFields || {});
          }
        });
      } catch (error) {
        console.log('Storage access error:', error);
        resolve({});
      }
    });
  }

  // Show main extension panel with tabbed interface
  async function showMainPanel() {
    // Remove existing panel
    const existing = document.getElementById('distrokid-main-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'distrokid-main-panel';
    panel.className = 'distrokid-main-panel';
    
    // Get current data
    const metadata = await getStoredMetadata();
    const customFields = await getCustomFields();
    const tokens = await getBearerTokens();

    // Determine which site we're on
    const isDistroKid = window.location.hostname.includes('distrokid.com');
    const isSuno = window.location.hostname.includes('suno.com');
    
    let panelHTML = `
      <div class="panel-header">
        <h3>${isDistroKid ? 'DistroKid Helper' : 'Suno Helper'}</h3>
      </div>
      
      <div class="tab-content">
    `;
    
    if (isDistroKid) {
      panelHTML += `
        <div class="tab-pane active">
          <div class="tab-section">
            <h4>Select Album</h4>
            <button id="select-json-btn" class="select-folder-btn">Select meta.json File</button>
            <input type="file" id="panel-json-input" accept=".json" style="display: none;" />
            
            <div id="folder-info" class="folder-info ${metadata ? '' : 'hidden'}">
              <div class="folder-name">📁 ${metadata?.albumTitle || 'No album selected'}</div>
              <div class="file-count">${metadata?.tracks?.length || 0} tracks found</div>
            </div>
          </div>
          
          <div class="tab-section ${metadata ? '' : 'hidden'}" id="override-section">
            <h4>Album Info</h4>
            <div class="form-group">
              <label>Artist Name:</label>
              <input type="text" id="panel-artist-input" placeholder="Artist Name" value="${metadata?.artistName || ''}">
            </div>
            <div class="form-group">
              <label>Album Title:</label>
              <input type="text" id="panel-album-input" placeholder="Album Title" value="${metadata?.albumTitle || ''}">
            </div>
            <div class="form-group">
              <label>Songwriter First Name:</label>
              <input type="text" id="panel-songwriter-first" placeholder="First Name" value="${customFields.songwriterFirst || ''}">
            </div>
            <div class="form-group">
              <label>Songwriter Last Name:</label>
              <input type="text" id="panel-songwriter-last" placeholder="Last Name" value="${customFields.songwriterLast || ''}">
            </div>
            <div class="form-group">
              <label>Custom Tag:</label>
              <input type="text" id="panel-tag-input" placeholder="e.g., [Remix], (Demo)" value="${customFields.tag || ''}">
            </div>
            <div class="form-group">
              <label>Tag Position:</label>
              <select id="panel-tag-position">
                <option value="prepend" ${customFields.tagPosition === 'prepend' ? 'selected' : ''}>Prepend (Tag + Title)</option>
                <option value="append" ${customFields.tagPosition === 'append' ? 'selected' : ''}>Append (Title + Tag)</option>
                <option value="random" ${customFields.tagPosition === 'random' ? 'selected' : ''}>Random</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="panel-instrumental" ${customFields.instrumental ? 'checked' : ''}>
                Instrumental (no lyrics)
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="panel-reverse-order" ${customFields.reverseOrder ? 'checked' : ''}>
                Apply tracklist in reverse order
              </label>
            </div>
          </div>
          
          <div class="tab-section">
            <button id="clear-data-btn" class="danger-btn">Clear All Data</button>
          </div>
        </div>
      `;
    } else if (isSuno) {
      panelHTML += `        
        <div class="tab-pane active" id="download-tab">
          <div class="tab-section">
            <div class="form-group">
              <label for="playlist-url-input">Playlist URL or ID:</label>
              <input type="text" id="playlist-url-input" placeholder="Playlist URL or ID" value="${getCurrentPlaylistId()}" style="color: #333; background: #fff;">
            </div>
            <div class="form-group">
              <label for="audio-format-select">Format:</label>
              <select id="audio-format-select" style="color: #333; background: #fff;">
                <option value="wav" selected>WAV</option>
                <option value="mp3">MP3</option>
              </select>
            </div>
            <div id="token-status" class="token-status hidden">
              <div class="token-expired">
                <span>⚠️ Bearer token expired or unavailable</span>
                <button id="refresh-page-btn" class="refresh-btn">Refresh Page</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    panelHTML += `
      </div>
      
      <div class="sticky-actions">`;
    
    if (isDistroKid) {
      panelHTML += `
        <button id="autofill-btn" class="primary-btn" ${!metadata ? 'disabled' : ''}>
          <span class="btn-text">Auto-fill DistroKid Form</span>
          <span class="btn-close" onclick="window.distrokidTogglePanel()">×</span>
        </button>
      `;
    } else if (isSuno) {
      panelHTML += `
        <button id="download-playlist-btn" class="primary-btn">Download Suno Playlist</button>
      `;
    }
    
    panelHTML += `
      </div>
    `;
    
    panel.innerHTML = panelHTML;

    document.body.appendChild(panel);
    setupPanelEventListeners();

    // Animate in
    setTimeout(() => {
      panel.classList.add('show');
    }, 10);
  }
  
  // Close main panel
  function closeMainPanel() {
    const panel = document.getElementById('distrokid-main-panel');
    if (panel) {
      panel.classList.remove('show');
      setTimeout(() => {
        panel.remove();
      }, 300);
    }
  }

  // Get bearer tokens from storage
  function getBearerTokens() {
    return new Promise((resolve) => {
      try {
        if (!chrome || !chrome.runtime || chrome.runtime?.id === undefined) {
          console.log('Chrome runtime not available or extension context invalidated');
          resolve([]);
          return;
        }
        
        chrome.runtime.sendMessage({ action: 'getTokens' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Runtime error:', chrome.runtime.lastError);
            resolve([]);
          } else {
            const tokens = response?.tokens || [];
            // Filter out tokens older than 30 minutes
            const now = Date.now();
            const validTokens = tokens.filter(tokenData => {
              if (typeof tokenData === 'string') {
                // Old format, assume it's still valid
                return true;
              }
              // New format with timestamp
              const age = now - (tokenData.timestamp || 0);
              return age < 30 * 60 * 1000; // 30 minutes
            });
            
            // Extract just the token strings for backward compatibility
            const tokenStrings = validTokens.map(tokenData => 
              typeof tokenData === 'string' ? tokenData : tokenData.token
            );
            
            resolve(tokenStrings);
          }
        });
      } catch (error) {
        console.log('Runtime access error:', error);
        resolve([]);
      }
    });
  }

  // ===== HTML GENERATION FUNCTIONS =====

  // Generate metadata preview HTML
  function generateMetadataPreview(metadata) {
    if (!metadata || !metadata.tracks || metadata.tracks.length === 0) {
      return '<div class="no-data">No tracks found</div>';
    }

    let html = '<div class="album-info">';
    
    if (metadata.albumTitle) {
      html += `<div><strong>Album:</strong> ${escapeHtml(metadata.albumTitle)}</div>`;
    }
    
    if (metadata.artistName) {
      html += `<div><strong>Artist:</strong> ${escapeHtml(metadata.artistName)}</div>`;
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

    return html;
  }

  // Generate tokens list HTML
  function generateTokensList(tokens) {
    if (!tokens || tokens.length === 0) {
      return '<div class="no-tokens">No tokens captured yet. Visit suno.com to capture tokens.</div>';
    }
    
    let html = '';
    tokens.forEach((token, index) => {
      const previewText = token.length > 20 
        ? `${token.substring(0, 20)}...` 
        : token;
      
      html += `
        <div class="token-item">
          <span class="token-preview" title="${escapeHtml(token)}">${escapeHtml(previewText)}</span>
          <button class="copy-token-btn" onclick="copyTokenToClipboard('${escapeHtml(token)}')">Copy</button>
        </div>
      `;
    });
    
    return html;
  }

  // Generate latest token display (compact single row)
  function generateLatestTokenDisplay(token) {
    const previewText = token.length > 30 
      ? `${token.substring(0, 30)}...` 
      : token;
    
    return `
      <div class="latest-token-item">
        <span class="token-preview" title="${escapeHtml(token)}">${escapeHtml(previewText)}</span>
        <button class="copy-token-btn" onclick="copyTokenToClipboard('${escapeHtml(token)}')">Copy</button>
      </div>
    `;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Copy token to clipboard
  window.copyTokenToClipboard = function(token) {
    navigator.clipboard.writeText(token).then(() => {
      showNotification('✓ Token copied to clipboard', 'success', 2000);
    }).catch(err => {
      console.error('Failed to copy token:', err);
      showNotification('Failed to copy token', 'error');
    });
  };

  // Toggle expandable content
  window.toggleExpandable = function(contentId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(contentId + '-icon');
    
    if (content && icon) {
      content.classList.toggle('collapsed');
      icon.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
    }
  };

  // Show token expired status
  function showTokenExpiredStatus() {
    const tokenStatus = document.getElementById('token-status');
    if (tokenStatus) {
      tokenStatus.classList.remove('hidden');
    }
  }

  // Hide token expired status
  function hideTokenExpiredStatus() {
    const tokenStatus = document.getElementById('token-status');
    if (tokenStatus) {
      tokenStatus.classList.add('hidden');
    }
  }

  // Setup tab navigation
  function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and panes
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding pane
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }

  // Get current playlist ID from URL if on a playlist page
  function getCurrentPlaylistId() {
    const url = window.location.href;
    const playlistMatch = url.match(/\/playlist\/([a-f0-9-]+)/);
    return playlistMatch ? playlistMatch[1] : '';
  }

  // Extract playlist ID from URL or return as-is if already an ID
  function extractPlaylistId(input) {
    if (!input) return '';
    
    // If it's a full URL, extract the ID
    const urlMatch = input.match(/\/playlist\/([a-f0-9-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // If it looks like a UUID, return as-is
    if (/^[a-f0-9-]+$/.test(input)) {
      return input;
    }
    
    return input;
  }

  // ===== SUNO DOWNLOAD FUNCTIONS =====

  // Helper functions for WAV conversion
  async function checkWavExists(songId, token) {
    const response = await fetch(`https://studio-api.prod.suno.com/api/gen/${songId}/wav_file/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*',
        'Origin': 'https://suno.com',
        'Referer': 'https://suno.com/',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.wav_file_url || null;
    }
    return null;
  }

  async function convertToWav(songId, token) {
    const response = await fetch(`https://studio-api.prod.suno.com/api/gen/${songId}/convert_wav/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*',
        'Origin': 'https://suno.com',
        'Referer': 'https://suno.com/',
      },
    });

    return response.ok || response.status === 204;
  }

  async function waitForWav(songId, token, retries = 30, delay = 5000) {
    for (let i = 0; i < retries; i++) {
      const wavUrl = await checkWavExists(songId, token);
      if (wavUrl) {
        return wavUrl;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
  }

  async function downloadAudioFile(url, onProgress) {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (total && onProgress) {
        const progress = (receivedLength / total) * 100;
        onProgress(progress);
      }
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    return blob;
  }

  function cleanFileName(title) {
    return title.replace(/[^a-z0-9\s\-_]/gi, '').trim();
  }

  // Format seconds to MM:SS timestamp
  function formatTimestamp(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Get audio duration from blob
  function getAudioDuration(blob) {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        const url = URL.createObjectURL(blob);
        
        audio.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(url);
          resolve(audio.duration || 0);
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve(0);
        });
        
        audio.src = url;
      } catch (error) {
        console.error('Error getting audio duration:', error);
        resolve(0);
      }
    });
  }

  // Create persistent download progress indicator
  function createPersistentProgressIndicator() {
    const progressDiv = document.createElement('div');
    progressDiv.id = 'persistent-download-progress';
    progressDiv.className = 'persistent-download-progress hidden';
    
    progressDiv.innerHTML = `
      <div class="persistent-progress-header">
        <span class="persistent-progress-title">Suno Download</span>
        <button class="persistent-progress-close" onclick="this.parentElement.parentElement.classList.add('hidden')">×</button>
      </div>
      <div class="persistent-progress-content">
        <div class="progress-info">
          <span id="persistent-progress-text" class="progress-text-ellipsis">Preparing download...</span>
          <span id="persistent-progress-percent">0%</span>
        </div>
        <div class="progress-bar">
          <div id="persistent-progress-fill" class="progress-fill"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  // Download playlist from Suno with individual file downloads
  async function downloadPlaylist(playlistId, format, token) {
    // Create or get persistent download progress indicator
    let progressDiv = document.getElementById('persistent-download-progress');
    if (!progressDiv) {
      progressDiv = createPersistentProgressIndicator();
    }
    
    const progressText = progressDiv.querySelector('#persistent-progress-text');
    const progressPercent = progressDiv.querySelector('#persistent-progress-percent');
    const progressFill = progressDiv.querySelector('#persistent-progress-fill');
    
    progressDiv.classList.remove('hidden');
    
    try {
      // Fetch playlist data
      progressText.textContent = 'Fetching metadata from Suno...';
      
      let clips = [];
      let detectedAlbumTitle = '';
      
      try {
        const response = await fetch(`https://studio-api.prod.suno.com/api/playlist/${playlistId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': '*/*',
            'Origin': 'https://suno.com',
            'Referer': 'https://suno.com/',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
        }

        const playlistData = await response.json();
        console.log('Playlist API response:', playlistData);
        clips = playlistData.playlist_clips?.map(item => item.clip) || [];
        detectedAlbumTitle = playlistData.name || 'Suno Playlist';
        console.log('Extracted clips:', clips);
      } catch (playlistError) {
        // Try as single song
        const songResponse = await fetch(`https://studio-api.prod.suno.com/api/feed/${playlistId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': '*/*',
            'Origin': 'https://suno.com',
            'Referer': 'https://suno.com/',
          },
        });

        if (songResponse.ok) {
          const songData = await songResponse.json();
          clips = [songData];
          detectedAlbumTitle = 'Suno Song';
        }
      }
      
      if (clips.length === 0) {
        throw new Error('No songs found. Please check your ID and try again.');
      }

      // Collect files for individual download
      const downloadFiles = new Map();
      const tracks = [];
      
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const trackNumber = i + 1;
        const trackTitle = clip.title || `Track ${trackNumber}`;
        const cleanTitle = cleanFileName(trackTitle);
        const fileExtension = format === 'wav' ? 'wav' : 'mp3';
        const fileName = `${String(trackNumber).padStart(2, '0')} - ${cleanTitle}.${fileExtension}`;

        progressText.textContent = `Processing ${trackNumber}/${clips.length}: ${trackTitle}`;
        
        try {
          let audioUrl = clip.audio_url;

          // Handle WAV format conversion
          if (format === 'wav') {
            progressText.textContent = `Converting ${trackNumber}/${clips.length}: ${trackTitle}`;
            
            // Check if WAV already exists
            let wavUrl = await checkWavExists(clip.id, token);
            
            if (!wavUrl) {
              // Request conversion
              const converted = await convertToWav(clip.id, token);
              if (!converted) {
                throw new Error('Failed to initiate WAV conversion');
              }
              
              // Wait for conversion
              wavUrl = await waitForWav(clip.id, token);
              if (!wavUrl) {
                throw new Error('WAV conversion timed out');
              }
            }
            
            audioUrl = wavUrl;
          }

          if (!audioUrl) {
            throw new Error('No audio URL available');
          }

          progressText.textContent = `Downloading ${trackNumber}/${clips.length}: ${trackTitle}`;
          
          const audioBlob = await downloadAudioFile(audioUrl, (progress) => {
            const overallProgress = Math.round(((i + progress/100) / clips.length) * 100);
            progressPercent.textContent = `${overallProgress}%`;
            progressFill.style.width = `${overallProgress}%`;
          });

          downloadFiles.set(fileName, audioBlob);

          // Get duration from the actual audio file
          progressText.textContent = `Analyzing ${trackNumber}/${clips.length}: ${trackTitle}`;
          const duration = await getAudioDuration(audioBlob);
          
          // Debug logging
          console.log(`Track ${trackNumber}: ${trackTitle}, Duration: ${duration}s (from audio file)`);

          tracks.push({
            trackNumber,
            fileName,
            title: trackTitle,
            duration: duration,
          });

          const overallProgress = Math.round(((i + 1) / clips.length) * 100);
          progressPercent.textContent = `${overallProgress}%`;
          progressFill.style.width = `${overallProgress}%`;
        } catch (error) {
          console.error(`Error downloading ${trackTitle}:`, error);
          // Continue with other tracks
        }
      }

      // Create metadata
      const metaJson = {
        albumTitle: detectedAlbumTitle,
        artistName: clips[0]?.metadata?.tags || 'Suno Artist',
        primaryGenre: clips[0]?.display_tags || clips[0]?.metadata?.tags || 'Electronic',
        tracks,
      };

      // Add meta.json to files for download
      downloadFiles.set('meta.json', new Blob([JSON.stringify(metaJson, null, 2)], { type: 'application/json' }));

      // Create YouTube-style timestamped tracklist
      let currentTime = 0;
      const tracklistLines = [];
      
      console.log('Creating tracklist with tracks:', tracks);
      
      for (const track of tracks) {
        const timestamp = formatTimestamp(currentTime);
        tracklistLines.push(`${timestamp} - ${track.title}`);
        console.log(`Tracklist entry: ${timestamp} - ${track.title} (duration: ${track.duration}s, next start: ${currentTime + track.duration}s)`);
        currentTime += track.duration;
      }
      
      const tracklistContent = tracklistLines.join('\n');
      console.log('Final tracklist content:', tracklistContent);
      downloadFiles.set('tracklist.txt', new Blob([tracklistContent], { type: 'text/plain' }));

      progressText.textContent = 'Creating ZIP file...';
      
      // Create and download ZIP file using JSZip
      await createAndDownloadZipWithJSZip(downloadFiles, detectedAlbumTitle, format);
      
      progressText.textContent = 'Download complete!';
      progressPercent.textContent = '100%';
      progressFill.style.width = '100%';
      
      showNotification(`✓ Downloaded ${tracks.length} tracks in ${format.toUpperCase()} format!`, 'success', 5000);
      
      setTimeout(() => {
        progressDiv.classList.add('hidden');
      }, 3000);
      
    } catch (error) {
      console.error('Download error:', error);
      progressText.textContent = 'Download failed';
      progressPercent.textContent = '';
      progressFill.style.width = '0%';
      
      showNotification(`Error: ${error.message}`, 'error', 5000);
      
      setTimeout(() => {
        progressDiv.classList.add('hidden');
      }, 3000);
    }
  }

  // Create and download ZIP file using JSZip
  async function createAndDownloadZipWithJSZip(files, albumTitle, format) {
    const zipFileName = albumTitle 
      ? `${cleanFileName(albumTitle)}_${format}.zip`
      : `suno-download-${format}-${Date.now()}.zip`;
    
    try {
      // Create new JSZip instance
      const zip = new JSZip();
      
      // Add each file to the ZIP
      for (const [fileName, blob] of files.entries()) {
        zip.file(fileName, blob);
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      // Download the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification(`✓ Downloaded ZIP file: ${zipFileName}`, 'success', 5000);
    } catch (error) {
      console.error('JSZip creation failed, downloading files individually:', error);
      
      // Fallback: download files individually
      await downloadIndividualFiles(files, albumTitle, format);
    }
  }

  // Download files individually into album folder (fallback)
  async function downloadIndividualFiles(files, albumTitle, format) {
    const cleanAlbumTitle = albumTitle ? cleanFileName(albumTitle) : 'Suno_Download';
    let downloadCount = 0;
    
    for (const [fileName, blob] of files.entries()) {
      const url = URL.createObjectURL(blob);
      
      try {
        // Use Chrome downloads API to create folder structure
        if (chrome && chrome.downloads) {
          await new Promise((resolve, reject) => {
            chrome.downloads.download({
              url: url,
              filename: `${cleanAlbumTitle}/${fileName}`,
              saveAs: false
            }, (downloadId) => {
              if (chrome.runtime.lastError) {
                console.warn('Chrome downloads API failed, falling back to direct download:', chrome.runtime.lastError);
                // Fallback to direct download
                const a = document.createElement('a');
                a.href = url;
                a.download = `${cleanAlbumTitle} - ${fileName}`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              resolve();
            });
          });
        } else {
          // Fallback for when Chrome downloads API is not available
          const a = document.createElement('a');
          a.href = url;
          a.download = `${cleanAlbumTitle} - ${fileName}`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (error) {
        console.warn('Download failed, trying fallback method:', error);
        // Final fallback
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanAlbumTitle} - ${fileName}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      URL.revokeObjectURL(url);
      downloadCount++;
      
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    showNotification(`Downloaded ${downloadCount} files into "${cleanAlbumTitle}" folder. Check your Downloads folder.`, 'success', 8000);
  }


  // Setup panel event listeners
  function setupPanelEventListeners() {
    // JSON file selection
    const selectJsonBtn = document.getElementById('select-json-btn');
    if (selectJsonBtn) {
      selectJsonBtn.addEventListener('click', () => {
        document.getElementById('panel-json-input').click();
      });
    }

    const jsonInput = document.getElementById('panel-json-input');
    if (jsonInput) {
      jsonInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        
        if (!file) {
          showNotification('No file selected', 'error');
          return;
        }

        if (!file.name.endsWith('.json')) {
          showNotification('Please select a JSON file', 'error');
          return;
        }

        try {
          const text = await file.text();
          const metadata = JSON.parse(text);
          await saveMetadata(metadata);
          
          // Update the panel content without closing
          updateMetadataDisplay(metadata);
          
          showNotification('✓ Album metadata loaded', 'success');
        } catch (error) {
          console.error('Error processing JSON file:', error);
          showNotification(`Error: ${error.message}`, 'error');
        }
      });
    }

    // Custom fields auto-save
    const tagInput = document.getElementById('panel-tag-input');
    const tagPosition = document.getElementById('panel-tag-position');
    const songwriterFirstInput = document.getElementById('panel-songwriter-first');
    const songwriterLastInput = document.getElementById('panel-songwriter-last');
    const instrumentalCheckbox = document.getElementById('panel-instrumental');
    const reverseOrderCheckbox = document.getElementById('panel-reverse-order');
    
    if (tagInput && tagPosition) {
      const saveCustomFields = () => {
        const customFields = {
          tag: tagInput.value,
          tagPosition: tagPosition.value,
          songwriterFirst: songwriterFirstInput ? songwriterFirstInput.value : '',
          songwriterLast: songwriterLastInput ? songwriterLastInput.value : '',
          instrumental: instrumentalCheckbox ? instrumentalCheckbox.checked : false,
          reverseOrder: reverseOrderCheckbox ? reverseOrderCheckbox.checked : false
        };
        
        chrome.storage.local.set({ customFields }, () => {
          console.log('Custom fields saved:', customFields);
        });
      };
      
      tagInput.addEventListener('input', saveCustomFields);
      tagPosition.addEventListener('change', saveCustomFields);
      
      if (songwriterFirstInput) {
        songwriterFirstInput.addEventListener('input', saveCustomFields);
      }
      
      if (songwriterLastInput) {
        songwriterLastInput.addEventListener('input', saveCustomFields);
      }
      
      if (instrumentalCheckbox) {
        instrumentalCheckbox.addEventListener('change', saveCustomFields);
      }
      
      if (reverseOrderCheckbox) {
        reverseOrderCheckbox.addEventListener('change', saveCustomFields);
      }
    }

    // Override fields auto-save
    const artistInput = document.getElementById('panel-artist-input');
    const albumInput = document.getElementById('panel-album-input');
    
    if (artistInput) {
      artistInput.addEventListener('input', async () => {
        const metadata = await getStoredMetadata();
        if (metadata) {
          metadata.artistName = artistInput.value;
          await saveMetadata(metadata);
        }
      });
    }
    
    if (albumInput) {
      albumInput.addEventListener('input', async () => {
        const metadata = await getStoredMetadata();
        if (metadata) {
          metadata.albumTitle = albumInput.value;
          await saveMetadata(metadata);
        }
      });
    }

    // Auto-fill button
    const autofillBtn = document.getElementById('autofill-btn');
    if (autofillBtn && !autofillBtn.disabled) {
      autofillBtn.addEventListener('click', () => {
        handleAutofill();
        // Don't close panel anymore
      });
    }

    // Clear data button
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all stored data?')) {
          chrome.storage.local.clear(() => {
            showNotification('✓ All data cleared', 'success');
            closeMainPanel();
          });
        }
      });
    }

    // Download playlist button
    const downloadBtn = document.getElementById('download-playlist-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        const urlInput = document.getElementById('playlist-url-input');
        const formatSelect = document.getElementById('audio-format-select');
        
        const playlistId = extractPlaylistId(urlInput.value.trim());
        const format = formatSelect.value;
        
        if (!playlistId) {
          showNotification('Please enter a valid playlist URL or ID', 'error');
          return;
        }
        
        // Get the most recent token
        const tokens = await getBearerTokens();
        if (!tokens || tokens.length === 0) {
          showNotification('No bearer tokens found. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          return;
        }
        
        const token = tokens[0];
        if (!token || token.length < 10) {
          showNotification('Invalid bearer token. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          return;
        }
        
        try {
          await downloadPlaylist(playlistId, format, token);
        } catch (error) {
          if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized')) {
            showTokenExpiredStatus();
            showNotification('Bearer token expired. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          } else {
            throw error;
          }
        }
      });
    }

    // Suno download button
    const downloadSunoBtn = document.getElementById('download-suno-btn');
    if (downloadSunoBtn) {
      downloadSunoBtn.addEventListener('click', async () => {
        const playlistInput = document.getElementById('playlist-url-input');
        const formatSelect = document.getElementById('audio-format-select');
        
        const playlistId = extractPlaylistId(playlistInput.value);
        const format = formatSelect.value;
        
        if (!playlistId) {
          showNotification('Please enter a valid playlist URL or ID', 'error');
          return;
        }
        
        // Hide token status on new attempt
        hideTokenExpiredStatus();
        
        // Get the most recent token
        const tokens = await getBearerTokens();
        if (!tokens || tokens.length === 0) {
          showTokenExpiredStatus();
          showNotification('No bearer tokens found. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          return;
        }
        
        const token = tokens[0];
        if (!token || token.length < 10) {
          showTokenExpiredStatus();
          showNotification('Invalid bearer token. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          return;
        }
        
        try {
          await downloadPlaylist(playlistId, format, token);
        } catch (error) {
          if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized')) {
            showTokenExpiredStatus();
            showNotification('Bearer token expired. Please refresh the page and visit suno.com to capture a new token.', 'error', 8000);
          } else {
            throw error;
          }
        }
      });
    }

    // Refresh page button
    const refreshBtn = document.getElementById('refresh-page-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  // ===== PANEL UI FUNCTIONS =====

  // Update metadata display in the panel
  function updateMetadataDisplay(metadata) {
    const folderInfo = document.getElementById('folder-info');
    const autofillBtn = document.getElementById('autofill-btn');
    const overrideSection = document.getElementById('override-section');
    const artistInput = document.getElementById('panel-artist-input');
    const albumInput = document.getElementById('panel-album-input');
    
    if (folderInfo) {
      folderInfo.classList.remove('hidden');
      const folderName = folderInfo.querySelector('.folder-name');
      const fileCount = folderInfo.querySelector('.file-count');
      
      if (folderName) folderName.textContent = `📁 ${metadata?.albumTitle || 'Album loaded'}`;
      if (fileCount) fileCount.textContent = `${metadata?.tracks?.length || 0} tracks found`;
    }
    
    if (overrideSection) {
      if (metadata) {
        overrideSection.classList.remove('hidden');
      } else {
        overrideSection.classList.add('hidden');
      }
    }
    
    // Autofill override fields
    if (artistInput && metadata?.artistName) {
      artistInput.value = metadata.artistName;
    }
    
    if (albumInput && metadata?.albumTitle) {
      albumInput.value = metadata.albumTitle;
    }
    
    if (autofillBtn) {
      autofillBtn.disabled = !metadata;
    }
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

  // ===== UTILITY FUNCTIONS =====

  // Show notification toast
  function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notification
    const existing = document.getElementById('distrokid-autofill-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'distrokid-autofill-notification';
    notification.className = `distrokid-autofill-notification distrokid-autofill-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Remove after duration
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
  }

})();
