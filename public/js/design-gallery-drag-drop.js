/**
 * Design Gallery with Drag-and-Drop Functionality
 * A completely new approach for linking designs with print areas
 */

// Store all generated designs with their metadata
let designGallery = [];

// Design-to-print area assignments (printAreaId -> designId)
let designAssignments = {};

// History for undo/redo functionality
let assignmentHistory = [];
let historyPosition = -1;

// Track compatibility between designs and print areas
let designCompatibility = {};

// Expose the design assignments globally
window.designAssignments = designAssignments;

/**
 * Display generated designs in a gallery format with drag-and-drop support
 * @param {Array} images - Array of image objects with URLs and metadata
 */
function displayGeneratedDesigns(images) {
  console.log('DRAG-DROP: Displaying generated designs with drag-drop:', images);
  console.log('Images data structure:', JSON.stringify(images));
  
  // Make sure the design gallery section is visible
  const designGallerySection = document.getElementById('designGallerySection');
  if (designGallerySection) {
    designGallerySection.style.display = 'block';
  }
  
  // Store the designs in our gallery
  if (!Array.isArray(designGallery)) {
    designGallery = [];
  }
  
  // Reset the design gallery
  designGallery = [];
  
  // Process each image
  images.forEach((image, index) => {
    // Use the provided ID or generate a new one
    const designId = image.id || `design-${Date.now()}-${index}`;
    
    // Extract image data, handling different property names
    const designData = {
      id: designId,
      url: image.url || image.image_url || image.originalUrl || '',
      originalUrl: image.original_url || image.originalUrl || image.url || image.image_url || '',
      prompt: image.prompt || 'No prompt available',
      timestamp: new Date().toISOString(),
      width: image.width || 800,
      height: image.height || 800,
      printAreaContext: image.printAreaContext || null
    };
    
    console.log(`Adding design ${index} with ID: ${designId} and URL: ${designData.url}`);
    designGallery.push(designData);
  });
  
  // Make designs available globally
  window.designGallery = designGallery;
  
  // Skip workspace creation if no designs
  if (designGallery.length === 0) {
    console.warn('No designs to display');
    return;
  }
  
  // Populate the design gallery directly
  populateDesignGallery();
  
  // Initialize the print areas container
  initializePrintAreas();
  
  // Set up event listeners for undo/redo buttons
  setupUndoRedoListeners();
  
  // Show the designs section
  const designsSection = document.getElementById('generatedDesignsSection');
  if (designsSection) {
    designsSection.classList.remove('d-none');
  }
}

/**
 * Create the design workspace UI structure
 */
function createDesignWorkspace() {
  // Find the correct containers in the DOM
  const designGallerySection = document.getElementById('designGallerySection');
  const designGalleryContainer = document.querySelector('#designGallerySection #designGallery');
  
  console.log('Looking for design containers:', { designGallerySection, designGalleryContainer });
  
  // Make sure the design gallery section is visible
  if (designGallerySection) {
    designGallerySection.style.display = 'block';
  } else {
    console.error('Design gallery section not found in the DOM');
    return;
  }
  
  // Make sure we have a container for the designs
  if (!designGalleryContainer) {
    console.error('Design gallery container not found in the DOM');
    return;
  }
  
  // Clear previous content in the design gallery container
  designGalleryContainer.innerHTML = '';
  
  // Get the product preview container
  const productPreviewContainer = document.getElementById('productPreviewContainer');
  if (!productPreviewContainer) {
    console.error('Product preview container not found');
  }
  
  // Create a container for our drag-drop interface
  const dragDropContainer = document.createElement('div');
  dragDropContainer.className = 'design-workspace';
  
  // Add instruction alert
  const instructionAlert = document.createElement('div');
  instructionAlert.className = 'alert alert-info mb-3';
  instructionAlert.innerHTML = `
    <i class="bi bi-info-circle-fill me-2"></i>
    <strong>Drag and drop</strong> designs onto print areas to assign them. The design will automatically appear on your product.
  `;
  
  // Create the design gallery grid
  const designGrid = document.createElement('div');
  designGrid.id = 'designGalleryGrid';
  designGrid.className = 'row g-2';
  
  // Add empty message
  const emptyMessage = document.createElement('div');
  emptyMessage.id = 'emptyDesignsMessage';
  emptyMessage.className = 'text-center py-5 text-muted';
  emptyMessage.innerHTML = `
    <i class="bi bi-images fs-1"></i>
    <p class="mt-3">No designs generated yet.</p>
  `;
  
  // Add control buttons above the design gallery
  const controlsRow = document.createElement('div');
  controlsRow.className = 'mb-3 d-flex justify-content-between align-items-center';
  controlsRow.innerHTML = `
    <span class="badge bg-primary" id="designCount">0 designs</span>
    <div>
      <button type="button" class="btn btn-sm btn-outline-primary" id="undoBtn" disabled>
        <i class="bi bi-arrow-counterclockwise"></i> Undo
      </button>
      <button type="button" class="btn btn-sm btn-outline-primary ms-1" id="redoBtn" disabled>
        <i class="bi bi-arrow-clockwise"></i> Redo
      </button>
      <button type="button" class="btn btn-sm btn-outline-danger ms-1" id="clearAllBtn" disabled>
        <i class="bi bi-trash"></i> Clear All
      </button>
    </div>
  `;
  
  // Assemble the design gallery
  designGalleryContainer.appendChild(instructionAlert);
  designGalleryContainer.appendChild(controlsRow);
  designGalleryContainer.appendChild(designGrid);
  designGrid.appendChild(emptyMessage);
  
  // Update design count
  updateDesignCount();
}

/**
 * Populate the design gallery with draggable design items
 */
function populateDesignGallery() {
  console.log('Populating design gallery with designs:', designGallery);
  
  // Get the design gallery container from the existing HTML
  // First try to find the design gallery within the design gallery section (product creation workflow)
  const designGalleryContainer = document.querySelector('#designGallerySection #designGallery');
  if (!designGalleryContainer) {
    console.error('Design gallery container not found');
    return;
  }
  
  // Clear the container
  designGalleryContainer.innerHTML = '';
  
  // Show empty message if no designs
  if (!designGallery || designGallery.length === 0) {
    designGalleryContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="alert alert-info">
          <i class="bi bi-images me-2"></i>
          No designs generated yet. Select a print area and generate designs.
        </div>
      </div>
    `;
    return;
  }
  
  // Add each design to the gallery with drag capability
  designGallery.forEach((design, index) => {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-6 mb-3';
    
    // Get design dimensions
    let designWidth = design.width;
    let designHeight = design.height;
    
    // If not available, try to get from printAreaContext
    if ((!designWidth || !designHeight) && design.printAreaContext) {
      designWidth = design.printAreaContext.width;
      designHeight = design.printAreaContext.height;
    }
    
    // Use defaults if still not available
    designWidth = designWidth || 800;
    designHeight = designHeight || 800;
    
    // Create the card with the design
    const card = document.createElement('div');
    card.className = 'card design-item h-100';
    card.dataset.designId = design.id;
    card.draggable = true;
    
    card.innerHTML = `
      <div class="card-img-top position-relative">
        <img src="${design.url}" class="img-fluid design-image" alt="Design ${index + 1}">
        <div class="position-absolute top-0 end-0 p-1">
          <span class="badge bg-dark">${designWidth}×${designHeight}</span>
        </div>
      </div>
      <div class="card-footer p-2 text-center">
        <small class="text-muted">Design ${index + 1}</small>
        <div class="mt-1">
          <span class="badge bg-primary">Drag to assign</span>
        </div>
      </div>
    `;
    
    col.appendChild(card);
    designGalleryContainer.appendChild(col);
    
    // Make the design draggable
    const designImage = card.querySelector('.design-image');
    
    designImage.addEventListener('dragstart', (e) => {
      // Ensure we have valid data to transfer
      const dragData = {
        type: 'design',
        id: design.id || design.name || ''
      };
      
      console.log('Setting drag data:', dragData);
      
      // Set the data in two formats for compatibility
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      
      card.classList.add('dragging');
      
      // Create a custom drag image
      const dragImage = designImage.cloneNode(true);
      dragImage.style.width = '100px';
      dragImage.style.height = 'auto';
      dragImage.style.opacity = '0.7';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 50, 50);
      
      // Remove the clone after drag starts
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    });
    
    designImage.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });
  
  // Update design count
  updateDesignCount();
}

/**
 * Initialize the print areas container with droppable areas
 */
function initializePrintAreas() {
  console.log('Initializing print areas for drag-drop');
  
  // Get the print areas container from the existing HTML
  const printAreasContainer = document.getElementById('printAreasList');
  if (!printAreasContainer) {
    console.error('Print areas container not found');
    return;
  }
  
  // Clear the container
  printAreasContainer.innerHTML = '';
  
  // Get print areas from the product data
  // Check multiple possible sources for print area data
  let printAreas = [];
  
  if (window.currentBlueprintData && window.currentBlueprintData.print_areas) {
    printAreas = window.currentBlueprintData.print_areas;
  } else if (window.printAreas) {
    printAreas = window.printAreas;
  } else if (window.selectedProduct && window.selectedProduct.print_areas) {
    printAreas = window.selectedProduct.print_areas;
  }
  
  console.log('Available print areas for drag-drop:', printAreas);
  
  // Show empty message if no print areas
  if (!printAreas || printAreas.length === 0) {
    // Create some default print areas for testing if none are available
    printAreas = [
      {
        id: 'front',
        title: 'Front',
        placeholders: [{
          width: 4000,
          height: 5000,
          position: { x: 2500, y: 2500 }
        }]
      },
      {
        id: 'back',
        title: 'Back',
        placeholders: [{
          width: 4000,
          height: 5000,
          position: { x: 2500, y: 2500 }
        }]
      }
    ];
    console.log('Using default print areas for testing');
  }
  
  // If still no print areas, show empty message
  if (printAreas.length === 0) {
    printAreasContainer.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-grid-3x3-gap fs-1"></i>
        <p class="mt-3">Select a product to see available print areas</p>
      </div>
    `;
    return;
  }
  
  // Update the print area count
  const printAreaCount = document.getElementById('printAreaCount');
  if (printAreaCount) {
    printAreaCount.textContent = `${printAreas.length} areas`;
  }
  
  // Create print area cards in a row
  const row = document.createElement('div');
  row.className = 'row g-3';
  printAreasContainer.appendChild(row);
  
  // Create each print area as a card
  printAreas.forEach(area => {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    const areaCard = document.createElement('div');
    areaCard.className = 'card h-100 print-area-card';
    areaCard.dataset.areaId = area.id;
    
    // Check if this area has an assigned design
    const assignedDesignId = designAssignments[area.id];
    const assignedDesign = assignedDesignId ? designGallery.find(d => d.id === assignedDesignId) : null;
    
    if (assignedDesign) {
      areaCard.classList.add('has-design');
    }
    
    // Get dimensions from the first placeholder
    const width = area.placeholders && area.placeholders[0] ? area.placeholders[0].width : '?';
    const height = area.placeholders && area.placeholders[0] ? area.placeholders[0].height : '?';
    
    areaCard.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">${area.title}</h6>
        <span class="badge bg-secondary">${width}×${height}</span>
      </div>
      <div class="card-body p-2">
        <div class="print-area-placeholder" data-area-id="${area.id}">
          ${assignedDesign ? `<img src="${assignedDesign.url}" class="img-fluid assigned-design" alt="Assigned Design">` : ''}
          <div class="print-area-overlay">
            <div class="print-area-message">
              ${assignedDesign ? '<i class="bi bi-check-circle-fill text-success"></i> Design Assigned' : '<i class="bi bi-arrow-down-circle"></i> Drop Design Here'}
            </div>
          </div>
        </div>
        <div class="mt-2 text-center">
          <button class="btn btn-sm btn-primary generate-for-area-btn" data-area-id="${area.id}" data-area-title="${area.title}" data-width="${width}" data-height="${height}">
            <i class="bi bi-magic"></i> Generate Design
          </button>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-between align-items-center">
        <span class="badge ${assignedDesign ? 'bg-success' : 'bg-secondary'}">
          ${assignedDesign ? 'Design assigned' : 'No design'}
        </span>
        <button class="btn btn-sm btn-outline-danger remove-design-btn" ${!assignedDesign ? 'disabled' : ''} data-area-id="${area.id}">
          <i class="bi bi-trash"></i> Remove
        </button>
      </div>
    `;
    
    col.appendChild(areaCard);
    row.appendChild(col);
    
    // Add event listeners for drag and drop
    setupPrintAreaDragDrop(areaCard, area);
    
    // Add event listener for remove design button
    const removeBtn = areaCard.querySelector('.remove-design-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removeDesignFromPrintArea(area.id);
      });
    }
    
    // Add event listener for generate design button
    const generateBtn = areaCard.querySelector('.generate-for-area-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        showDesignGenerationPrompt(
          area.id,
          generateBtn.dataset.areaTitle,
          parseInt(generateBtn.dataset.width) || 800,
          parseInt(generateBtn.dataset.height) || 800
        );
      });
    }
  });
  
  // Update the product preview
  updateProductPreview();
}

/**
 * Set up drag and drop functionality for a print area
 * @param {HTMLElement} areaCard - The print area card element
 * @param {Object} area - The print area data
 */
function setupPrintAreaDragDrop(areaCard, area) {
  // Handle dragover event
  areaCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    areaCard.classList.add('drag-over');
  });
  
  // Handle dragleave event
  areaCard.addEventListener('dragleave', () => {
    areaCard.classList.remove('drag-over');
  });
  
  // Handle drop event
  areaCard.addEventListener('drop', (e) => {
    e.preventDefault();
    areaCard.classList.remove('drag-over');
    
    try {
      // Try to get data from application/json format first
      let jsonData = e.dataTransfer.getData('application/json');
      
      // If that fails, try text/plain as fallback
      if (!jsonData) {
        jsonData = e.dataTransfer.getData('text/plain');
      }
      
      // Log the raw data for debugging
      console.log('Drop data received:', jsonData);
      
      // Only try to parse if we have data
      if (!jsonData) {
        console.error('No data received in drop event');
        return;
      }
      
      const data = JSON.parse(jsonData);
      console.log('Parsed drop data:', data);
      
      if (data.type === 'design') {
        const designId = data.id;
        
        // Find the design by id or name (for backward compatibility)
        let design = designGallery.find(d => d.id === designId);
        
        // If not found by id, try by name
        if (!design) {
          design = designGallery.find(d => d.name === designId);
        }
        
        console.log('Found design for drop:', design);
        
        if (design) {
          // Check compatibility between design and print area
          const compatibility = checkDesignPrintAreaCompatibility(design, area);
          console.log('Design compatibility:', compatibility);
          
          // Assign the design to this print area
          assignDesignToPrintArea(designId, area.id);
          
          // Add visual feedback for the drop
          areaCard.classList.add('drop-success');
          setTimeout(() => {
            areaCard.classList.remove('drop-success');
          }, 500);
          
          // Show compatibility warning if needed
          if (compatibility !== 'good') {
            showCompatibilityWarning(design, area, compatibility);
          }
        } else {
          console.error('Design not found in gallery:', designId);
        }
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  });
}

/**
 * Check compatibility between a design and print area
 * @param {Object} design - The design data
 * @param {Object} printArea - The print area data
 * @returns {string} - Compatibility level: 'good', 'warning', or 'bad'
 */
function checkDesignPrintAreaCompatibility(design, printArea) {
  console.log('Checking compatibility between design and print area:', design, printArea);
  
  // Get print area dimensions using multiple methods for reliability
  let areaWidth = 0;
  let areaHeight = 0;
  
  // Method 1: Check placeholders directly
  if (printArea.placeholders && printArea.placeholders[0]) {
    areaWidth = printArea.placeholders[0].width;
    areaHeight = printArea.placeholders[0].height;
  }
  
  // Method 2: Check if width/height are directly on the print area
  if ((!areaWidth || !areaHeight) && printArea.width && printArea.height) {
    areaWidth = printArea.width;
    areaHeight = printArea.height;
  }
  
  // Method 3: Use our utility function if available
  if ((!areaWidth || !areaHeight) && window.getPrintAreaDimensions && printArea.id) {
    const dimensions = window.getPrintAreaDimensions(printArea.id);
    if (dimensions.width && dimensions.height) {
      areaWidth = dimensions.width;
      areaHeight = dimensions.height;
      console.log(`Retrieved print area dimensions from API: ${areaWidth}x${areaHeight}`);
    }
  }
  
  // Get design dimensions using multiple methods for reliability
  let designWidth = design.width;
  let designHeight = design.height;
  
  // Check if dimensions are in printAreaContext
  if ((!designWidth || !designHeight) && design.printAreaContext) {
    designWidth = design.printAreaContext.width;
    designHeight = design.printAreaContext.height;
  }
  
  // Default fallback dimensions if all else fails
  designWidth = designWidth || 800;
  designHeight = designHeight || 800;
  
  console.log(`Design dimensions for compatibility check: ${designWidth}x${designHeight}`);
  console.log(`Print area dimensions for compatibility check: ${areaWidth}x${areaHeight}`);
  
  // Calculate aspect ratios
  const areaRatio = areaWidth / areaHeight;
  const designRatio = designWidth / designHeight;
  
  // Calculate ratio difference (as percentage)
  const ratioDifference = Math.abs((areaRatio - designRatio) / areaRatio) * 100;
  
  // Check resolution
  const areaPixels = areaWidth * areaHeight;
  const designPixels = designWidth * designHeight;
  const resolutionRatio = designPixels / areaPixels;
  
  // Store compatibility info
  const compatibilityKey = `${design.id}-${printArea.id}`;
  
  // Determine compatibility level
  let compatibility = 'good';
  let reason = '';
  
  if (ratioDifference > 20) {
    compatibility = 'bad';
    reason = 'Aspect ratio mismatch';
  } else if (ratioDifference > 10) {
    compatibility = 'warning';
    reason = 'Aspect ratio difference';
  }
  
  if (resolutionRatio < 0.8) {
    compatibility = 'bad';
    reason = reason || 'Design resolution too low';
  } else if (resolutionRatio < 1) {
    if (compatibility !== 'bad') {
      compatibility = 'warning';
      reason = reason || 'Design resolution slightly low';
    }
  }
  
  // Store compatibility info
  designCompatibility[compatibilityKey] = {
    level: compatibility,
    reason: reason,
    details: {
      areaWidth,
      areaHeight,
      designWidth,
      designHeight,
      ratioDifference,
      resolutionRatio
    }
  };
  
  return compatibility;
}

/**
 * Show compatibility warning for design and print area
 * @param {Object} design - The design data
 * @param {Object} printArea - The print area data
 * @param {string} level - Compatibility level
 */
function showCompatibilityWarning(design, printArea, level) {
  const compatibilityKey = `${design.id}-${printArea.id}`;
  const compatInfo = designCompatibility[compatibilityKey] || {};
  
  // Create toast notification
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${level === 'bad' ? 'bg-danger' : 'bg-warning'} text-white`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${level === 'bad' ? 'Design Issue' : 'Design Warning'}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      <p>${compatInfo.reason || 'This design may not be optimal for this print area.'}</p>
      <div class="mt-2 pt-2 border-top">
        <button type="button" class="btn btn-sm btn-light keep-btn">Keep Anyway</button>
        <button type="button" class="btn btn-sm btn-outline-light remove-btn">Remove</button>
      </div>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Initialize Bootstrap toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: false
  });
  
  // Add event listeners to buttons
  const keepBtn = toast.querySelector('.keep-btn');
  const removeBtn = toast.querySelector('.remove-btn');
  
  if (keepBtn) {
    keepBtn.addEventListener('click', () => {
      bsToast.hide();
    });
  }
  
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      removeDesignFromPrintArea(printArea.id);
      bsToast.hide();
    });
  }
  
  // Show the toast
  bsToast.show();
}

/**
 * Create toast container if it doesn't exist
 * @returns {HTMLElement} - The toast container
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

/**
 * Assign a design to a print area
 * @param {string} designId - The ID of the design to assign
 * @param {string} printAreaId - The ID of the print area to assign to
 */
function assignDesignToPrintArea(designId, printAreaId) {
  console.log(`Assigning design ${designId} to print area ${printAreaId}`);
  
  // Store the assignment
  designAssignments[printAreaId] = designId;
  
  // Update the UI
  const printAreaElement = document.querySelector(`.print-area[data-print-area-id="${printAreaId}"]`);
  if (printAreaElement) {
    // Find the design in the gallery - try both id and name
    let design = designGallery.find(d => d.id === designId);
    
    // If not found by id, try by name
    if (!design) {
      design = designGallery.find(d => d.name === designId);
    }
    
    console.log('Found design for assignment:', design);
    
    if (design) {
      // Update the print area UI
      const previewImg = printAreaElement.querySelector('.print-area-preview');
      if (previewImg) {
        previewImg.src = design.url;
        previewImg.style.display = 'block';
      }
      
      // Update the status
      const statusBadge = printAreaElement.querySelector('.print-area-status');
      if (statusBadge) {
        statusBadge.textContent = 'Design Assigned';
        statusBadge.className = 'badge bg-success print-area-status';
      }
    }
  }
  
  // Update the product preview
  updateProductPreview();
  
  // Update the publish button state using both methods to ensure compatibility
  if (typeof updatePublishButtonState === 'function') {
    updatePublishButtonState();
  }
  
  if (typeof window.publishProductUpdateButtonState === 'function') {
    window.publishProductUpdateButtonState();
  }
  
  // Make assignments available globally
  window.designAssignments = designAssignments;
  
  // Dispatch an event to notify other components
  console.log('Dispatching designAssignmentChanged event');
  document.dispatchEvent(new CustomEvent('designAssignmentChanged', {
    detail: {
      designId,
      printAreaId,
      designAssignments
    }
  }));
}

/**
 * Remove a design from a print area
 * @param {string} printAreaId - The ID of the print area
 */
function removeDesignFromPrintArea(printAreaId) {
  console.log(`Removing design from print area ${printAreaId}`);
  
  // Save current state to history before making changes
  saveToHistory();
  
  // Remove the assignment
  delete designAssignments[printAreaId];
  
  // Update the UI
  updatePrintAreaUI(printAreaId);
  
  // Update the product preview
  updateProductPreview();
  
  // Update the publish button state
  updatePublishButtonState();
  
  // Expose the assignments globally
  window.designAssignments = designAssignments;
  
  // Trigger design assignment changed event
  document.dispatchEvent(new CustomEvent('designAssignmentChanged'));
}

/**
 * Update the UI for a print area
 * @param {string} printAreaId - The ID of the print area
 */
function updatePrintAreaUI(printAreaId) {
  const areaCard = document.querySelector(`.print-area-card[data-area-id="${printAreaId}"]`);
  if (!areaCard) return;
  
  const contentArea = areaCard.querySelector('.print-area-content');
  if (!contentArea) return;
  
  // Get the assigned design
  const designId = designAssignments[printAreaId];
  const design = designId ? designGallery.find(d => d.id === designId) : null;
  
  if (design) {
    // Update card to show assigned design
    areaCard.classList.add('has-design');
    contentArea.classList.remove('empty');
    contentArea.innerHTML = `<img src="${design.url}" alt="Assigned design" class="assigned-design">`;
  } else {
    // Update card to show empty state
    areaCard.classList.remove('has-design');
    contentArea.classList.add('empty');
    contentArea.innerHTML = `
      <div class="print-area-placeholder">
        <i class="bi bi-plus-circle fs-2"></i>
        <p class="mb-0">Drop design here</p>
      </div>
    `;
  }
}

/**
 * Update the product preview with assigned designs
 */
function updateProductPreview() {
  const previewContainer = document.getElementById('productPreviewContainer');
  const baseProductImage = document.getElementById('baseProductImage');
  const designOverlay = document.getElementById('designOverlay');
  const previewMessage = document.getElementById('previewMessage');
  
  if (!previewContainer || !designOverlay || !baseProductImage || !previewMessage) {
    console.log('Missing preview elements:', { previewContainer, baseProductImage, designOverlay, previewMessage });
    
    // Try to create the elements if they don't exist
    if (previewContainer && !baseProductImage) {
      console.log('Creating missing product preview elements');
      
      // Clear the container
      previewContainer.innerHTML = '';
      
      // Create the product preview structure
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'product-preview position-relative';
      
      // Create base product image
      const imgElement = document.createElement('img');
      imgElement.id = 'baseProductImage';
      imgElement.className = 'img-fluid mx-auto d-block';
      imgElement.style.maxHeight = '300px';
      imgElement.alt = 'Product Base';
      
      // Create design overlay
      const overlayElement = document.createElement('div');
      overlayElement.id = 'designOverlay';
      overlayElement.className = 'position-absolute';
      overlayElement.style.top = '0';
      overlayElement.style.left = '0';
      overlayElement.style.width = '100%';
      overlayElement.style.height = '100%';
      overlayElement.style.pointerEvents = 'none';
      
      // Create preview message
      const messageElement = document.createElement('p');
      messageElement.id = 'previewMessage';
      messageElement.className = 'text-center mt-2 text-muted';
      messageElement.textContent = 'Drag designs onto print areas to see a preview';
      
      // Append elements to the container
      previewWrapper.appendChild(imgElement);
      previewWrapper.appendChild(overlayElement);
      previewContainer.appendChild(previewWrapper);
      previewContainer.appendChild(messageElement);
      
      // Update our references
      baseProductImage = imgElement;
      designOverlay = overlayElement;
      previewMessage = messageElement;
    } else {
      return; // Can't proceed without the container
    }
  }
  
  // Clear existing overlays
  designOverlay.innerHTML = '';
  
  // Check if we have a product selected
  const productImageUrl = window.currentBlueprintData && window.currentBlueprintData.preview_image_url;
  if (productImageUrl) {
    baseProductImage.src = productImageUrl;
    baseProductImage.style.display = 'block'; // Ensure the base image is visible
  } else {
    console.log('No product image URL found');
    // Use a placeholder image if no product image is available
    baseProductImage.src = 'https://placehold.co/400x500/EFEFEF/999999?text=Product+Preview';
    baseProductImage.style.display = 'block';
  }
  
  // Check if we have any designs assigned
  const hasAssignedDesigns = Object.keys(designAssignments).length > 0;
  console.log('Design assignments:', designAssignments);
  
  if (hasAssignedDesigns) {
    // Update preview message
    previewMessage.textContent = 'Product preview with your designs';
    
    // Get print areas from the current blueprint
    const printAreas = (window.currentBlueprintData && window.currentBlueprintData.print_areas) || [];
    console.log('Print areas for preview:', printAreas);
    
    // Add each assigned design to the overlay
    Object.entries(designAssignments).forEach(([printAreaId, designId]) => {
      const design = designGallery.find(d => d.id === designId);
      const printArea = printAreas.find(p => p.id === printAreaId);
      
      console.log(`Processing design ${designId} for print area ${printAreaId}:`, { design, printArea });
      
      if (!design) {
        console.error(`Design ${designId} not found in gallery`);
        return;
      }
      
      // Always create a fallback overlay since we're having issues with the print area data
      const overlay = document.createElement('div');
      overlay.className = 'position-absolute';
      
      if (!printArea || !printArea.placeholders || !printArea.placeholders[0]) {
        console.log(`Using fallback overlay for print area ${printAreaId}`);
        
        // Fallback: Create a simple centered overlay
        overlay.style.width = '200px';
        overlay.style.height = '200px';
        overlay.style.left = '50%';
        overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
      } else {
        // Get placeholder position and dimensions
        const placeholder = printArea.placeholders[0];
        console.log('Using placeholder:', placeholder);
        
        // Create overlay element with proper scaling
        // The scaling factor is based on the product image size vs. the actual blueprint dimensions
        const productImageWidth = baseProductImage.naturalWidth || 500;
        const scaleFactor = productImageWidth / 1000; // Assuming blueprint dimensions are around 1000px
        
        // Calculate position and size based on placeholder and scaling
        const width = placeholder.width * scaleFactor;
        const height = placeholder.height * scaleFactor;
        const left = (placeholder.position.x * scaleFactor) + (productImageWidth / 2);
        const top = (placeholder.position.y * scaleFactor) + (baseProductImage.naturalHeight / 2);
        
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.style.transform = 'translate(-50%, -50%)';
      }
      
      overlay.style.overflow = 'hidden';
      overlay.style.border = '1px dashed rgba(0,0,0,0.2)'; // Subtle border to see the print area
      
      // Add design image
      const img = document.createElement('img');
      img.src = design.url;
      img.alt = `Design on ${printArea ? (printArea.title || printArea.id) : 'product'}`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      
      overlay.appendChild(img);
      designOverlay.appendChild(overlay);
    });
  } else {
    // Update preview message for empty state
    previewMessage.textContent = 'Drag designs onto print areas to see a preview';
  }
}

/**
 * Save current state to history
 */
function saveToHistory() {
  // Remove any future history if we're not at the latest point
  if (historyPosition < assignmentHistory.length - 1) {
    assignmentHistory = assignmentHistory.slice(0, historyPosition + 1);
  }
  
  // Save current state
  assignmentHistory.push(JSON.stringify(designAssignments));
  historyPosition = assignmentHistory.length - 1;
  
  // Update undo/redo buttons
  updateUndoRedoButtons();
}

/**
 * Set up event listeners for undo/redo buttons
 */
function setupUndoRedoListeners() {
  const undoBtn = document.getElementById('undoAssignment');
  const redoBtn = document.getElementById('redoAssignment');
  const clearBtn = document.getElementById('clearAllAssignments');
  
  if (undoBtn) {
    undoBtn.addEventListener('click', undoAssignment);
  }
  
  if (redoBtn) {
    redoBtn.addEventListener('click', redoAssignment);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllAssignments);
  }
  
  // Update button states
  updateUndoRedoButtons();
}

/**
 * Update the enabled state of undo/redo buttons
 */
function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoAssignment');
  const redoBtn = document.getElementById('redoAssignment');
  
  if (undoBtn) {
    undoBtn.disabled = historyPosition <= 0;
  }
  
  if (redoBtn) {
    redoBtn.disabled = historyPosition >= assignmentHistory.length - 1;
  }
}

/**
 * Undo the last assignment action
 */
function undoAssignment() {
  if (historyPosition <= 0) return;
  
  // Move back in history
  historyPosition--;
  
  // Restore state from history
  designAssignments = JSON.parse(assignmentHistory[historyPosition]);
  
  // Update UI
  initializePrintAreas();
  
  // Update button states
  updateUndoRedoButtons();
}

/**
 * Redo the last undone assignment action
 */
function redoAssignment() {
  if (historyPosition >= assignmentHistory.length - 1) return;
  
  // Move forward in history
  historyPosition++;
  
  // Restore state from history
  designAssignments = JSON.parse(assignmentHistory[historyPosition]);
  
  // Update UI
  initializePrintAreas();
  
  // Update button states
  updateUndoRedoButtons();
}

/**
 * Clear all design assignments
 */
function clearAllAssignments() {
  // Save current state to history before clearing
  saveToHistory();
  
  // Clear all assignments
  designAssignments = {};
  
  // Update UI
  initializePrintAreas();
  
  // Update the product preview
  updateProductPreview();
}

/**
 * Update the design count display
 */
function updateDesignCount() {
  const countElement = document.getElementById('designCount');
  if (!countElement) return;
  
  const count = designGallery.length;
  countElement.textContent = `${count} design${count !== 1 ? 's' : ''}`;
}

/**
 * Show a design generation prompt modal for a specific print area
 * @param {string} areaId - ID of the print area
 * @param {string} areaTitle - Title of the print area
 * @param {number} width - Width of the print area
 * @param {number} height - Height of the print area
 */
function showDesignGenerationPrompt(areaId, areaTitle, width, height) {
  console.log(`Showing design generation prompt for ${areaTitle} (${areaId}), size: ${width}x${height}`);
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('designGenerationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'designGenerationModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'designGenerationModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="designGenerationModalLabel">Generate Design</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="designGenerationForm">
              <div class="mb-3">
                <label for="designPrompt" class="form-label">Design Description</label>
                <textarea class="form-control" id="designPrompt" rows="3" 
                  placeholder="Describe the design you want to generate (e.g., 'A cute cartoon cat with sunglasses'). Be specific about colors, style, and content for best results."></textarea>
              </div>
              <div class="row mb-3">
                <div class="col">
                  <label class="form-label">Target Size</label>
                  <p class="form-text" id="targetSizeInfo"></p>
                </div>
              </div>
              <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="fitToPrintArea" checked>
                <label class="form-check-label" for="fitToPrintArea">
                  Automatically fit design to print area
                </label>
              </div>
              <div id="generationStatus"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="generateDesignBtn">
              <i class="bi bi-magic"></i> Generate Design
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  // Update modal content for this specific print area
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Generate Design for ${areaTitle}`;
  }
  
  const targetSizeInfo = modal.querySelector('#targetSizeInfo');
  if (targetSizeInfo) {
    targetSizeInfo.textContent = `${width}×${height} px`;
  }
  
  // Store print area info in the modal
  modal.dataset.areaId = areaId;
  modal.dataset.areaTitle = areaTitle;
  modal.dataset.width = width;
  modal.dataset.height = height;
  
  // Clear previous inputs
  const promptInput = modal.querySelector('#designPrompt');
  if (promptInput) {
    promptInput.value = '';
  }
  
  const generationStatus = modal.querySelector('#generationStatus');
  if (generationStatus) {
    generationStatus.innerHTML = '';
  }
  
  // Initialize the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Add event listener for generate button
  const generateBtn = modal.querySelector('#generateDesignBtn');
  if (generateBtn) {
    // Remove any existing event listeners
    const newGenerateBtn = generateBtn.cloneNode(true);
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    
    // Add new event listener
    newGenerateBtn.addEventListener('click', async () => {
      const prompt = modal.querySelector('#designPrompt').value.trim();
      if (!prompt) {
        alert('Please enter a design description');
        return;
      }
      
      // Disable the button and show loading state
      newGenerateBtn.disabled = true;
      newGenerateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Generating...';
      
      // Show status
      generationStatus.innerHTML = '<div class="alert alert-info">Generating design, please wait...</div>';
      
      try {
        // Generate designs specifically for this print area
        await generateDesignForPrintArea(prompt, areaId, width, height);
        
        // Close the modal after successful generation
        modalInstance.hide();
      } catch (error) {
        console.error('Error generating design:', error);
        generationStatus.innerHTML = `<div class="alert alert-danger">Error: ${error.message || 'Failed to generate design'}</div>`;
      } finally {
        // Reset button state
        newGenerateBtn.disabled = false;
        newGenerateBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Design';
      }
    });
  }
}

/**
 * Generate designs specifically for a print area
 * @param {string} prompt - The design description
 * @param {string} areaId - ID of the print area
 * @param {number} width - Width of the print area
 * @param {number} height - Height of the print area
 */
async function generateDesignForPrintArea(prompt, areaId, width, height) {
  console.log(`Generating design for print area ${areaId} with dimensions ${width}x${height}`);
  
  // Make API call to generate designs
  console.log(`Generating design with dimensions: ${width}x${height} for print area ${areaId}`);
  
  // Get accurate print area dimensions if available
  let designWidth = width;
  let designHeight = height;
  
  // If dimensions are missing or invalid, try to get them from the API utility
  if (!designWidth || !designHeight || designWidth === '?' || designHeight === '?') {
    // Use our new utility function to get accurate dimensions
    if (window.getPrintAreaDimensions) {
      const dimensions = window.getPrintAreaDimensions(areaId);
      if (dimensions.width && dimensions.height) {
        designWidth = dimensions.width;
        designHeight = dimensions.height;
        console.log(`Retrieved dimensions from API: ${designWidth}x${designHeight}`);
      }
    }
  }
  
  // If we still don't have valid dimensions, try additional sources
  if (!designWidth || !designHeight || designWidth === '?' || designHeight === '?') {
    console.log('Attempting to get dimensions from window.printAreas...');
    if (window.printAreas) {
      const printArea = window.printAreas.find(area => area.id === areaId);
      if (printArea && printArea.width && printArea.height) {
        designWidth = printArea.width;
        designHeight = printArea.height;
        console.log(`Retrieved dimensions from printAreas: ${designWidth}x${designHeight}`);
      }
    }
  }
  
  // If we still don't have valid dimensions, try selectedProduct
  if (!designWidth || !designHeight || designWidth === '?' || designHeight === '?') {
    console.log('Attempting to get dimensions from window.selectedProduct...');
    if (window.selectedProduct && window.selectedProduct.placeholders) {
      const placeholder = window.selectedProduct.placeholders.find(p => p.id === areaId || p.position === areaId);
      if (placeholder && placeholder.width && placeholder.height) {
        designWidth = placeholder.width;
        designHeight = placeholder.height;
        console.log(`Retrieved dimensions from selectedProduct: ${designWidth}x${designHeight}`);
      }
    }
  }
  
  // Parse dimensions to integers
  designWidth = designWidth ? parseInt(designWidth) : null;
  designHeight = designHeight ? parseInt(designHeight) : null;
  
  // Final check - if we still don't have valid dimensions, show an error
  if (!designWidth || !designHeight || designWidth === 0 || designHeight === 0) {
    console.error(`ERROR: Failed to retrieve valid print area dimensions for area ${areaId}`);
    throw new Error(`Unable to determine dimensions for print area ${areaId}. Please try again or select a different print area.`);
  }
  
  // Log the actual dimensions being used
  console.log(`Using dimensions for API call: ${designWidth}x${designHeight}`);
  
  const response = await fetch('/.netlify/functions/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      prompt, 
      numImages: 4,
      width: parseInt(designWidth), // Ensure width is an integer
      height: parseInt(designHeight), // Ensure height is an integer
      printAreaId: areaId,
      // Also include as a printAreaContext for backward compatibility
      printAreaContexts: [{
        id: areaId,
        width: parseInt(designWidth),
        height: parseInt(designHeight),
        position: 'front'
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate design: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Design generation response for print area:', data);
  
  if (data.success && data.images && data.images.length > 0) {
    // Store the generated designs with print area context
    const newDesigns = data.images.map((img, index) => ({
      id: img.name || `design-${Date.now()}-${index}`,
      url: img.url,
      originalUrl: img.url,
      width: designWidth,
      height: designHeight,
      printAreaContext: {
        id: areaId,
        width: designWidth,
        height: designHeight
      }
    }));
    
    // Add these designs to the gallery
    if (!Array.isArray(designGallery)) {
      designGallery = [];
    }
    
    // Add new designs to the gallery
    designGallery = [...designGallery, ...newDesigns];
    
    // Update the global design gallery
    window.designGallery = designGallery;
    
    // Populate the design gallery with the updated designs
    populateDesignGallery();
    
    // Show the design gallery section
    const designGallerySection = document.getElementById('designGallerySection');
    if (designGallerySection) {
      designGallerySection.style.display = 'block';
    }
    
    // Return the generated designs
    return newDesigns;
  } else {
    throw new Error('No designs were generated');
  }
}

/**
 * Update the publish button state based on design assignments
 */
function updatePublishButtonState() {
  const publishBtn = document.getElementById('publishProductBtn');
  const publishInfo = document.getElementById('publishInfo');
  
  if (!publishBtn || !publishInfo) return;
  
  // Get print areas and assignments
  const printAreas = window.printAreas || [];
  
  if (!printAreas || printAreas.length === 0) {
    publishBtn.disabled = true;
    publishInfo.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Select a product to see available print areas';
    return;
  }
  
  // Check if all print areas have designs assigned
  const unassignedAreas = printAreas.filter(area => !designAssignments[area.id]);
  
  if (unassignedAreas.length > 0) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Assign All Designs First';
    
    const areaNames = unassignedAreas.map(area => area.title || area.id).join(', ');
    publishInfo.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>Assign designs to: ${areaNames}`;
    publishInfo.className = 'alert alert-warning small';
  } else {
    publishBtn.disabled = false;
    publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Publish Product';
    publishInfo.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>All print areas have designs assigned. Ready to publish!';
    publishInfo.className = 'alert alert-success small';
  }
}

// Expose necessary functions globally with different names to avoid conflicts
window.dragDropDisplayGeneratedDesigns = displayGeneratedDesigns;
window.dragDropAssignDesignToPrintArea = assignDesignToPrintArea;
window.dragDropRemoveDesignFromPrintArea = removeDesignFromPrintArea;
window.dragDropInitializePrintAreas = initializePrintAreas;
window.dragDropShowDesignGenerationPrompt = showDesignGenerationPrompt;
window.dragDropUpdatePublishButtonState = updatePublishButtonState;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing drag-and-drop design interface');
  createDesignWorkspace();
  initializePrintAreas();
  updatePublishButtonState();
  
  // Add a button to manually initialize the interface in a reliable location
  const designGenSection = document.getElementById('designGenSection');
  const designGalleryContainer = document.getElementById('designGalleryContainer');
  const targetElement = designGalleryContainer || designGenSection || document.querySelector('.container');
  
  if (targetElement) {
    // Check if button already exists
    if (!document.getElementById('initDesignInterfaceBtn')) {
      const initButtonContainer = document.createElement('div');
      initButtonContainer.className = 'alert alert-warning mt-3';
      initButtonContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong><i class="bi bi-exclamation-triangle-fill"></i> Don't see the design interface?</strong>
            <p class="mb-0">Click the button to initialize it.</p>
          </div>
          <button id="initDesignInterfaceBtn" class="btn btn-primary">
            <i class="bi bi-arrow-repeat"></i> Initialize Design Interface
          </button>
        </div>
      `;
      
      targetElement.prepend(initButtonContainer);
      
      // Add event listener to the button
      document.getElementById('initDesignInterfaceBtn').addEventListener('click', () => {
        createDesignWorkspace();
        initializePrintAreas();
        alert('Design interface has been initialized!');
        initButtonContainer.remove(); // Remove the alert after initialization
      });
    }
  }
  
  // Also initialize when designs are generated
  const generateDesignsBtn = document.getElementById('generateDesignsBtn');
  if (generateDesignsBtn) {
    generateDesignsBtn.addEventListener('click', () => {
      // Wait a bit for designs to be generated
      setTimeout(() => {
        createDesignWorkspace();
        initializePrintAreas();
      }, 2000);
    });
  }
});
