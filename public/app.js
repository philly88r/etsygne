// Global variables
let printifyApiKey = null;
let selectedShopId = '';
let selectedDesignUrl = null;
let selectedDesignOriginalUrl = null;
let selectedDesignId = null;
let currentProduct = null;
let blueprintData = {};
let printAreas = [];
let currentDesignPrompt = '';
let currentPlaceholders = [];
let selectedPrintAreaWidth = 1000;
let selectedPrintAreaHeight = 1000;
let selectedPrintAreaPosition = 'front';
let generatedDesigns = [];
let selectedPrintAreaId = null;
let printifyImageWidth = 1000;
let printifyImageHeight = 1000;
let printifyImageSrc = '';
let selectedBlueprintId = null;

// Initialize global design assignments map
window.selectedDesigns = JSON.parse(sessionStorage.getItem('selectedDesigns')) || {};
let selectedPrintProviderId = null;
let selectedBlueprintImageUrl = null;
let assignedDesigns = {};
let selectedVariants = [];
let productVariants = [];

// API base URL for Netlify functions
const API_BASE = '/.netlify/functions';

// Show print areas directly on the page without using a modal
function showDirectPrintAreaSelection(designId) {
  console.log(`showDirectPrintAreaSelection called for design ID: ${designId}`);
  
  // Create a container for direct print area selection if it doesn't exist
  let directSelectionContainer = document.getElementById('directPrintAreaSelection');
  if (!directSelectionContainer) {
    directSelectionContainer = document.createElement('div');
    directSelectionContainer.id = 'directPrintAreaSelection';
    directSelectionContainer.className = 'mt-4 p-3 border rounded bg-light';
    
    const container = document.getElementById('generatedDesignsContainer');
    if (container) {
      container.appendChild(directSelectionContainer);
    } else {
      document.body.appendChild(directSelectionContainer);
    }
  }
  
  // Clear and show the container
  directSelectionContainer.style.display = 'block';
  directSelectionContainer.innerHTML = `
    <h4 class="text-center mb-3">Select a print area for design #${designId}</h4>
    <div id="directPrintAreasList" class="list-group mt-3"></div>
  `;
  
  const printAreasList = document.getElementById('directPrintAreasList');
  
  // Get the print areas from the blueprint data
  const printAreas = window.currentBlueprintData?.print_areas || [];
  console.log('Print areas available:', printAreas);
  
  if (printAreas.length === 0) {
    printAreasList.innerHTML = '<div class="alert alert-warning">No print areas available for this product.</div>';
  } else {
    // Create a button for each print area
    printAreas.forEach(area => {
      const areaBtn = document.createElement('button');
      areaBtn.type = 'button';
      areaBtn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      areaBtn.innerHTML = `
        <div>
          <h6>${area.title || 'Print Area'}</h6>
          <small class="text-muted">${area.id}</small>
        </div>
        <span class="badge bg-primary rounded-pill">${area.height}×${area.width}</span>
      `;
      
      areaBtn.addEventListener('click', function() {
        console.log(`Print area selected: ${area.id} for design: ${designId}`);
        window.assignDesignToPrintArea(designId, area.id);
        directSelectionContainer.style.display = 'none'; // Hide after selection
      });
      
      printAreasList.appendChild(areaBtn);
    });
    
    // Add a cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary mt-3';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function() {
      directSelectionContainer.style.display = 'none';
    });
    
    directSelectionContainer.appendChild(cancelBtn);
  }
  
  // Scroll to the selection container
  directSelectionContainer.scrollIntoView({ behavior: 'smooth' });
}

// This function is no longer needed with the drag-and-drop approach
// Keeping it as a stub for backward compatibility
function openPrintAreaSelectionModal(designId) {
  console.log(`openPrintAreaSelectionModal is deprecated. Using drag-and-drop instead.`);
  // No action needed - the new drag-and-drop interface handles design assignment
}

// Handle print area selection from the modal
function handleModalPrintAreaSelection(designId, printAreaId) {
  console.log(`Selected print area ${printAreaId} for design ${designId} from modal`);
  window.assignDesignToPrintArea(designId, printAreaId);
}

// Global function to assign a design to a print area
// This function is exposed globally so it can be called from event handlers
window.assignDesignToPrintArea = function(designId, printAreaId) {
  console.log(`Assigning design ${designId} to print area ${printAreaId}`);
  
  if (!designId || !printAreaId) {
    console.error('Missing design ID or print area ID');
    return;
  }
  
  // Use our drag-and-drop implementation if available
  if (typeof window.dragDropAssignDesignToPrintArea === 'function') {
    console.log('Using drag-drop implementation for design assignment');
    window.dragDropAssignDesignToPrintArea(designId, printAreaId);
    return;
  }
  
  // Find the design in the generated designs array
  const design = window.generatedDesigns.find(d => d.id === designId);
  if (!design) {
    console.error(`Design with ID ${designId} not found`);
    return;
  }
  
  // Store the assignment
  if (!window.selectedDesigns) window.selectedDesigns = {};
  window.selectedDesigns[printAreaId] = designId;
  
  console.log(`Design ${designId} assigned to print area ${printAreaId}`);
  console.log('Current design assignments:', window.selectedDesigns);
  
  // Update UI
  updatePrintAreaVisuals();
  
  // Update product preview if that function exists
  if (typeof updateProductPreview === 'function') {
    updateProductPreview();
  }
  
  // Update create product button if that function exists
  if (typeof updateCreateProductButton === 'function') {
    updateCreateProductButton();
  }
  
  // Save to session storage
  saveStateToStorage();
};

// State persistence helper functions
function saveStateToStorage() {
  if (typeof sessionStorage === 'undefined') return;
  
  const appState = {
    printifyApiKey,
    selectedShopId,
    selectedDesignUrl,
    selectedDesignOriginalUrl,
    selectedDesignId,
    currentDesignPrompt,
    selectedPrintAreaWidth,
    selectedPrintAreaHeight,
    selectedPrintAreaPosition,
    selectedPrintAreaId,
    selectedBlueprintId,
    selectedPrintProviderId,
    selectedBlueprintImageUrl,
    assignedDesigns,
    generatedDesigns
  };
  
  console.log('Saving application state to sessionStorage');
  sessionStorage.setItem('printifyAppState', JSON.stringify(appState));
}

function loadStateFromStorage() {
  if (typeof sessionStorage === 'undefined') return false;
  
  const savedState = sessionStorage.getItem('printifyAppState');
  if (!savedState) return false;
  
  try {
    const appState = JSON.parse(savedState);
    console.log('Loaded application state from sessionStorage');
    
    // Restore all state variables
    printifyApiKey = appState.printifyApiKey || null;
    selectedShopId = appState.selectedShopId || '';
    selectedDesignUrl = appState.selectedDesignUrl || null;
    selectedDesignOriginalUrl = appState.selectedDesignOriginalUrl || null;
    selectedDesignId = appState.selectedDesignId || null;
    currentDesignPrompt = appState.currentDesignPrompt || '';
  } catch (error) {
    console.error('Error loading state from sessionStorage:', error);
    return false;
  }
}

// Function to display print areas in the UI
function displayPrintAreasInUI(areas) {
  console.log('Displaying print areas in UI:', areas);
  const printAreasRow = document.getElementById('printAreasRow');
  if (!printAreasRow) {
    console.error('Print area row container not found');
    return;
  }
  printAreasRow.innerHTML = '';
  window.printAreas = areas;
  if (!areas || areas.length === 0) {
    printAreasRow.innerHTML = '<div class="col"><p class="text-muted">No print areas found for this blueprint.</p></div>';
    return;
  }
  areas.forEach((area, index) => {
    const position = area.position || 'N/A';
    const width = area.placeholders[0]?.width || 1000;
    const height = area.placeholders[0]?.height || 1000;
    const printAreaCol = document.createElement('div');
    printAreaCol.className = 'col-md-4 mb-4';
    const printAreaCard = document.createElement('div');
    printAreaCard.className = 'card print-area-card h-100 text-center';
    printAreaCard.dataset.printAreaId = area.id;
    printAreaCard.dataset.position = position;
    printAreaCard.dataset.width = width;
    printAreaCard.dataset.height = height;
    printAreaCard.innerHTML = `
      <div class="card-body d-flex flex-column justify-content-center">
        <h5 class="card-title">${area.title || `Print Area ${index + 1}`}</h5>
        <p class="card-text text-muted">${position}</p>
        <div class="assigned-design-preview"></div>
        <span class="design-badge"></span>
      </div>
    `;
    printAreaCol.appendChild(printAreaCard);
    printAreasRow.appendChild(printAreaCol);
  });
  updatePrintAreaVisuals();
}

// Update print area cards to show assigned designs
function updatePrintAreaVisuals() {
  console.log('Updating print area visuals with assignments:', window.selectedDesigns);
  if (!window.selectedDesigns) {
    console.log('No design assignments to display');
    return;
  }
  const printAreaCards = document.querySelectorAll('.print-area-card');
  if (!printAreaCards || printAreaCards.length === 0) {
    console.log('No print area cards found in the DOM');
    return;
  }
  console.log(`Updating ${printAreaCards.length} print area cards`);
  printAreaCards.forEach(card => {
    const printAreaId = card.dataset.printAreaId;
    const badge = card.querySelector('.design-badge');
    const previewContainer = card.querySelector('.assigned-design-preview');
    if (!printAreaId) {
      console.warn('Print area card missing printAreaId data attribute');
      return;
    }
    const assignedDesignId = window.selectedDesigns[printAreaId];
    if (assignedDesignId) {
      const assignedDesign = window.generatedDesigns?.find(d => d.id === assignedDesignId);
      if (assignedDesign) {
        if (badge) {
          badge.className = 'badge bg-success design-badge';
          badge.innerHTML = '<i class="bi bi-check-circle me-1"></i>Design Assigned';
        }
        if (previewContainer) {
            previewContainer.style.backgroundImage = `url(${assignedDesign.url})`;
            previewContainer.style.backgroundSize = 'contain';
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
            previewContainer.style.opacity = '1';
        }
      } else {
        console.warn(`Assigned design ${assignedDesignId} not found in generatedDesigns`);
      }
    } else {
      if (badge) {
        badge.className = 'badge bg-secondary design-badge';
        badge.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>No Design';
      }
      if (previewContainer) {
        previewContainer.style.backgroundImage = 'none';
      }
    }
  });
  sessionStorage.setItem('selectedDesigns', JSON.stringify(window.selectedDesigns));
}

// Handle print area selection
function handlePrintAreaSelection(areaId, position, width, height) {
  console.log(`Print area selected: ${areaId}, position: ${position}, dimensions: ${width}x${height}`);
  window.selectedPrintAreaId = areaId;
  window.selectedPrintAreaPosition = position;
  window.selectedPrintAreaWidth = width || 3000;
  window.selectedPrintAreaHeight = height || 3000;
  const allPrintAreaCards = document.querySelectorAll('.print-area-card');
  allPrintAreaCards.forEach(card => {
    if (card.dataset.printAreaId === areaId) {
      card.classList.add('selected-print-area');
    } else {
      card.classList.remove('selected-print-area');
    }
  });
  const designGenSection = document.getElementById('designGenSection');
  if (designGenSection) {
    designGenSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Show design generation section for all print areas
function showDesignGenerationSection() {
  const existingDesignGenSection = document.getElementById('designGenSection');
  if (existingDesignGenSection) {
    // If it already exists, just return
    return;
  }
  
  const designGenContainer = document.createElement('div');
  designGenContainer.id = 'designGenSection';
  designGenContainer.className = 'mt-4 p-4 border rounded bg-light';
  
  // Create print area options for the dropdown
  let printAreaOptions = '<option value="">Select a print area...</option>';
  if (printAreas && printAreas.length > 0) {
    printAreas.forEach(area => {
      if (area && area.id) {
        printAreaOptions += `<option value="${area.id}" 
          data-width="${area.width || 1000}" 
          data-height="${area.height || 1000}" 
          data-position="${area.position || 'front'}">
          ${area.title || 'Print Area'} (${area.width || 1000}×${area.height || 1000})
        </option>`;
      }
    });
  }
  
  designGenContainer.innerHTML = `
    <h4 class="mb-3">Generate Designs for Print Area</h4>
    <p class="text-muted">Select a print area and create designs specifically for it.</p>
    
    <div class="mb-3">
      <label for="printAreaSelector" class="form-label">Select Print Area</label>
      <select id="printAreaSelector" class="form-select mb-3">
        ${printAreaOptions}
      </select>
      <div id="selectedPrintAreaInfo" class="mb-3 p-2 border rounded bg-light d-none">
        <p class="mb-1"><strong>Selected Print Area:</strong> <span id="selectedPrintAreaName">None</span></p>
        <p class="mb-0"><strong>Dimensions:</strong> <span id="selectedPrintAreaDimensions">0×0</span> px</p>
      </div>
    </div>
    
    <div class="mb-3">
      <label for="designPrompt" class="form-label">Design Description</label>
      <textarea id="designPrompt" class="form-control" rows="4" placeholder="Describe the design you want to generate...">${currentDesignPrompt}</textarea>
    </div>
    
    <button id="generateDesignsBtn" type="button" class="btn btn-primary btn-lg w-100" disabled>
      <i class="bi bi-magic"></i> Generate Designs for Selected Print Area
    </button>
    
    <div id="generationStatus" class="mt-3"></div>
    <div id="designGalleryContainer" class="mt-4"></div>
  `;
  
  const printAreasList = document.getElementById('printAreasList');
  if (printAreasList) {
    printAreasList.after(designGenContainer);
  }
  
  const promptTextarea = document.getElementById('designPrompt');
  if (promptTextarea) {
    promptTextarea.addEventListener('input', function(e) {
      currentDesignPrompt = e.target.value;
    });
  }
  
  // Add event listener for print area dropdown
  const printAreaSelector = document.getElementById('printAreaSelector');
  if (printAreaSelector) {
    printAreaSelector.addEventListener('change', function(e) {
      const selectedOption = this.options[this.selectedIndex];
      const printAreaId = this.value;
      const generateBtn = document.getElementById('generateDesignsBtn');
      const selectedPrintAreaInfo = document.getElementById('selectedPrintAreaInfo');
      const selectedPrintAreaName = document.getElementById('selectedPrintAreaName');
      const selectedPrintAreaDimensions = document.getElementById('selectedPrintAreaDimensions');
      
      if (printAreaId) {
        // Update global variables
        selectedPrintAreaId = printAreaId;
        selectedPrintAreaWidth = selectedOption.dataset.width || 1000;
        selectedPrintAreaHeight = selectedOption.dataset.height || 1000;
        selectedPrintAreaPosition = selectedOption.dataset.position || 'front';
        
        // Update UI
        if (generateBtn) generateBtn.disabled = false;
        if (selectedPrintAreaInfo) selectedPrintAreaInfo.classList.remove('d-none');
        if (selectedPrintAreaName) selectedPrintAreaName.textContent = selectedOption.textContent.trim();
        if (selectedPrintAreaDimensions) selectedPrintAreaDimensions.textContent = `${selectedPrintAreaWidth}×${selectedPrintAreaHeight}`;
        
        console.log('Selected print area:', { 
          id: selectedPrintAreaId, 
          width: selectedPrintAreaWidth, 
          height: selectedPrintAreaHeight, 
          position: selectedPrintAreaPosition 
        });
      } else {
        // Reset if no print area is selected
        if (generateBtn) generateBtn.disabled = true;
        if (selectedPrintAreaInfo) selectedPrintAreaInfo.classList.add('d-none');
        selectedPrintAreaId = null;
      }
    });
  }
  
  const generateBtn = document.getElementById('generateDesignsBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', function(event) {
      // Validate that we have both a prompt and a selected print area
      if (!currentDesignPrompt || !currentDesignPrompt.trim()) {
        alert('Please enter a design prompt.');
        return;
      }
      
      if (!selectedPrintAreaId) {
        alert('Please select a print area first.');
        return;
      }
      
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Generating...';
      
      // Pass the selected print area information to the generateDesigns function
      generateDesigns(
        currentDesignPrompt.trim(), 
        selectedPrintAreaId, 
        selectedPrintAreaWidth, 
        selectedPrintAreaHeight, 
        selectedPrintAreaPosition
      ).finally(() => {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Designs for Selected Print Area';
      });
    });
  }
  
  // Add the design generation section to the page
  const printAreasListElement = document.getElementById('printAreasList');
  if (printAreasListElement) {
    printAreasListElement.after(designGenContainer);
  }
}

// Generate designs using the provided prompt and print area information
async function generateDesigns(prompt, printAreaId, width, height, position) {
  console.log(`Generating designs with prompt: ${prompt} for print area ${printAreaId} (${width}x${height})`);
  const generationStatus = document.getElementById('generationStatus');
  
  if (!generationStatus) {
    console.error('Generation status element not found');
    return;
  }
  
  // Log the print area information
  console.log('Print area information:', { printAreaId, width, height, position });
  
  try {
    generationStatus.innerHTML = '<div class="alert alert-info">Generating designs, please wait...</div>';
    
    // Create an array of print area contexts with accurate dimensions
    const printAreaContexts = [];
    
    // If we have specific print area information passed in, use that
    if (printAreaId && width && height) {
      printAreaContexts.push({
        printAreaId: printAreaId,
        position: position || 'front',
        width: parseInt(width),
        height: parseInt(height)
      });
      console.log('Using specific print area dimensions:', { printAreaId, width, height, position });
    }
    // Otherwise, check if we have print areas available
    else if (printAreas && printAreas.length > 0) {
      // Use all available print areas with their actual dimensions
      printAreas.forEach(area => {
        if (area && area.id) {
          printAreaContexts.push({
            printAreaId: area.id,
            position: area.position || 'front',
            width: area.width,
            height: area.height
          });
        }
      });
    }
    
    console.log('Using print area contexts:', printAreaContexts);
    
    // Make API call to generate designs
    const response = await fetch('/.netlify/functions/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        prompt, 
        numImages: 4,
        printAreaContexts: printAreaContexts.length > 0 ? printAreaContexts : undefined
      })
    });
    
    const data = await response.json();
    console.log('Design generation response:', data);
    
    if (data.success && data.images && data.images.length > 0) {
      // Store the generated designs with their correct dimensions from the response
      generatedDesigns = data.images.map((img, index) => {
        // Use the print area context from the response if available
        const printAreaContext = img.printAreaContext || {
          // If no context in response, use the context from our request based on index
          ...(printAreaContexts[index % printAreaContexts.length] || {}),
          position: 'any' // Fallback position
        };
        
        return {
          id: img.name || `design-${Date.now()}-${index}`,
          url: img.url,
          originalUrl: img.url,
          width: img.width || printAreaContext.width,
          height: img.height || printAreaContext.height,
          printAreaContext: printAreaContext
        };
      });
      
      // Expose designs globally for the design gallery
      window.designGallery = generatedDesigns;
      
      // Display the designs in the gallery using our direct assignment implementation
      displayDesignsWithDirectAssignment(generatedDesigns);
      
      // Also make designs available to the drag-drop implementation as a fallback
      if (typeof window.dragDropDisplayGeneratedDesigns === 'function') {
        console.log('Making designs available to drag-drop implementation');
        window.dragDropDisplayGeneratedDesigns(generatedDesigns, false); // Pass false to not display immediately
      }
      
      generationStatus.innerHTML = '<div class="alert alert-success">Designs generated successfully! Select a design to assign it to a print area.</div>';
      return generatedDesigns;
    } else {
      console.error('Failed to generate designs:', data.message || 'Unknown error');
      generationStatus.innerHTML = '<div class="alert alert-danger">Failed to generate designs. Please try again.</div>';
      return [];
    }
  } catch (error) {
    console.error('Error generating designs:', error);
    generationStatus.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    return [];
  }
}

// Function to display generated designs with direct assignment capability
function displayDesignsWithDirectAssignment(designs) {
  const designGalleryContainer = document.getElementById('designGalleryContainer');
  if (!designGalleryContainer) return;
  
  // Clear previous designs
  designGalleryContainer.innerHTML = '';
  
  // Create header for the gallery
  const galleryHeader = document.createElement('div');
  galleryHeader.className = 'mb-3';
  galleryHeader.innerHTML = `
    <h5>Generated Designs</h5>
    <p class="text-muted">Click on a design to assign it to the selected print area.</p>
  `;
  designGalleryContainer.appendChild(galleryHeader);
  
  // Create container for the designs
  const designsGrid = document.createElement('div');
  designsGrid.className = 'row g-3';
  designGalleryContainer.appendChild(designsGrid);
  
  // Add each design to the grid
  designs.forEach((design, index) => {
    const designCol = document.createElement('div');
    designCol.className = 'col-md-6 col-lg-3 mb-3';
    
    const designCard = document.createElement('div');
    designCard.className = 'card h-100 design-card';
    designCard.style.cursor = 'pointer';
    
    // Create the card content
    designCard.innerHTML = `
      <div class="position-relative">
        <img src="${design.url}" class="card-img-top" alt="Generated Design ${index + 1}" 
          style="width: 100%; height: auto;">
        <div class="position-absolute bottom-0 end-0 p-2 bg-dark bg-opacity-75 text-white small">
          ${design.width}×${design.height}
        </div>
      </div>
      <div class="card-body">
        <h6 class="card-title">Design ${index + 1}</h6>
        <button class="btn btn-sm btn-primary w-100 assign-design-btn">
          <i class="bi bi-check-circle"></i> Assign to Selected Area
        </button>
      </div>
    `;
    
    // Add click handler to assign the design to the selected print area
    designCard.addEventListener('click', function() {
      if (!selectedPrintAreaId) {
        alert('Please select a print area first.');
        return;
      }
      
      // Call the assignDesignToPrintArea function
      assignDesignToPrintArea(design, selectedPrintAreaId);
      
      // Highlight this card
      document.querySelectorAll('.design-card').forEach(card => {
        card.classList.remove('border-success');
      });
      designCard.classList.add('border-success');
    });
    
    designCol.appendChild(designCard);
    designsGrid.appendChild(designCol);
  });
}
  
// Function to assign a design to a specific print area
function assignDesignToPrintArea(design, printAreaId) {
  console.log(`Assigning design to print area ${printAreaId}:`, design);
  
  // Find the print area in the printAreas array
  const printArea = printAreas.find(area => area.id === printAreaId);
  if (!printArea) {
    console.error(`Print area with ID ${printAreaId} not found`);
    alert('Selected print area not found. Please try again.');
    return;
  }
  
  // Update the print area with the design
  printArea.design = {
    url: design.url,
    width: design.width,
    height: design.height,
    id: design.id || `design-${Date.now()}`
  };
  
  // Update the UI to reflect the assigned design
  const printAreaCard = document.querySelector(`.print-area-card[data-print-area-id="${printAreaId}"]`);
  if (printAreaCard) {
    // Find or create the design image container
    let designImg = printAreaCard.querySelector('.print-area-design-img');
    if (!designImg) {
      designImg = document.createElement('img');
      designImg.className = 'print-area-design-img position-absolute top-0 start-0 w-100 h-100 object-fit-contain p-2';
      printAreaCard.querySelector('.card-img-container').appendChild(designImg);
    }
    
    // Update the image source
    designImg.src = design.url;
    designImg.style.display = 'block';
    
    // Add a success message
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success mt-3';
    successAlert.innerHTML = `<i class="bi bi-check-circle"></i> Design assigned to ${printArea.title || 'Print Area'}`;
    
    // Show the success message and fade it out after a few seconds
    const designGalleryContainer = document.getElementById('designGalleryContainer');
    if (designGalleryContainer) {
      designGalleryContainer.prepend(successAlert);
      setTimeout(() => {
        successAlert.style.transition = 'opacity 1s';
        successAlert.style.opacity = '0';
        setTimeout(() => successAlert.remove(), 1000);
      }, 3000);
    }
    
    // Update the print preview if available
    if (typeof updatePrintPreview === 'function') {
      updatePrintPreview();
    }
  }
}

// Load variants for a selected blueprint and provider
async function loadVariants(blueprintId, providerId) {
  if (!printifyApiKey || !blueprintId || !providerId) return;
  
  const variantsList = document.getElementById('variantsList');
  if (!variantsList) return;
  
  variantsList.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> <span class="ms-2">Loading variants...</span></div>';
  
  try {
    console.log('Loading variants for blueprint ID:', blueprintId, 'and provider ID:', providerId);
    
    const response = await fetch(`${API_BASE}/api?endpoint=get-variants&blueprintId=${blueprintId}&providerId=${providerId}`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load variants: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Variants data:', data);
    
    if (data.success && Array.isArray(data.variants)) {
      if (data.variants.length === 0) {
        variantsList.innerHTML = '<p class="text-muted">No variants available for this product and provider</p>';
        return;
      }
      
      productVariants = data.variants;
      
      // Calculate prices with markup
      calculatePricesWithMarkup(productVariants);
      
      let variantsHtml = '<div class="alert alert-info">Showing variants with 40% markup applied to cost.</div><div class="list-group">';
      
      data.variants.forEach(variant => {
        const variantId = variant.id;
        const title = variant.title || 'Unnamed Variant';
        const options = variant.options || {};
        const optionsText = Object.entries(options).map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join(', ');
        
        const cost = variant.cost || 0;
        const calculatedPrice = variant.calculatedPrice || cost;
        
        variantsHtml += `
          <div class="list-group-item list-group-item-action variant-item" data-variant-id="${variantId}">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">${title}</h6>
              <div>
                <span class="badge bg-secondary me-1">Cost: ${(cost/100).toFixed(2)}</span>
                <span class="badge bg-success">Price: ${(calculatedPrice/100).toFixed(2)}</span>
              </div>
            </div>
            <p class="mb-1 small text-muted">${optionsText}</p>
            <div class="form-check mt-2">
              <input class="form-check-input variant-checkbox" type="checkbox" value="${variantId}" id="variant-${variantId}" checked>
              <label class="form-check-label" for="variant-${variantId}">
                Include this variant
              </label>
            </div>
          </div>
        `;
      });
      
      variantsHtml += '</div>';
      variantsList.innerHTML = variantsHtml;
      
      document.querySelectorAll('.variant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          updateSelectedVariants();
        });
      });
      
      updateSelectedVariants();
    } else {
      console.error('Failed to load variants:', data.message || 'Unknown error');
      variantsList.innerHTML = '<p class="text-danger">Error loading variants</p>';
    }
  } catch (error) {
    console.error('Error loading variants:', error);
    variantsList.innerHTML = '<p class="text-danger">Error loading variants</p>';
  }
}

// Calculate prices with a 40% markup on variant costs
function calculatePricesWithMarkup(variants) {
  if (!variants || !Array.isArray(variants)) return;
  
  const MARKUP_PERCENTAGE = 40; // 40% markup
  
  variants.forEach(variant => {
    if (variant.cost) {
      // Calculate price with 40% markup
      const markupMultiplier = 1 + (MARKUP_PERCENTAGE / 100);
      variant.calculatedPrice = Math.round(variant.cost * markupMultiplier);
      
      console.log(`Variant ${variant.id}: Cost ${(variant.cost/100).toFixed(2)} → Price ${(variant.calculatedPrice/100).toFixed(2)} (${MARKUP_PERCENTAGE}% markup)`);
    } else {
      console.warn(`Variant ${variant.id} has no cost information`);
      variant.calculatedPrice = variant.cost || 0;
    }
  });
}

// Update selected variants
function updateSelectedVariants() {
  selectedVariants = [];
  document.querySelectorAll('.variant-checkbox:checked').forEach(checkbox => {
    selectedVariants.push(parseInt(checkbox.value));
  });
  
  // Update price information display if available
  const priceInfoContainer = document.getElementById('variantPriceInfo');
  if (priceInfoContainer) {
    let totalCost = 0;
    let totalPrice = 0;
    let variantCount = 0;
    
    selectedVariants.forEach(variantId => {
      const variant = productVariants.find(v => v.id === variantId);
      if (variant) {
        totalCost += variant.cost || 0;
        totalPrice += variant.calculatedPrice || variant.cost || 0;
        variantCount++;
      }
    });
    
    if (variantCount > 0) {
      const profit = totalPrice - totalCost;
      const profitMargin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
      
      priceInfoContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table table-sm">
            <tr>
              <th>Total Cost:</th>
              <td>${(totalCost/100).toFixed(2)}</td>
            </tr>
            <tr>
              <th>Total Price (with 40% markup):</th>
              <td>${(totalPrice/100).toFixed(2)}</td>
            </tr>
            <tr>
              <th>Profit:</th>
              <td>${(profit/100).toFixed(2)} (${profitMargin.toFixed(1)}%)</td>
            </tr>
          </table>
        </div>
      `;
    } else {
      priceInfoContainer.innerHTML = '<p>No variants selected</p>';
    }
  }
  
  console.log('Selected variants:', selectedVariants);
  updateCreateProductButton();
}



function updateProductPreview() {
  const previewContainer = document.getElementById('productPreview');
  if (!previewContainer) return;
  
  // Convert selectedDesigns map to assignedDesigns format for compatibility
  const tempAssignedDesigns = {};
  if (window.selectedDesigns) {
    Object.entries(window.selectedDesigns).forEach(([printAreaId, designId]) => {
      // Find the design in the gallery
      const design = window.designGallery?.find(d => d.id === designId);
      if (!design) return;
      
      // Find the print area to get position
      const printArea = window.printAreas?.find(area => area.id === printAreaId);
      if (!printArea) return;
      
      const position = (printArea.position || printArea.title || 'unknown').toLowerCase();
      
      // Create an assigned design entry
      tempAssignedDesigns[printAreaId] = {
        printifyImageId: design.printifyImageId || `temp-${designId.substring(0, 8)}`,
        originalUrl: design.url,
        previewUrl: design.url,
        fileName: design.name || `design-${designId.substring(0, 8)}`,
        position: position,
        // Positioning data for Printify API (0.0 to 1.0 range)
        x: 0.5, // Center horizontally
        y: 0.5, // Center vertically  
        scale: 1.0, // Full scale
        angle: 0, // No rotation
        width: printArea.width || 3000,
        height: printArea.height || 3000
      };
    });
  }
  
  const hasAssignedDesigns = Object.keys(tempAssignedDesigns).length > 0;
  const hasSelectedVariants = selectedVariants.length > 0;
  
  // Only show preview if both designs are assigned AND variants are selected
  if (hasAssignedDesigns && hasSelectedVariants) {
    // Group designs by position
    const designsByPosition = {};
    Object.values(tempAssignedDesigns).forEach(design => {
      const position = design.position || 'front';
      if (!designsByPosition[position]) {
        designsByPosition[position] = [];
      }
      designsByPosition[position].push(design);
    });
    
    // Create tabs for each position
    const positions = Object.keys(designsByPosition);
    
    previewContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5><i class="bi bi-eye me-2"></i>Product Preview</h5>
          <span class="badge bg-success">Ready to Publish</span>
        </div>
        <div class="card-body">
          <!-- Position Tabs -->
          <ul class="nav nav-tabs mb-3" id="positionTabs" role="tablist">
            ${positions.map((position, index) => `
              <li class="nav-item" role="presentation">
                <button class="nav-link ${index === 0 ? 'active' : ''}" 
                        id="${position}-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#${position}-pane" 
                        type="button" 
                        role="tab" 
                        aria-controls="${position}-pane" 
                        aria-selected="${index === 0 ? 'true' : 'false'}">
                  ${position.charAt(0).toUpperCase() + position.slice(1)}
                </button>
              </li>
            `).join('')}
          </ul>
          
          <!-- Tab Content -->
          <div class="tab-content" id="positionTabsContent">
            ${positions.map((position, index) => `
              <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" 
                   id="${position}-pane" 
                   role="tabpanel" 
                   aria-labelledby="${position}-tab" 
                   tabindex="0">
                <div class="row">
                  <!-- Product Preview Image -->
                  <div class="col-md-8">
                    <div class="product-preview-image position-relative mb-4 text-center">
                      <img src="${selectedBlueprintImageUrl || 'https://placehold.co/400x500/EFEFEF/999999?text=Product+Preview'}" 
                           class="img-fluid border" alt="Product Preview - ${position}">
                      ${designsByPosition[position].map(design => `
                        <div class="design-overlay position-absolute" style="top: 30%; left: 30%; width: 40%; z-index: 10;">
                          <img src="${design.previewUrl || design.originalUrl}" class="img-fluid" alt="Design on ${design.position}">
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  
                  <!-- Design Details -->
                  <div class="col-md-4">
                    <div class="card h-100">
                      <div class="card-header bg-light">
                        <h6 class="mb-0">${position.charAt(0).toUpperCase() + position.slice(1)} Design Details</h6>
                      </div>
                      <div class="card-body">
                        ${designsByPosition[position].map(design => `
                          <div class="mb-3">
                            <img src="${design.previewUrl || design.originalUrl}" class="img-fluid border mb-2" style="max-height: 100px;" alt="Design">
                            <div class="small text-muted">Design ID: ${design.printifyImageId}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <!-- Variant Information -->
          <div class="mt-4">
            <h6 class="border-bottom pb-2">Selected Variants</h6>
            <div class="row">
              <div class="col-md-8">
                <div class="table-responsive">
                  <table class="table table-sm table-bordered">
                    <thead class="table-light">
                      <tr>
                        <th>Variant</th>
                        <th>Cost</th>
                        <th>Price (40% Markup)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${selectedVariants.map(variantId => {
                        const variant = productVariants.find(v => v.id === variantId);
                        if (!variant) return '';
                        const cost = variant.cost || 0;
                        const price = variant.calculatedPrice || cost;
                        return `
                          <tr>
                            <td>${variant.title || 'Unknown Variant'}</td>
                            <td>${(cost/100).toFixed(2)}</td>
                            <td>${(price/100).toFixed(2)}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="col-md-4">
                <div class="alert alert-success">
                  <strong>Ready to publish!</strong><br>
                  Your product has designs assigned and variants selected.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (hasAssignedDesigns) {
    // Show a message that variants need to be selected
    previewContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-warning text-dark">
          <h5><i class="bi bi-exclamation-triangle me-2"></i>Almost Ready</h5>
        </div>
        <div class="card-body">
          <p>You've assigned designs to print areas. Now select product variants to enable publishing.</p>
          <button class="btn btn-primary" onclick="document.getElementById('variantsSection').scrollIntoView({behavior: 'smooth'})">
            <i class="bi bi-arrow-down-circle me-2"></i>Go to Variants Section
          </button>
        </div>
      </div>
    `;
  } else {
    // Show a message that designs need to be assigned
    previewContainer.innerHTML = `
      <div class="card">
        <div class="card-header bg-secondary text-white">
          <h5><i class="bi bi-palette me-2"></i>Product Preview</h5>
        </div>
        <div class="card-body">
          <p>Assign designs to print areas to see your product preview here.</p>
          <div class="text-center mt-3">
            <img src="${selectedBlueprintImageUrl || 'https://placehold.co/400x300/EFEFEF/999999?text=No+Designs+Assigned'}" 
                 class="img-fluid border opacity-50" alt="Product Preview" style="max-height: 300px;">
            <p class="mt-3 text-muted">Generate designs and assign them to print areas using the design gallery below.</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Update create product button state
function updateCreateProductButton() {
  const createProductBtn = document.getElementById('createProductBtn');
  if (!createProductBtn) return;
  
  // Check if designs are assigned using the new selectedDesigns map
  const hasAssignedDesigns = window.selectedDesigns && Object.keys(window.selectedDesigns).length > 0;
  const hasSelectedVariants = selectedVariants.length > 0;
  const hasRequiredFields = selectedBlueprintId && selectedPrintProviderId;
  
  if (hasAssignedDesigns && hasSelectedVariants && hasRequiredFields) {
    createProductBtn.disabled = false;
    createProductBtn.classList.remove('btn-secondary');
    createProductBtn.classList.add('btn-success');
    createProductBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Publish Product';
  } else if (hasAssignedDesigns && hasRequiredFields) {
    createProductBtn.disabled = true;
    createProductBtn.classList.remove('btn-success');
    createProductBtn.classList.add('btn-secondary');
    createProductBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Select Variants to Publish';
  } else {
    createProductBtn.disabled = true;
    createProductBtn.classList.remove('btn-success');
    createProductBtn.classList.add('btn-secondary');
    createProductBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Assign Designs First';
  }
  
  // Add a tooltip to the button for better UX
  if (createProductBtn.getAttribute('data-bs-toggle') !== 'tooltip') {
    createProductBtn.setAttribute('data-bs-toggle', 'tooltip');
    createProductBtn.setAttribute('data-bs-placement', 'top');
    
    if (!hasAssignedDesigns) {
      createProductBtn.setAttribute('title', 'You need to assign designs to print areas first');
    } else if (!hasSelectedVariants) {
      createProductBtn.setAttribute('title', 'You need to select product variants');
    } else if (!hasRequiredFields) {
      createProductBtn.setAttribute('title', 'Missing required product information');
    } else {
      createProductBtn.setAttribute('title', 'Your product is ready to publish!');
    }
    
    // Initialize tooltip
    try {
      new bootstrap.Tooltip(createProductBtn);
    } catch (e) {
      console.log('Tooltip already initialized or Bootstrap not loaded');
    }
  }
}

// Upload a design to Printify and get back an image ID
async function uploadDesignToPrintify(imageUrl, fileName) {
  if (!printifyApiKey || !selectedShopId) {
    throw new Error('API key or shop ID not set');
  }
  
  console.log(`Uploading design to Printify: ${fileName}`);
  
  try {
    // First, we need to get the image as a blob
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Convert blob to base64
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); // Remove data URL prefix
      reader.readAsDataURL(imageBlob);
    });
    
    // Upload to Printify via our serverless function
    const uploadResponse = await fetch('/printify-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Printify-Api-Key': printifyApiKey
      },
      body: JSON.stringify({
        action: 'uploadImage',
        shopId: selectedShopId,
        fileName: fileName || 'design.png',
        imageData: base64
      })
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Printify upload failed: ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('Design uploaded successfully:', uploadResult);
    
    return uploadResult;
  } catch (error) {
    console.error('Error uploading design to Printify:', error);
    throw error;
  }
}

// FIXED: Handle product creation with correct print_areas structure
async function handleProductCreation(event) {
  if (event) event.preventDefault();
  
  if (!selectedShopId || !printifyApiKey) {
    alert('Please select a shop first');
    return;
  }
  
  const productTitle = document.getElementById('productTitle').value.trim();
  if (!productTitle) {
    alert('Product title is required');
    return;
  }
  
  const createBtn = document.getElementById('createProductBtn');
  const isUpdateMode = createBtn && createBtn.dataset.mode === 'update' && createBtn.dataset.productId;
  
  if (isUpdateMode) {
    await updateExistingProduct(createBtn.dataset.productId);
    return;
  }
  
  // Check if designs are assigned using the new selectedDesigns map
  if (!window.selectedDesigns || Object.keys(window.selectedDesigns).length === 0) {
    alert('Please assign at least one design to a print area');
    return;
  }
  
  if (selectedVariants.length === 0) {
    alert('Please select at least one variant');
    return;
  }
  
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Publishing...';
  }
  
  try {
    // Prepare variant data with calculated prices
    const selectedVariantData = selectedVariants.map(variantId => {
      const variant = productVariants.find(v => v.id === variantId);
      const price = variant ? (variant.calculatedPrice || variant.cost || 1999) : 1999;
      
      return {
        id: variantId,
        price: price,
        is_enabled: true
      };
    });
    
    if (selectedVariantData.length === 0) {
      alert('Please select at least one variant');
      return;
    }
    
    // CORRECTED: Build print_areas according to Printify API specification
    const variantIds = selectedVariantData.map(v => v.id);
    
    // Group designs by position and create placeholders
    const placeholdersByPosition = {};
    
    // Convert selectedDesigns map to assignedDesigns format for compatibility
    const tempAssignedDesigns = {};
    
    if (window.selectedDesigns) {
      Object.entries(window.selectedDesigns).forEach(([printAreaId, designId]) => {
        // Find the design in the gallery
        const design = window.designGallery?.find(d => d.id === designId);
        if (!design) {
          console.error(`Design with ID ${designId} not found in gallery`);
          return;
        }
        
        // Find the print area to get position
        const printArea = window.printAreas?.find(area => area.id === printAreaId);
        if (!printArea) {
          console.error(`Print area with ID ${printAreaId} not found`);
          return;
        }
        
        const position = (printArea.position || printArea.title || 'unknown').toLowerCase();
        
        // Create an assigned design entry
        tempAssignedDesigns[printAreaId] = {
          printifyImageId: design.printifyImageId || `temp-${designId.substring(0, 8)}`,
          originalUrl: design.url,
          previewUrl: design.url,
          fileName: design.name || `design-${designId.substring(0, 8)}`,
          position: position,
          // Positioning data for Printify API (0.0 to 1.0 range)
          x: 0.5, // Center horizontally
          y: 0.5, // Center vertically  
          scale: 1.0, // Full scale
          angle: 0, // No rotation
          width: printArea.width || 3000,
          height: printArea.height || 3000
        };
      });
    }
    
    // First, upload all designs to Printify to get valid image IDs
    const designsToUpload = [];
    
    Object.entries(window.selectedDesigns || {}).forEach(([printAreaId, designId]) => {
      const design = window.designGallery?.find(d => d.id === designId);
      if (!design) return;
      
      // Only add designs that don't already have a Printify image ID
      if (!design.printifyImageId) {
        designsToUpload.push({
          designId,
          printAreaId,
          url: design.url,
          name: design.name || `design-${designId.substring(0, 8)}`
        });
      }
    });
    
    // If we have designs that need to be uploaded, do that first
    if (designsToUpload.length > 0) {
      const statusDiv = document.createElement('div');
      statusDiv.className = 'alert alert-info';
      statusDiv.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Uploading ${designsToUpload.length} design(s) to Printify...`;
      document.getElementById('productPreview').prepend(statusDiv);
      
      try {
        // Upload each design to Printify
        const uploadPromises = designsToUpload.map(async (designInfo) => {
          const result = await uploadDesignToPrintify(designInfo.url, designInfo.name);
          if (result && result.id) {
            // Update the design in the gallery with the Printify image ID
            const designInGallery = window.designGallery?.find(d => d.id === designInfo.designId);
            if (designInGallery) {
              designInGallery.printifyImageId = result.id;
              console.log(`Updated design ${designInfo.designId} with Printify image ID ${result.id}`);
            }
            return {
              ...designInfo,
              printifyImageId: result.id
            };
          } else {
            throw new Error(`Failed to upload design ${designInfo.designId}`);
          }
        });
        
        await Promise.all(uploadPromises);
        statusDiv.className = 'alert alert-success';
        statusDiv.innerHTML = `<i class="bi bi-check-circle me-2"></i> Successfully uploaded all designs to Printify!`;
      } catch (error) {
        console.error('Error uploading designs to Printify:', error);
        statusDiv.className = 'alert alert-danger';
        statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i> Error uploading designs: ${error.message}`;
        throw error; // Re-throw to stop product creation
      }
    }
    
    // Process the temporary assigned designs to create placeholders
    Object.entries(tempAssignedDesigns).forEach(([areaId, design]) => {
      // Find the updated design with Printify image ID if it was just uploaded
      if (!design.printifyImageId) {
        const designId = window.selectedDesigns[areaId];
        const updatedDesign = window.designGallery?.find(d => d.id === designId);
        if (updatedDesign && updatedDesign.printifyImageId) {
          design.printifyImageId = updatedDesign.printifyImageId;
        } else {
          console.error('Missing Printify image ID for design:', design);
          return;
        }
      }
      
      const position = design.position || 'front';
      
      if (!placeholdersByPosition[position]) {
        placeholdersByPosition[position] = [];
      }
      
      placeholdersByPosition[position].push({
        id: design.printifyImageId, // This must be the Printify image ID
        x: design.x || 0.5,
        y: design.y || 0.5,
        scale: design.scale || 1.0,
        angle: design.angle || 0
      });
    });
    
    // Build the print_areas array - each position becomes a placeholder object
    const printAreasArray = [{
      variant_ids: variantIds,
      placeholders: Object.entries(placeholdersByPosition).map(([position, images]) => ({
        position: position,
        images: images
      }))
    }];
    
    console.log('Final print_areas structure:', JSON.stringify(printAreasArray, null, 2));
    
    // Validate we have proper structure
    if (printAreasArray[0].placeholders.length === 0) {
      alert('No valid designs found. Please ensure designs are properly uploaded to Printify.');
      return;
    }
    
    // Build the product data
    const productData = {
      title: productTitle,
      description: document.getElementById('productDescription').value.trim() || productTitle,
      blueprint_id: parseInt(selectedBlueprintId),
      print_provider_id: parseInt(selectedPrintProviderId),
      variants: selectedVariantData,
      print_areas: printAreasArray,
      tags: []
    };
    
    console.log('Creating product with data:', JSON.stringify(productData, null, 2));
    
    const response = await fetch(`${API_BASE}/api?endpoint=create-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({
        shop_id: selectedShopId,
        product: productData
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to create product');
    }
    
    currentProduct = result.product;
    
    alert('Product created successfully! You can now publish it to your store.');
    
    showPublishButton();
    resetProductForm();
    loadProducts();
    
  } catch (error) {
    console.error('Error creating product:', error);
    alert(`Error creating product: ${error.message}`);
  } finally {
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Create Product';
    }
  }
}

// Update existing product
async function updateExistingProduct(productId) {
  if (!productId) {
    alert('Product ID is missing');
    return;
  }
  
  const updateBtn = document.getElementById('createProductBtn');
  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
  }
  
  try {
    // Get form data
    const productTitle = document.getElementById('productTitle').value.trim();
    const productDescription = document.getElementById('productDescription').value.trim();
    
    // Get selected variants with calculated prices
    const selectedVariantData = selectedVariants.map(variantId => {
      const variant = productVariants.find(v => v.id === variantId);
      const price = variant ? (variant.calculatedPrice || variant.cost || 1999) : 1999;
      
      return {
        id: variantId,
        price: price,
        is_enabled: true
      };
    });
    
    // Prepare update data
    const updateData = {
      title: productTitle,
      description: productDescription,
      variants: selectedVariantData
    };
    
    // If new designs are assigned, include print areas
    if (Object.keys(assignedDesigns).length > 0) {
      const variantIds = selectedVariantData.map(v => v.id);
      
      // Group designs by position
      const placeholdersByPosition = {};
      
      Object.entries(assignedDesigns).forEach(([areaId, design]) => {
        if (!design.printifyImageId) {
          console.error('Missing Printify image ID for design:', design);
          return;
        }
        
        const position = design.position || 'front';
        
        if (!placeholdersByPosition[position]) {
          placeholdersByPosition[position] = [];
        }
        
        placeholdersByPosition[position].push({
          id: design.printifyImageId,
          x: design.x || 0.5,
          y: design.y || 0.5,
          scale: design.scale || 1.0,
          angle: design.angle || 0
        });
      });
      
      const printAreasArray = [{
        variant_ids: variantIds,
        placeholders: Object.entries(placeholdersByPosition).map(([position, images]) => ({
          position: position,
          images: images
        }))
      }];
      
      updateData.print_areas = printAreasArray;
    }
    
    console.log('Updating product with data:', updateData);
    
    const response = await fetch(`${API_BASE}/api?endpoint=update-product`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({
        shop_id: selectedShopId,
        product_id: productId,
        ...updateData
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update product');
    }
    
    alert('Product updated successfully!');
    resetProductForm();
    loadProducts();
    
  } catch (error) {
    console.error('Error updating product:', error);
    alert(`Error updating product: ${error.message}`);
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.innerHTML = '<i class="bi bi-pencil me-2"></i>Update Product';
    }
  }
}

// Show publish button after product creation
function showPublishButton() {
  if (!currentProduct || !currentProduct.id) return;
  
  const actionsContainer = document.getElementById('productActions');
  if (!actionsContainer) return;
  
  actionsContainer.innerHTML = `
    <div class="alert alert-success">
      <h5>Product Created Successfully!</h5>
      <p>Your product has been created in Printify. You can now publish it to your store.</p>
      <button class="btn btn-primary" onclick="publishProductToStore('${currentProduct.id}')">
        <i class="bi bi-cloud-upload me-2"></i>Publish to Store
      </button>
    </div>
  `;
}

// Publish product to connected store (Etsy, Shopify, etc.)
async function publishProductToStore(productId) {
  if (!productId || !selectedShopId || !printifyApiKey) {
    alert('Missing required information for publishing');
    return;
  }
  
  const publishBtn = event.target;
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publishing...';
  }
  
  try {
    const response = await fetch(`${API_BASE}/api?endpoint=publish-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({
        shop_id: selectedShopId,
        product_id: productId
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to publish product');
    }
    
    alert(result.message || 'Product published successfully to your store!');
    
    if (result.publish && result.publish.external && result.publish.external.handle) {
      window.open(result.publish.external.handle, '_blank');
    }
    
  } catch (error) {
    console.error('Error publishing product:', error);
    alert(`Error publishing product: ${error.message}`);
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Publish to Store';
    }
  }
}

// Reset product form
function resetProductForm() {
  const form = document.getElementById('createProductForm');
  if (form) form.reset();
  
  selectedBlueprintId = null;
  selectedPrintProviderId = null;
  selectedBlueprintImageUrl = null;
  assignedDesigns = {};
  selectedVariants = [];
  currentProduct = null;
  
  const createBtn = document.getElementById('createProductBtn');
  if (createBtn) {
    createBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Create Product';
    createBtn.dataset.mode = 'create';
    delete createBtn.dataset.productId;
  }
  
  const variantsList = document.getElementById('variantsList');
  if (variantsList) variantsList.innerHTML = '<p class="text-muted mb-0">Select a product type and print provider to see available variants</p>';
  
  const printAreasList = document.getElementById('printAreasList');
  if (printAreasList) printAreasList.innerHTML = '<p class="text-muted mb-0">Select a product type to see available print areas</p>';
  
  updateProductPreview();
  updateCreateProductButton();
  saveStateToStorage();
}

// Handle shop selection
async function handleShopSelection() {
  const shopSelect = document.getElementById('shopSelect');
  const shopId = shopSelect.value;
  
  if (!shopId) {
    console.log('No shop selected');
    return;
  }
  
  console.log('Selected shop ID:', shopId);
  selectedShopId = shopId;
  
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.style.display = 'block';
  }
  
  await loadBlueprints();
  await loadProducts();
  
  saveStateToStorage();
}

// Show API key status
function showApiKeyStatus(message, type) {
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  if (!apiKeyStatus) return;
  
  const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
  apiKeyStatus.innerHTML = `<div class="alert ${alertClass} mb-0 py-2">${message}</div>`;
}

// Initialize UI
function initializeUI() {
  const storedApiKey = sessionStorage.getItem('printifyApiKey');
  if (storedApiKey) {
    const apiKeyInput = document.getElementById('printifyApiKey');
    if (apiKeyInput) {
      apiKeyInput.value = storedApiKey;
      printifyApiKey = storedApiKey;
    }
    showApiKeyStatus('API Key loaded. Please click Verify to continue.', 'info');
  }
  
  updateCreateProductButton();
}

// Auto-verify API key on page load
async function autoVerifyApiKey() {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('printifyApiKey')) {
    const storedApiKey = sessionStorage.getItem('printifyApiKey');
    console.log('Found stored API key, auto-verifying...');
    
    const apiKeyInput = document.getElementById('printifyApiKey');
    if (apiKeyInput) {
      apiKeyInput.value = storedApiKey;
    }
    
    showApiKeyStatus('Verifying stored API key...', 'info');
    
    const isValid = await verifyApiToken(storedApiKey);
    if (isValid) {
      console.log('Auto-verification successful');
      showApiKeyStatus('API key verified successfully!', 'success');
      restoreUIState();
    } else {
      console.log('Auto-verification failed');
      showApiKeyStatus('Stored API key is invalid. Please enter a valid API key.', 'error');
    }
  }
}

// Restore UI state from saved state
function restoreUIState() {
  if (selectedShopId) {
    const shopSelect = document.getElementById('shopSelect');
    if (shopSelect) {
      shopSelect.value = selectedShopId;
      console.log('Restored shop selection:', selectedShopId);
      
      const event = new Event('change');
      shopSelect.dispatchEvent(event);
      
      if (selectedBlueprintId) {
        setTimeout(() => {
          const blueprintSelect = document.getElementById('blueprintSelect');
          if (blueprintSelect) {
            blueprintSelect.value = selectedBlueprintId;
            console.log('Restored blueprint selection:', selectedBlueprintId);
            
            const blueprintEvent = new Event('change');
            blueprintSelect.dispatchEvent(blueprintEvent);
          }
        }, 1000);
      }
    }
  }
  
  if (generatedDesigns && generatedDesigns.length > 0) {
    // Use our drag-and-drop implementation if available
    if (typeof window.dragDropDisplayGeneratedDesigns === 'function') {
      console.log('Using drag-drop implementation in restoreUIState');
      window.dragDropDisplayGeneratedDesigns(generatedDesigns);
    } else {
      console.log('Using original implementation in restoreUIState');
      displayGeneratedDesigns(generatedDesigns);
    }
  }
  
  if (assignedDesigns && Object.keys(assignedDesigns).length > 0) {
    updateProductPreview();
    updateCreateProductButton();
  }
  
  console.log('UI state restored from saved state');
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {


  console.log('DOM loaded, initializing...');
  
  // Load state from storage
  loadStateFromStorage();
  
  // No need for click event delegation with the new drag-and-drop approach
  // The drag-and-drop functionality is handled in design-gallery-drag-drop.js

  // Setup event listeners with better error handling
  const verifyApiKeyBtn = document.getElementById('verifyApiKey');
  if (verifyApiKeyBtn) {
    console.log('Found verify button, adding click listener');
    
    verifyApiKeyBtn.addEventListener('click', async function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Verify button clicked');
      
      const apiKeyInput = document.getElementById('printifyApiKey');
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      
      console.log('API key from input:', apiKey ? apiKey.substring(0, 10) + '...' : 'empty');
      
      if (!apiKey) {
        console.log('No API key provided');
        showApiKeyStatus('Please enter an API key', 'error');
        return;
      }
      
      // Disable button and show loading state
      verifyApiKeyBtn.disabled = true;
      verifyApiKeyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
      
      showApiKeyStatus('Verifying API key...', 'info');
      
      try {
        console.log('Starting verification process...');
        const isValid = await verifyApiToken(apiKey);
        
        if (isValid) {
          console.log('Verification successful');
          showApiKeyStatus('API key verified successfully!', 'success');
          
          const designSection = document.getElementById('designSection');
          if (designSection) {
            designSection.style.display = 'block';
            console.log('Showed design section');
          }
          
          const shopsSection = document.getElementById('shopsSection');
          if (shopsSection) {
            shopsSection.style.display = 'block';
            console.log('Showed shops section');
          }
          
          const mainContent = document.getElementById('mainContent');
          if (mainContent) {
            mainContent.style.display = 'block';
            console.log('Showed main content');
          }
        } else {
          console.log('Verification failed');
          showApiKeyStatus('Invalid API key. Please check your token and try again.', 'error');
        }
      } catch (error) {
        console.error('Verification error:', error);
        showApiKeyStatus('Error verifying API key: ' + error.message, 'error');
      } finally {
        // Re-enable button
        verifyApiKeyBtn.disabled = false;
        verifyApiKeyBtn.innerHTML = 'Verify API Key';
      }
    });
  } else {
    console.error('Verify API Key button not found! Check if element with id "verifyApiKey" exists.');
  }
  
  const shopSelect = document.getElementById('shopSelect');
  if (shopSelect) {
    shopSelect.addEventListener('change', handleShopSelection);
  } else {
    console.warn('Shop select element not found');
  }
  
  const blueprintSelect = document.getElementById('blueprintSelect');
  if (blueprintSelect) {
    blueprintSelect.addEventListener('change', handleBlueprintSelection);
  } else {
    console.warn('Blueprint select element not found');
  }
  
  const providerSelect = document.getElementById('providerSelect');
  if (providerSelect) {
    providerSelect.addEventListener('change', function() {
      const providerId = this.value;
      const blueprintId = document.getElementById('blueprintSelect').value;
      if (providerId && blueprintId) {
        selectedPrintProviderId = providerId;
        saveStateToStorage();
        loadVariants(blueprintId, providerId);
        // Reload print areas with provider-specific data
        loadPrintAreas(blueprintId);
      }
    });
  } else {
    console.warn('Provider select element not found');
  }
  
  const createProductForm = document.getElementById('createProductForm');
  if (createProductForm) {
    createProductForm.addEventListener('submit', handleProductCreation);
  } else {
    console.warn('Create product form not found');
  }
  
  const refreshProductsBtn = document.getElementById('refreshProductsBtn');
  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener('click', loadProducts);
  } else {
    console.warn('Refresh products button not found');
  }
  
  const generateDesignBtn = document.getElementById('generateDesignBtn');
  if (generateDesignBtn) {
    generateDesignBtn.addEventListener('click', async function() {
      const designPromptInput = document.getElementById('designPrompt');
      if (!designPromptInput || !designPromptInput.value.trim()) {
        alert('Please enter a design description');
        return;
      }
      
      this.disabled = true;
      this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
      
      try {
        await generateDesigns(designPromptInput.value.trim());
      } finally {
        this.disabled = false;
        this.innerHTML = 'Generate';
      }
    });
  } else {
    console.warn('Generate design button not found');
  }

  // Delegated event listener for generated design cards
  const generatedDesignsContainer = document.getElementById('generatedDesignsContainer');
  if (generatedDesignsContainer) {
    // Ensure the container is positioned to be clickable
    generatedDesignsContainer.style.position = 'relative';
    generatedDesignsContainer.style.zIndex = '1050'; // High z-index to be on top of other elements
    generatedDesignsContainer.addEventListener('click', function(event) {
      const designCard = event.target.closest('.design-card');
      if (designCard) {
        event.preventDefault(); // Prevent any default action
        const designId = designCard.dataset.designId;
        console.log(`Delegated click captured on design card. ID: ${designId}`);
        if (designId) {
          openPrintAreaSelectionModal(designId);
        } else {
          console.error('Clicked design card is missing a data-design-id attribute.');
        }
      }
    });
  } else {
    console.warn('Generated designs container not found.');
  }
  

  
  // Initialize UI
  initializeUI();
  
  // Auto-verify API key if available
  autoVerifyApiKey();
  
  console.log('All event listeners initialized');
});

// Function to load state from storage
function loadStateFromStorage() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      // Load API key
      const storedApiKey = sessionStorage.getItem('printifyApiKey');
      if (storedApiKey) {
        printifyApiKey = storedApiKey;
      }
      
      // Load app state
      const savedState = sessionStorage.getItem('printifyAppState');
      if (savedState) {
        const appState = JSON.parse(savedState);
        console.log('Loaded application state from sessionStorage');
        
        // Restore all state variables
        printifyApiKey = appState.printifyApiKey || printifyApiKey;
        selectedShopId = appState.selectedShopId || '';
        selectedDesignUrl = appState.selectedDesignUrl || null;
        selectedDesignOriginalUrl = appState.selectedDesignOriginalUrl || null;
        selectedDesignId = appState.selectedDesignId || null;
        currentDesignPrompt = appState.currentDesignPrompt || '';
        selectedPrintAreaWidth = appState.selectedPrintAreaWidth || 1000;
        selectedPrintAreaHeight = appState.selectedPrintAreaHeight || 1000;
        selectedPrintAreaPosition = appState.selectedPrintAreaPosition || 'front';
        selectedPrintAreaId = appState.selectedPrintAreaId || null;
        selectedBlueprintId = appState.selectedBlueprintId || null;
        selectedPrintProviderId = appState.selectedPrintProviderId || null;
        selectedBlueprintImageUrl = appState.selectedBlueprintImageUrl || null;
        Object.assign(assignedDesigns, appState.assignedDesigns || {});
        generatedDesigns = appState.generatedDesigns || [];
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading state from sessionStorage:', error);
    return false;
  }
}

// Function to display API key verification status with appropriate styling
function showApiKeyStatus(message, type = 'info') {
  console.log(`API Key Status: ${message} (${type})`);
  
  const statusElement = document.getElementById('apiKeyStatus');
  if (!statusElement) {
    console.error('API key status element not found');
    return;
  }
  
  // Clear previous classes
  statusElement.className = '';
  
  // Add appropriate class based on type
  switch (type) {
    case 'success':
      statusElement.className = 'alert alert-success';
      break;
    case 'error':
      statusElement.className = 'alert alert-danger';
      break;
    case 'warning':
      statusElement.className = 'alert alert-warning';
      break;
    case 'info':
    default:
      statusElement.className = 'alert alert-info';
      break;
  }
  
  statusElement.textContent = message;
  statusElement.style.display = 'block';
}

// Function to automatically verify API key if available in storage
async function autoVerifyApiKey() {
  console.log('Attempting to auto-verify API key from storage');
  const success = loadStateFromStorage();
  
  if (success && printifyApiKey) {
    console.log('Found stored API key, verifying...');
    const apiKeyInput = document.getElementById('printifyApiKey');
    if (apiKeyInput) {
      apiKeyInput.value = printifyApiKey;
    }
    
    const isValid = await verifyApiToken(printifyApiKey);
    if (isValid) {
      console.log('Auto-verification successful');
      showApiKeyStatus('API key verified successfully!', 'success');
      
      // Show relevant sections
      const designSection = document.getElementById('designSection');
      if (designSection) designSection.style.display = 'block';
      
      const shopsSection = document.getElementById('shopsSection');
      if (shopsSection) shopsSection.style.display = 'block';
      
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.style.display = 'block';
    } else {
      console.log('Auto-verification failed');
      showApiKeyStatus('Stored API key is no longer valid', 'error');
    }
  } else {
    console.log('No stored API key found or loading failed');
  }
}

// Helper function to verify Printify API token
async function verifyApiToken(token) {
  console.log('Starting API token verification for token:', token ? token.substring(0, 10) + '...' : 'null');
  
  if (!token || token.trim() === '') {
    console.error('No token provided for verification');
    return false;
  }
  
  try {
    // Use our serverless function to avoid CORS issues
    console.log('Attempting API verification via printify-proxy...');
    
    const shopsResponse = await fetch('/printify-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Printify-Api-Key': token.trim()
      },
      body: JSON.stringify({
        action: 'getShops'
      })
    });
    
    console.log('Printify API response status:', shopsResponse.status);
    
    if (shopsResponse.ok) {
      const shopsData = await shopsResponse.json();
      console.log('Shops data received:', shopsData);
      
      // Store the verified token
      printifyApiKey = token.trim();
      
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('printifyApiKey', token.trim());
      }
      
      saveStateToStorage();
      
      // Populate shops dropdown
      if (shopsData && Array.isArray(shopsData.data)) {
        populateShopDropdown(shopsData.data);
        console.log('Successfully populated shops dropdown with', shopsData.data.length, 'shops');
      } else if (shopsData && Array.isArray(shopsData)) {
        populateShopDropdown(shopsData);
        console.log('Successfully populated shops dropdown with', shopsData.length, 'shops');
      } else {
        console.warn('Unexpected shops data structure:', shopsData);
      }
      
      return true;
    } else {
      console.log('API verification via proxy failed with status:', shopsResponse.status);
      // Try through backend if available
      return await tryBackendVerification(token.trim());
    }
  } catch (error) {
    console.error('Error during API verification via proxy:', error);
    // Try backend verification as fallback
    return await tryBackendVerification(token.trim());
  }
}

// Separate function for backend verification to avoid nested try-catch issues
async function tryBackendVerification(token) {
  try {
    console.log('Trying backend verification...');
    
    const backendResponse = await fetch(`${API_BASE}/api?endpoint=verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: token })
    });

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('Backend verification response:', data);

      if (data.success) {
        console.log('API token verified via backend');
        printifyApiKey = token;
        
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('printifyApiKey', token);
        }
        
        saveStateToStorage();
        
        if (data.shops && Array.isArray(data.shops)) {
          populateShopDropdown(data.shops);
        } else if (data.shops && data.shops.data && Array.isArray(data.shops.data)) {
          populateShopDropdown(data.shops.data);
        }
        
        return true;
      } else {
        console.error('Backend verification failed:', data.message);
        return false;
      }
    } else {
      console.error('Backend verification request failed:', backendResponse.status);
      return false;
    }
  } catch (backendError) {
    console.error('Backend verification error:', backendError);
    return false;
  }
}

// Function to populate shop dropdown
function populateShopDropdown(shops) {
  const shopSelect = document.getElementById('shopSelect');
  if (!shopSelect) {
    console.error('Shop select element not found');
    return;
  }
  
  shopSelect.innerHTML = '<option value="">Select a shop</option>';
  
  shops.forEach(shop => {
    const option = document.createElement('option');
    option.value = shop.id;
    option.textContent = shop.title;
    shopSelect.appendChild(option);
  });
  
  const shopSelectionSection = document.getElementById('shopSelectionSection');
  if (shopSelectionSection) {
    shopSelectionSection.style.display = 'block';
  }
}

// Generate designs based on prompt
async function generateDesigns(prompt, numImages = 4) {
  if (!prompt) {
    alert('Please enter a design description');
    return;
  }
  
  const statusElement = document.getElementById('generationStatus');
  if (statusElement) {
    statusElement.innerHTML = '<div class="alert alert-info">Generating designs, please wait...</div>';
  }
  
  try {
    console.log(`Generating ${numImages} designs with prompt: "${prompt}"`);
    
    currentDesignPrompt = prompt;
    
    let printAreaContexts = [];
    
    if (printAreas && printAreas.length > 0) {
      printAreaContexts = printAreas.map(area => ({
        printAreaId: area.id,
        position: area.title ? area.title.toLowerCase() : 'unknown',
        width: area.width || 1000,
        height: area.height || 1000
      }));
    } else {
      printAreaContexts = [{
        printAreaId: selectedPrintAreaId || 'default',
        position: selectedPrintAreaPosition || 'unknown',
        width: selectedPrintAreaWidth || 1000,
        height: selectedPrintAreaHeight || 1000
      }];
    }
    
    console.log('Using print area contexts:', printAreaContexts);
    
    const response = await fetch(`${API_BASE}/api?endpoint=generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        numImages: numImages,
        printAreaContexts: printAreaContexts,
        apiKey: printifyApiKey
      })
    });
    
    const data = await response.json();
    console.log('Design generation response:', data);
    
    if (data.success && data.images && data.images.length > 0) {
      generatedDesigns = [...generatedDesigns, ...data.images];
      
      // Use our drag-and-drop implementation if available
      if (typeof window.dragDropDisplayGeneratedDesigns === 'function') {
        console.log('Using drag-drop implementation in generateDesigns');
        window.dragDropDisplayGeneratedDesigns(data.images);
      } else {
        console.log('Using original implementation in generateDesigns');
        displayGeneratedDesigns(data.images);
      }
      
      // Update product preview and button
      if (typeof window.updateProductPreview === 'function') {
        window.updateProductPreview();
      } else {
        updateProductPreview();
      }
      
      if (typeof window.updateCreateProductButton === 'function') {
        window.updateCreateProductButton();
      } else {
        updateCreateProductButton();
      }
      
      if (statusElement) {
        statusElement.innerHTML = `<div class="alert alert-success">${data.images.length} designs generated successfully! Select designs for each print area.</div>`;
      }
      
      return data.images;
    } else {
      console.error('Error generating designs:', data.message || 'No images returned');
      if (statusElement) {
        statusElement.innerHTML = `<div class="alert alert-danger">Error generating designs: ${data.message || 'No designs were generated'}</div>`;
      }
    }
  } catch (error) {
    console.error('Error generating designs:', error);
    if (statusElement) {
      statusElement.innerHTML = `<div class="alert alert-danger">Error generating designs: ${error.message}</div>`;
    }
  }
  
  return [];
}

// Display generated designs in the design gallery using our new drag-and-drop implementation
function displayGeneratedDesigns(designs) {
  console.log('App.js displayGeneratedDesigns called with:', designs);
  
  // Use our new drag-and-drop implementation if available
  if (typeof window.dragDropDisplayGeneratedDesigns === 'function') {
    console.log('Using drag-drop implementation');
    window.dragDropDisplayGeneratedDesigns(designs);
    return;
  }
  
  // Fallback to original implementation if drag-drop not available
  console.log('Fallback: Using original implementation');
  
  const container = document.getElementById('generatedDesignsContainer');
  if (!container) {
    console.error('Generated designs container not found');
    return;
  }
  
  // Clear previous designs
  container.innerHTML = '';
  
  // Create a gallery for the designs
  const gallery = document.createElement('div');
  gallery.id = 'designGallery';
  gallery.className = 'design-gallery';
  container.appendChild(gallery);
  
  // Create a card for each design
  designs.forEach((design, index) => {
    const designCard = document.createElement('div');
    designCard.className = 'card design-card mb-4'; // Added margin bottom
    designCard.dataset.designId = design.id;
    designCard.dataset.designUrl = design.url;
    designCard.dataset.originalUrl = design.originalUrl || design.url;
    
    // Make the entire card clickable
    designCard.onclick = function(e) {
      console.log('CARD CLICKED for design ID:', design.id);
      openPrintAreaSelectionModal(design.id);
    };
    
    const designImg = document.createElement('img');
    designImg.src = design.url;
    designImg.alt = `Generated design ${index + 1}`;
    designImg.className = 'design-image';
    designImg.style.cursor = 'pointer';
    
    const designInfo = document.createElement('div');
    designInfo.className = 'design-info p-3'; // Increased padding
    
    // Add a much larger, more obvious button
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-danger btn-lg w-100 mt-2'; // Changed to danger for visibility
    selectBtn.textContent = 'CLICK TO SELECT THIS DESIGN';
    selectBtn.style.fontSize = '16px';
    selectBtn.style.fontWeight = 'bold';
    selectBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Design button clicked with ID:', design.id);
      openPrintAreaSelectionModal(design.id);
    };
    
    designInfo.appendChild(selectBtn);
    designCard.appendChild(designImg);
    designCard.appendChild(designInfo);
    gallery.appendChild(designCard);
  });
  
  // Show the designs section
  const designsSection = document.getElementById('generatedDesignsSection');
  if (designsSection) {
    designsSection.classList.remove('d-none');
  }
}

// Open Bootstrap modal for print area selection using existing HTML
function openPrintAreaSelectionModal(designId) {
  console.log(`openPrintAreaSelectionModal called for design ID: ${designId}`);
  const modalElement = document.getElementById('printAreaSelectionModal');
  console.log('Modal element:', modalElement);

  if (!modalElement) {
    console.error('Print area selection modal element not found in the DOM!');
    return;
  }

  // Save the designId on the modal for later reference
  modalElement.dataset.designId = designId;

  const modalBody = document.getElementById('modalPrintAreasList');
  if (!modalBody) {
    console.error('Modal print areas list element not found');
    return;
  }

  // Clear previous list
  modalBody.innerHTML = '';

  // Retrieve print areas from currently selected blueprint
  const printAreas = (window.currentBlueprintData && window.currentBlueprintData.print_areas) || [];
  console.log('Print areas in modal:', printAreas);

  if (printAreas.length === 0) {
    modalBody.innerHTML = '<div class="alert alert-warning">No print areas available for this product.</div>';
  } else {
    printAreas.forEach(area => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      btn.dataset.areaId = area.id;
      btn.innerHTML = `
        <div>
          <h6 class="mb-1">${area.title || 'Print Area'}</h6>
          <small class="text-muted">${area.id}</small>
        </div>
        <span class="badge bg-primary rounded-pill">${area.height}×${area.width}</span>
      `;

      btn.addEventListener('click', () => {
        console.log(`Print area selected: ${area.id} for design: ${designId}`);
        if (typeof window.assignDesignToPrintArea === 'function') {
          window.assignDesignToPrintArea(designId, area.id);
        }
        modal.hide();
      });

      modalBody.appendChild(btn);
    });
  }

  // Show modal via Bootstrap
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// Load products for the selected shop
async function loadProducts() {
  if (!selectedShopId || !printifyApiKey) {
    console.error('Missing shop ID or API key');
    return;
  }

  const productsLoading = document.getElementById('productsLoading');
  const productsList = document.getElementById('productsList');
  
  if (productsLoading) productsLoading.style.display = 'block';
  if (productsList) productsList.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/api?endpoint=get-products&shopId=${selectedShopId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });

    const data = await response.json();
    console.log('Products response:', data);

    if (productsLoading) productsLoading.style.display = 'none';

    if (data.success) {
      const productsArray = data.products && Array.isArray(data.products.data)
        ? data.products.data
        : [];

      if (productsArray.length === 0) {
        productsList.innerHTML = '<div class="alert alert-info">No products found. Create a new product to get started.</div>';
      } else {
        displayProducts(productsArray);
      }
    } else {
      console.error('Failed to load products:', data.message || 'Unknown error');
      if (productsList) {
        productsList.innerHTML = `<div class="alert alert-danger">Failed to load products: ${data.message || 'Unknown error'}</div>`;
      }
    }
  } catch (error) {
    console.error('Error loading products:', error);
    if (productsLoading) productsLoading.style.display = 'none';
    if (productsList) {
      productsList.innerHTML = `<div class="alert alert-danger">Error loading products: ${error.message}</div>`;
    }
  }
}

// Display products in the UI
function displayProducts(products) {
  const productsList = document.getElementById('productsList');
  if (!productsList) return;
  
  productsList.innerHTML = '';
  
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    
    const image = product.images && product.images.length > 0 ? 
      product.images[0].src : 
      'https://placehold.co/150/EFEFEF/999999';
    
    card.innerHTML = `
      <div class="card h-100">
        <img src="${image}" class="card-img-top" alt="${product.title}">
        <div class="card-body">
          <h5 class="card-title">${product.title}</h5>
          <p class="card-text">${product.description || 'No description'}</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-primary view-product" data-product-id="${product.id}">View Details</button>
          <button class="btn btn-sm btn-outline-secondary edit-product" data-product-id="${product.id}">Edit</button>
        </div>
      </div>
    `;
    
    productsList.appendChild(card);
    
    const viewBtn = card.querySelector('.view-product');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => viewProductDetails(product.id));
    }
    
    const editBtn = card.querySelector('.edit-product');
    if (editBtn) {
      editBtn.addEventListener('click', () => editProduct(product.id));
    }
  });
}

// View product details
async function viewProductDetails(productId) {
  console.log('Viewing product details for:', productId);
  alert('Product details functionality coming soon!');
}

// Edit product
async function editProduct(productId) {
  console.log('Editing product:', productId);
  
  const loadingEl = document.getElementById('productsLoading');
  if (loadingEl) loadingEl.classList.remove('d-none');
  
  try {
    const response = await fetch(`${API_BASE}/api?endpoint=get-product&product_id=${productId}&shop_id=${selectedShopId}`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });
    const data = await response.json();
    
    if (!data.success || !data.product) {
      throw new Error(data.error || 'Failed to fetch product details');
    }
    
    const product = data.product;
    console.log('Product details:', product);
    
    // Switch to the create/edit tab
    const createTab = document.getElementById('create-tab');
    if (createTab) {
      const tabTrigger = new bootstrap.Tab(createTab);
      tabTrigger.show();
    }
    
    // Populate form fields
    const productTitle = document.getElementById('productTitle');
    const productDescription = document.getElementById('productDescription');
    const blueprintSelect = document.getElementById('blueprintSelect');
    const providerSelect = document.getElementById('providerSelect');
    
    if (productTitle) productTitle.value = product.title || '';
    if (productDescription) productDescription.value = product.description || '';
    
    // Load and set blueprint and provider
    if (blueprintSelect) {
      await loadBlueprints();
      blueprintSelect.value = product.blueprint_id || '';
      await handleBlueprintSelection(); // This will load providers and print areas
    }
    
    if (providerSelect) {
      // Wait for providers to load before setting the value
      setTimeout(async () => {
        providerSelect.value = product.print_provider_id || '';
        await loadVariants(product.blueprint_id, product.print_provider_id);
      }, 500); // A small delay to ensure dependent data is loaded
    }
    
    // Set the button to update mode
    const createProductBtn = document.getElementById('createProductBtn');
    if (createProductBtn) {
      createProductBtn.textContent = 'Update Product';
      createProductBtn.dataset.productId = productId;
      createProductBtn.dataset.mode = 'update';
    }
    
    const formTitle = document.querySelector('#createProductForm .card-title');
    if (formTitle) formTitle.textContent = 'Edit Product';

  } catch (error) {
    console.error('Error setting up product for editing:', error);
    alert(`Error editing product: ${error.message || 'Unknown error'}`);
  } finally {
    if (loadingEl) loadingEl.classList.add('d-none');
  }
}

// Load blueprints
async function loadBlueprints() {
  if (!printifyApiKey) return;
  const blueprintSelect = document.getElementById('blueprintSelect');
  if (!blueprintSelect) return;

  blueprintSelect.innerHTML = '<option>Loading blueprints...</option>';

  try {
    const response = await fetch(`${API_BASE}/api?endpoint=get-blueprints`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });
    const data = await response.json();

    if (data.success && Array.isArray(data.blueprints)) {
      blueprintData = {};
      blueprintSelect.innerHTML = '<option value="">-- Select Blueprint --</option>';
      data.blueprints.forEach(blueprint => {
        blueprintData[blueprint.id] = blueprint;
        const option = document.createElement('option');
        option.value = blueprint.id;
        option.textContent = blueprint.title;
        blueprintSelect.appendChild(option);
      });
    } else {
      console.error('Failed to load blueprints:', data.message);
      blueprintSelect.innerHTML = '<option>Error loading blueprints</option>';
    }
  } catch (error) {
    console.error('Error loading blueprints:', error);
    blueprintSelect.innerHTML = '<option>Error loading blueprints</option>';
  }
}

// Handle blueprint selection
async function handleBlueprintSelection() {
  const blueprintSelect = document.getElementById('blueprintSelect');
  const providerSelect = document.getElementById('providerSelect');
  
  const blueprintId = blueprintSelect.value;
  if (!blueprintId) {
    if (providerSelect) {
      providerSelect.innerHTML = '<option value="">Select a blueprint first</option>';
      providerSelect.disabled = true;
    }
    return;
  }

  selectedBlueprintId = blueprintId;
  const blueprint = blueprintData[blueprintId];
  if (blueprint && blueprint.images && blueprint.images.length > 0) {
    selectedBlueprintImageUrl = blueprint.images[0];
  }
  
  await loadPrintProviders(blueprintId);
  await loadPrintAreas(blueprintId);
}

// Load print providers for a selected blueprint
async function loadPrintProviders(blueprintId) {
  if (!printifyApiKey || !blueprintId) return;
  
  const providerSelect = document.getElementById('providerSelect');
  if (!providerSelect) return;
  
  const providerLoading = document.getElementById('providerLoading');
  if (providerLoading) providerLoading.style.display = 'block';
  
  providerSelect.innerHTML = '<option>Loading providers...</option>';
  providerSelect.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api?endpoint=get-providers&blueprintId=${blueprintId}`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });
    const data = await response.json();
    
    if (data.success && Array.isArray(data.providers)) {
      providerSelect.innerHTML = '<option value="">-- Select Print Provider --</option>';
      data.providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.title;
        providerSelect.appendChild(option);
      });
      providerSelect.disabled = false;
    } else {
      console.error('Failed to load print providers:', data.message);
      providerSelect.innerHTML = '<option>Error loading providers</option>';
    }
  } catch (error) {
    console.error('Error loading print providers:', error);
    providerSelect.innerHTML = '<option>Error loading providers</option>';
  } finally {
    if (providerLoading) providerLoading.style.display = 'none';
  }
}

// FIXED: Load print areas with correct structure handling
async function loadPrintAreas(blueprintId) {
  if (!blueprintId) {
    console.error('No blueprint ID provided');
    return;
  }
  
  const printAreasList = document.getElementById('printAreasList');
  printAreasList.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split me-2"></i>Loading print areas...</p>';
  
  try {
    const printifyApiKey = sessionStorage.getItem('printifyApiKey');
    if (!printifyApiKey) {
      console.error('No Printify API key found');
      return;
    }
    
    // Get the currently selected print provider ID
    const selectedPrintProviderId = document.getElementById('providerSelect').value;
    
    if (!selectedPrintProviderId) {
      console.log('No print provider selected yet, using blueprint-only data');
    }
    
    // Get blueprint details with variants which contain placeholders
    const blueprintResponse = await fetch(`${API_BASE}/api?endpoint=get-blueprint&blueprintId=${blueprintId}&providerId=${selectedPrintProviderId}`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
  
    if (!blueprintResponse.ok) {
      throw new Error(`Failed to fetch blueprint details. Status: ${blueprintResponse.status}`);
    }
  
    const blueprintData = await blueprintResponse.json();
    
    if (!blueprintData.success || !blueprintData.blueprint) {
      console.error('Invalid blueprint data response', blueprintData);
      printAreasList.innerHTML = '<p class="text-danger">Could not load print areas for this product</p>';
      return;
    }
    
    const blueprint = blueprintData.blueprint;
    console.log('Full blueprint data:', blueprint);
    
    // Extract print areas from variants' placeholders - this is the most reliable method
    let extractedPrintAreas = [];
    
    if (blueprint.variants && Array.isArray(blueprint.variants) && blueprint.variants.length > 0) {
      // Get placeholders from the first variant as they're typically the same across variants
      const firstVariant = blueprint.variants[0];
      if (firstVariant.placeholders && Array.isArray(firstVariant.placeholders)) {
        extractedPrintAreas = firstVariant.placeholders.map(placeholder => ({
          id: placeholder.position || 'front',
          title: placeholder.position ? placeholder.position.charAt(0).toUpperCase() + placeholder.position.slice(1) : 'Front',
          position: placeholder.position || 'front',
          width: placeholder.width || 3000,
          height: placeholder.height || 3000
        }));
        console.log('Extracted print areas from variants placeholders:', extractedPrintAreas);
      }
    }
    
    // If no placeholders found in variants, try other fallback methods
    if (extractedPrintAreas.length === 0) {
      // Check print_provider_properties
      if (blueprint.print_provider_properties && 
          blueprint.print_provider_properties.print_areas && 
          Array.isArray(blueprint.print_provider_properties.print_areas)) {
        
        extractedPrintAreas = blueprint.print_provider_properties.print_areas.map(area => ({
          id: area.id || area.position || 'front',
          title: area.title || area.id || 'Front',
          position: area.position || area.id || 'front',
          width: area.width || 3000,
          height: area.height || 3000
        }));
        console.log('Using print areas from print_provider_properties:', extractedPrintAreas);
      }
      // Check direct print_areas property
      else if (blueprint.print_areas && Array.isArray(blueprint.print_areas)) {
        extractedPrintAreas = blueprint.print_areas.map(area => ({
          id: area.id || area.position || 'front',
          title: area.title || area.id || 'Front',
          position: area.position || area.id || 'front',
          width: area.width || 3000,
          height: area.height || 3000
        }));
        console.log('Using print areas from blueprint.print_areas:', extractedPrintAreas);
      }
      // Use default print areas if nothing found
      else {
        console.log('No print areas found in blueprint data, using defaults');
        extractedPrintAreas = [
          { id: 'front', title: 'Front', position: 'front', width: 3000, height: 3000 },
          { id: 'back', title: 'Back', position: 'back', width: 3000, height: 3000 }
        ];
      }
    }
    
    // Store the print areas globally
    printAreas = extractedPrintAreas;
    
    // Display print areas in UI
    displayPrintAreasInUI(extractedPrintAreas);
    
    // Show the design generation section
    showDesignGenerationSection();
    
  } catch (error) {
    console.error('Error loading print areas:', error);
    printAreasList.innerHTML = `<p class="text-danger">Error loading print areas: ${error.message}</p>`;
  }
}

// Display all print areas in UI with proper structure
function displayPrintAreasInUI(areas) {
  const printAreasList = document.getElementById('printAreasList');
  
  if (!areas || areas.length === 0) {
    printAreasList.innerHTML = '<p class="text-muted">No print areas available for this product</p>';
    return;
  }
  
  // Sort print areas by common positions
  const positionOrder = ['front', 'back', 'left', 'right', 'sleeve', 'pocket'];
  areas.sort((a, b) => {
    const posA = (a.position || '').toLowerCase();
    const posB = (b.position || '').toLowerCase();
    
    const indexA = positionOrder.findIndex(pos => posA.includes(pos));
    const indexB = positionOrder.findIndex(pos => posB.includes(pos));
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
  
  // Store the print areas globally for later use
  window.printAreas = areas;
  
  let printAreasHtml = '<div class="row">';
  areas.forEach(area => {
    const position = (area.position || area.title || 'unknown').toLowerCase();
    const width = area.width ? `${area.width}px` : 'unknown';
    const height = area.height ? `${area.height}px` : 'unknown';
    const hasDesign = window.selectedDesigns && window.selectedDesigns[area.id];
    
    printAreasHtml += `
      <div class="col-md-4 mb-3">
        <div class="print-area-item p-3 border rounded ${hasDesign ? 'border-success' : ''}" 
             data-print-area-id="${area.id}" 
             data-position="${position}" 
             data-width="${area.width || 3000}" 
             data-height="${area.height || 3000}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${area.title || area.id}</h6>
              <p class="text-muted small mb-0">Size: ${width} × ${height}</p>
            </div>
            <div class="design-status">
              ${hasDesign ? 
                '<span class="badge bg-success">Design Assigned</span>' : 
                '<span class="badge bg-secondary">No Design</span>'}
            </div>
          </div>
          ${hasDesign ? `
            <div class="assigned-design-preview mt-2">
              <img src="" class="img-fluid rounded" alt="Assigned Design" 
                   data-design-id="${window.selectedDesigns[area.id]}" />
            </div>` : ''}
        </div>
      </div>
    `;
  });
  printAreasHtml += '</div>';
  
  printAreasList.innerHTML = printAreasHtml;
  
  // Update the design previews if there are assigned designs
  updateAssignedDesignPreviews();
}

// Handle print area selection
function handlePrintAreaSelection(areaId, position, width, height) {
  selectedPrintAreaId = areaId;
  selectedPrintAreaWidth = width || 3000;
  selectedPrintAreaHeight = height || 3000;
  
  // Expose selected print area globally for design-gallery.js
  window.selectedPrintAreaId = selectedPrintAreaId;
  window.selectedPrintAreaPosition = position;
  window.selectedPrintAreaWidth = selectedPrintAreaWidth;
  window.selectedPrintAreaHeight = selectedPrintAreaHeight;
  
  // Normalize position to one of our standard positions
  const positionMap = {
    'front': 'front',
    'back': 'back',
    'left': 'left',
    'right': 'right',
    'sleeve': 'sleeve',
    'pocket': 'pocket'
  };
  
  // Make sure the design generation section exists
  if (!document.getElementById('designGenSection')) {
    showDesignGenerationSection();
  }
  
  // Select the print area in the dropdown
  const printAreaSelector = document.getElementById('printAreaSelector');
  if (printAreaSelector) {
    printAreaSelector.value = areaId;
    
    // Trigger the change event to update the UI
    const event = new Event('change');
    printAreaSelector.dispatchEvent(event);
  }
  
  // Remove selection styling from all print area cards
  document.querySelectorAll('.print-area-card').forEach(card => {
    card.classList.remove('border-primary');
    card.classList.remove('selected-print-area');
  });
  
  // Add selection styling to the selected print area card
  const selectedCard = document.querySelector(`.print-area-card[data-print-area-id="${areaId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('border-primary');
    selectedCard.classList.add('selected-print-area');
  }
  
  // Update the design gallery buttons to reflect the current print area selection
  if (typeof updateAssignToCurrentAreaButtons === 'function') {
    updateAssignToCurrentAreaButtons();
  }
  
  // Scroll to the design generation section
  const designGenSection = document.getElementById('designGenSection');
  if (designGenSection) {
    designGenSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Update print area visuals based on selections
function updatePrintAreaVisuals() {
  const printAreaCards = document.querySelectorAll('.print-area-card');
  
  printAreaCards.forEach(card => {
    const areaId = card.dataset.printAreaId;
    
    // Check if this is the selected print area
    if (areaId === selectedPrintAreaId) {
      card.classList.add('selected-print-area');
    } else {
      card.classList.remove('selected-print-area');
    }
    
    // Check if this print area has a design assigned
    const designBadge = card.querySelector('.design-badge');
    if (designBadge) {
      if (selectedDesigns[areaId]) {
        designBadge.classList.remove('d-none');
        designBadge.classList.add('badge', 'bg-success', 'position-absolute', 'top-0', 'end-0', 'm-2');
        designBadge.innerHTML = '<i class="bi bi-check-circle me-1"></i>Design Assigned';
      } else {
        designBadge.classList.remove('bg-success');
        designBadge.classList.add('bg-secondary');
        designBadge.classList.remove('d-none');
        designBadge.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>No Design';
      }
    }
  });
  
  // Update assigned design previews
  updateAssignedDesignPreviews();
}

// Update the design previews in the print areas
function updateAssignedDesignPreviews() {
  if (!window.selectedDesigns) return;
  
  // First, clear all existing previews
  const allPrintAreaCards = document.querySelectorAll('.print-area-card');
  allPrintAreaCards.forEach(card => {
    const existingPreview = card.querySelector('.assigned-design-preview');
    if (existingPreview) {
      existingPreview.style.backgroundImage = 'none';
    }
  });
  
  // For each print area, check if it has an assigned design
  Object.entries(window.selectedDesigns).forEach(([printAreaId, designId]) => {
    // Find the design in the gallery
    const design = window.designGallery?.find(d => d.id === designId);
    if (!design) return;
    
    // Find the print area card
    const printAreaCard = document.querySelector(`.print-area-card[data-print-area-id="${printAreaId}"]`);
    if (!printAreaCard) return;
    
    // Find or create the design preview image
    let designPreview = printAreaCard.querySelector('.assigned-design-preview');
    if (!designPreview) {
      designPreview = document.createElement('div');
      designPreview.className = 'assigned-design-preview position-absolute w-100 h-100 top-0 start-0';
      printAreaCard.appendChild(designPreview);
    }
    
    // Update the preview with the design image
    designPreview.style.backgroundImage = `url(${design.url})`;
    designPreview.style.backgroundSize = 'contain';
    designPreview.style.backgroundPosition = 'center';
    designPreview.style.backgroundRepeat = 'no-repeat';
    designPreview.style.opacity = '0.8';
    designPreview.style.zIndex = '1';
    
    // Add a tooltip with design info
    printAreaCard.setAttribute('data-bs-toggle', 'tooltip');
    printAreaCard.setAttribute('data-bs-placement', 'top');
    printAreaCard.setAttribute('title', `Design ${designId.substring(0, 8)}... assigned`);
    
    // Initialize tooltips
    try {
      new bootstrap.Tooltip(printAreaCard);
    } catch (e) {
      console.log('Tooltip already initialized');
    }
  });
}