// Design Gallery Management with Drag-and-Drop Functionality
// Stores all generated designs with their metadata
let designGallery = [];

// Design-to-print area assignments
let designAssignments = {}; // Map of printAreaId -> designId

// History for undo/redo functionality
let assignmentHistory = [];
let historyPosition = -1;

// Expose the design assignments globally
window.designAssignments = designAssignments;

// Create the assignment modal if it doesn't exist
function createAssignmentModal() {
  // Check if modal already exists
  if (document.getElementById('assignDesignModal')) {
    return;
  }
  
  const modalHtml = `
    <div class="modal fade" id="assignDesignModal" tabindex="-1" aria-labelledby="assignDesignModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="assignDesignModalLabel">Assign Design to Print Areas</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-5">
                <div class="selected-design-preview text-center mb-3">
                  <img id="modalDesignPreview" src="" class="img-fluid rounded" alt="Selected Design">
                </div>
              </div>
              <div class="col-md-7">
                <h6>Select Print Areas to Assign This Design:</h6>
                <div id="modalPrintAreasList" class="list-group mt-3">
                  <!-- Print areas will be populated here -->
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="saveAssignmentsBtn">Save Assignments</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append modal to body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
}

// Show the assign design modal
function showAssignDesignModal(designId) {
  // Create modal if it doesn't exist
  createAssignmentModal();
  
  // Get the design data
  const design = designGallery.find(d => d.id === designId);
  if (!design) {
    console.error('Design not found:', designId);
    return;
  }
  
  // Set the selected design preview
  const modalDesignPreview = document.getElementById('modalDesignPreview');
  if (modalDesignPreview) {
    modalDesignPreview.src = design.url;
    modalDesignPreview.setAttribute('data-design-id', designId);
  }
  
  // Populate print areas list
  const modalPrintAreasList = document.getElementById('modalPrintAreasList');
  if (modalPrintAreasList && window.printAreas) {
    let printAreasHtml = '';
    
    window.printAreas.forEach(area => {
      const isAssigned = selectedDesigns[area.id] === designId;
      
      printAreasHtml += `
        <div class="list-group-item d-flex justify-content-between align-items-center" 
             data-print-area-id="${area.id}">
          <div>
            <h6 class="mb-0">${area.title || area.id}</h6>
            <small class="text-muted">Size: ${area.width}x${area.height}</small>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input print-area-checkbox" type="checkbox" 
                   id="printArea-${area.id}" ${isAssigned ? 'checked' : ''}>
            <label class="form-check-label" for="printArea-${area.id}">
              ${isAssigned ? 'Assigned' : 'Assign'}
            </label>
          </div>
        </div>
      `;
    });
    
    modalPrintAreasList.innerHTML = printAreasHtml;
  }
  
  // Add event listener to save button
  const saveAssignmentsBtn = document.getElementById('saveAssignmentsBtn');
  if (saveAssignmentsBtn) {
    // Remove any existing event listeners
    const newSaveBtn = saveAssignmentsBtn.cloneNode(true);
    saveAssignmentsBtn.parentNode.replaceChild(newSaveBtn, saveAssignmentsBtn);
    
    // Add new event listener
    newSaveBtn.addEventListener('click', () => {
      saveDesignAssignments(designId);
    });
  }
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('assignDesignModal'));
  modal.show();
}

// Save design assignments from the modal
function saveDesignAssignments(designId) {
  const checkboxes = document.querySelectorAll('#modalPrintAreasList .print-area-checkbox');
  let assignmentsChanged = false;
  
  checkboxes.forEach(checkbox => {
    const printAreaId = checkbox.closest('.list-group-item').getAttribute('data-print-area-id');
    const isChecked = checkbox.checked;
    
    // If checked, assign the design to this print area
    if (isChecked) {
      if (selectedDesigns[printAreaId] !== designId) {
        assignDesignToPrintArea(designId, printAreaId);
        assignmentsChanged = true;
      }
    } 
    // If unchecked but was previously assigned to this design, remove the assignment
    else if (selectedDesigns[printAreaId] === designId) {
      delete selectedDesigns[printAreaId];
      assignmentsChanged = true;
    }
  });
  
  if (assignmentsChanged) {
    // Update UI to reflect changes
    updatePrintAreaVisuals();
    updateProductPreview();
    updateCreateProductButton();
    
    // Update the design gallery UI
    displayGeneratedDesigns(designGallery);
    
    // If app.js has the function to update assigned design previews, call it
    if (typeof window.updateAssignedDesignPreviews === 'function') {
      window.updateAssignedDesignPreviews();
    }
  }
  
  // Close the modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('assignDesignModal'));
  if (modal) {
    modal.hide();
  }
}

// Display generated designs in a gallery format
function displayGeneratedDesigns(images) {
  console.log('Displaying generated designs:', images);
  
  // Store the designs in our gallery
  if (!Array.isArray(designGallery)) {
    designGallery = [];
  }
  
  // Add new designs to the gallery
  images.forEach(image => {
    // Check if this design is already in the gallery
    const existingIndex = designGallery.findIndex(d => d.id === image.id);
    if (existingIndex >= 0) {
      // Update existing design
      designGallery[existingIndex] = { ...designGallery[existingIndex], ...image };
    } else {
      // Add new design
      designGallery.push(image);
    }
  });
  
  // Make the gallery available globally
  window.designGallery = designGallery;
  
  // Get the container for the designs
  const designGalleryContainer = document.getElementById('designGalleryContainer');
  if (!designGalleryContainer) {
    return;
  }
  
  // Create a row for the designs
  const designsRow = document.createElement('div');
  designsRow.className = 'row g-3';
  designGalleryContainer.innerHTML = '';
  designGalleryContainer.appendChild(designsRow);
  
  // Create the design workspace layout
  const workspaceHtml = `
    <div class="row mb-4">
      <div class="col-12">
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          <strong>Drag and drop</strong> designs onto print areas to assign them. Click the <strong>Preview</strong> tab to see your product.
        </div>
      </div>
    </div>
  `;
  
  // Add designs to the gallery
  images.forEach(image => {
    const designCard = document.createElement('div');
    designCard.className = 'col-6 col-md-4';
    designCard.innerHTML = `
      <div class="card h-100 design-card" data-design-id="${image.id}">
        <img src="${image.url}" class="card-img-top design-image" alt="${image.prompt || 'Generated design'}">
        <div class="card-body">
          <p class="card-text small text-truncate">${image.prompt || 'No prompt'}</p>
          <button class="btn btn-sm btn-primary assign-design-btn">Assign to Print Area</button>
        </div>
      </div>
    `;
    
    designsRow.appendChild(designCard);
  });
  
  // If no designs, show a message
  if (designGallery.length === 0) {
    const noDesignsMessage = document.createElement('div');
    noDesignsMessage.className = 'col-12 text-center py-5';
    noDesignsMessage.innerHTML = `
      <div class="text-muted">
        <i class="bi bi-images fs-1"></i>
        <p class="mt-3">No designs generated yet. Enter a prompt and click "Generate Designs".</p>
      </div>
    `;
    designsRow.appendChild(noDesignsMessage);
  }
  
  // Update print area dropdowns if product is selected
  if (selectedBlueprintId) {
    updatePrintAreaDropdowns();
  }
}

// Function to show the assign design modal
function showAssignDesignModal(designId) {
  console.log('Opening assign design modal for design:', designId);
  
  // Find the design in the gallery
  const design = designGallery.find(d => d.id === designId);
  if (!design) {
    console.error('Design not found:', designId);
    return;
  }
  
  // Create or get the modal
  let modal = document.getElementById('assignDesignModal');
  if (!modal) {
    modal = createAssignmentModal();
  }
  
  // Get the modal elements
  const modalTitle = modal.querySelector('.modal-title');
  const modalDesignImage = modal.querySelector('#modalDesignImage');
  const printAreaCheckboxes = modal.querySelector('#printAreaCheckboxes');
  const saveButton = modal.querySelector('#saveAssignmentsBtn');
  
  // Update modal content
  modalTitle.textContent = `Assign Design ${design.id.substring(0, 8)}...`;
  modalDesignImage.src = design.url;
  modalDesignImage.alt = `Design ${design.id}`;
  
  // Clear existing checkboxes
  printAreaCheckboxes.innerHTML = '';
  
  // Add checkboxes for each print area
  if (printAreas && printAreas.length > 0) {
    printAreas.forEach(printArea => {
      const isAssigned = selectedDesigns[printArea.id] === design.id;
      const hasOtherDesign = selectedDesigns[printArea.id] && selectedDesigns[printArea.id] !== design.id;
      
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'form-check form-switch mb-2';
      
      checkboxDiv.innerHTML = `
        <input class="form-check-input" type="checkbox" id="printArea-${printArea.id}" 
               data-print-area-id="${printArea.id}" ${isAssigned ? 'checked' : ''}>
        <label class="form-check-label d-flex justify-content-between" for="printArea-${printArea.id}">
          <span>${printArea.title || printArea.id}</span>
          ${hasOtherDesign ? '<small class="text-warning">Has another design</small>' : ''}
        </label>
      `;
      
      printAreaCheckboxes.appendChild(checkboxDiv);
    });
  } else {
    printAreaCheckboxes.innerHTML = '<div class="alert alert-warning">No print areas available</div>';
  }
  
  // Update the save button to include the design ID
  saveButton.dataset.designId = design.id;
  
  // Show the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// Create the assignment modal if it doesn't exist
function createAssignmentModal() {
  // Check if modal already exists
  let modal = document.getElementById('assignDesignModal');
  if (modal) {
    return modal;
  }
  
  // Create the modal element
  modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'assignDesignModal';
  modal.tabIndex = '-1';
  modal.setAttribute('aria-labelledby', 'assignDesignModalLabel');
  modal.setAttribute('aria-hidden', 'true');
  
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="assignDesignModalLabel">Assign Design to Print Areas</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-5">
              <div class="text-center mb-3">
                <img id="modalDesignImage" src="" alt="Design Preview" class="img-fluid rounded border" style="max-height: 300px;">
              </div>
            </div>
            <div class="col-md-7">
              <h6>Select Print Areas to Assign This Design:</h6>
              <p class="text-muted small">Toggle the switches to assign or unassign this design to print areas.</p>
              <div id="printAreaCheckboxes" class="mt-3">
                <!-- Print area checkboxes will be inserted here -->
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveAssignmentsBtn">Save Assignments</button>
        </div>
      </div>
    </div>
  `;
  
  // Add the modal to the document body
  document.body.appendChild(modal);
  
  // Add event listener for the save button
  const saveButton = modal.querySelector('#saveAssignmentsBtn');
  saveButton.addEventListener('click', saveDesignAssignments);
  
  return modal;
}

// Save the design assignments from the modal
function saveDesignAssignments() {
  const designId = this.dataset.designId;
  console.log('Saving assignments for design:', designId);
  
  // Find the design
  const design = designGallery.find(d => d.id === designId);
  if (!design) {
    console.error('Design not found:', designId);
    return;
  }
  
  // Get all checkboxes
  const checkboxes = document.querySelectorAll('#printAreaCheckboxes input[type="checkbox"]');
  
  // Process each checkbox
  checkboxes.forEach(checkbox => {
    const printAreaId = checkbox.dataset.printAreaId;
    const isChecked = checkbox.checked;
    
    if (isChecked) {
      // Assign the design to this print area
      selectedDesigns[printAreaId] = designId;
      console.log(`Assigned design ${designId} to print area ${printAreaId}`);
    } else {
      // If this print area had this design assigned, remove it
      if (selectedDesigns[printAreaId] === designId) {
        delete selectedDesigns[printAreaId];
        console.log(`Removed design ${designId} from print area ${printAreaId}`);
      }
    }
  });
  
  // Update the UI
  updatePrintAreaVisuals();
  updateProductPreview();
  updateCreateProductButton();
  
  // Update the design cards to show which designs are assigned
  displayGeneratedDesigns(designGallery);
  
  // Close the modal
  const modal = document.getElementById('assignDesignModal');
  const modalInstance = bootstrap.Modal.getInstance(modal);
  modalInstance.hide();
}

// Function to preview a design in a modal
function previewDesign(designId) {
  console.log('Previewing design:', designId);
  
  // Find the design in the gallery
  const design = designGallery.find(d => d.id === designId);
  if (!design) {
    console.error('Design not found:', designId);
    return;
  }
  
  // Create or get the modal
  let modal = document.getElementById('previewDesignModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'previewDesignModal';
    modal.tabIndex = '-1';
    modal.setAttribute('aria-labelledby', 'previewDesignModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="previewDesignModalLabel">Design Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <img id="previewDesignImage" src="" alt="Design Preview" class="img-fluid rounded">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="previewAssignBtn">Assign to Print Areas</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for the assign button
    const assignButton = modal.querySelector('#previewAssignBtn');
    assignButton.addEventListener('click', function() {
      // Close this modal
      const previewModalInstance = bootstrap.Modal.getInstance(modal);
      previewModalInstance.hide();
      
      // Open the assign modal
      setTimeout(() => {
        showAssignDesignModal(this.dataset.designId);
      }, 500); // Small delay to allow the first modal to close
    });
  }
  
  // Update modal content
  const modalTitle = modal.querySelector('.modal-title');
  const modalImage = modal.querySelector('#previewDesignImage');
  const assignButton = modal.querySelector('#previewAssignBtn');
  
  modalTitle.textContent = `Design Preview: ${design.id.substring(0, 8)}...`;
  modalImage.src = design.url;
  modalImage.alt = `Design ${design.id}`;
  assignButton.dataset.designId = design.id;
  
  // Show the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// Function to update all assign-to-current-area buttons
function updateAssignToCurrentAreaButtons() {
  if (!window.selectedPrintAreaId) return;
  
  const allButtons = document.querySelectorAll('.assign-to-current-area');
  allButtons.forEach(button => {
    const designId = button.dataset.designId;
    const isAssigned = selectedDesigns[window.selectedPrintAreaId] === designId;
    
    if (isAssigned) {
      button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Assigned to Selected Area';
      button.classList.add('btn-success');
      button.classList.remove('btn-primary');
    } else {
      button.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Assign to Selected Area';
      button.classList.add('btn-primary');
      button.classList.remove('btn-success');
    }
  });
}

// Expose the function globally so app.js can call it
window.updateAssignToCurrentAreaButtons = updateAssignToCurrentAreaButtons;

// Assign a design to a specific print area
function assignDesignToPrintArea(designId, printAreaId) {
  console.log(`Assigning design ${designId} to print area ${printAreaId}`);
  
  // Store the assignment
  selectedDesigns[printAreaId] = designId;
  
  // Update the UI
  updatePrintAreaVisuals();
  updatePrintAreaDropdowns();
  updateAssignToCurrentAreaButtons();
  
  // Update the product preview if available
  updateProductPreview();
  
  // Enable the create product button if we have at least one design assigned
  updateCreateProductButton();
}

// Expose the assignDesignToPrintArea function to the window object
window.assignDesignToPrintArea = assignDesignToPrintArea;

// Remove all assignments for a specific design
function removeDesignAssignments(designId) {
  console.log(`Removing all assignments for design ${designId}`);
  
  // Find all print areas using this design
  Object.entries(selectedDesigns).forEach(([printAreaId, currentDesignId]) => {
    if (currentDesignId === designId) {
      delete selectedDesigns[printAreaId];
    }
  });
  
  // Update the UI
  updatePrintAreaVisuals();
  updatePrintAreaDropdowns();
  updateProductPreview();
  updateCreateProductButton();
}

// Update the visuals for all print areas
function updatePrintAreaVisuals() {
  // Find all print area containers
  const printAreaContainers = document.querySelectorAll('.print-area-container');
  
  printAreaContainers.forEach(container => {
    const printAreaId = container.dataset.printAreaId;
    if (!printAreaId) return;
    
    // Find the design preview element
    const designPreview = container.querySelector('.print-area-design-preview');
    if (!designPreview) return;
    
    // Check if this print area has a design assigned
    const assignedDesignId = selectedDesigns[printAreaId];
    if (assignedDesignId) {
      // Find the design in our gallery
      const design = designGallery.find(d => d.id === assignedDesignId);
      if (design) {
        // Update the preview
        designPreview.innerHTML = `
          <img src="${design.url}" class="img-fluid" alt="Assigned Design">
          <div class="mt-2 text-center">
            <span class="badge bg-success">Design Assigned</span>
            <button class="btn btn-sm btn-outline-danger ms-2 remove-design" data-print-area-id="${printAreaId}">
              Remove
            </button>
          </div>
        `;
        
        // Add event listener for remove button
        const removeBtn = designPreview.querySelector('.remove-design');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            delete selectedDesigns[printAreaId];
            updatePrintAreaVisuals();
            updatePrintAreaDropdowns();
            updateProductPreview();
            updateCreateProductButton();
          });
        }
      }
    } else {
      // No design assigned, show empty state
      designPreview.innerHTML = `
        <div class="text-center p-3 border rounded">
          <p class="text-muted mb-2">No design assigned</p>
          <button type="button" class="btn btn-sm btn-outline-primary select-design-btn" data-print-area-id="${printAreaId}">
            Select Design
          </button>
        </div>
      `;
      
      // Add event listener for select design button
      const selectBtn = designPreview.querySelector('.select-design-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', function(event) {
          // Prevent default behavior to avoid page refresh
          event.preventDefault();
          // Only stop propagation for form elements
          if (event.target.form) {
            event.stopPropagation();
          }
          
          console.log('Design button clicked in design-gallery.js');
          // Scroll to design gallery
          const designGallery = document.querySelector('#designGallerySection #designGallery');
          if (designGallery) {
            designGallery.scrollIntoView({ behavior: 'smooth' });
          }
          
          // Highlight the print area being selected for
          highlightPrintArea(printAreaId);
        });
      }
    }
  });
}

// Highlight a print area to show it's being selected for
function highlightPrintArea(printAreaId) {
  // Remove highlight from all print areas
  document.querySelectorAll('.print-area-container').forEach(container => {
    container.classList.remove('highlight-print-area');
  });
  
  // Add highlight to the selected print area
  const printAreaContainer = document.querySelector(`.print-area-container[data-print-area-id="${printAreaId}"]`);
  if (printAreaContainer) {
    printAreaContainer.classList.add('highlight-print-area');
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      printAreaContainer.classList.remove('highlight-print-area');
    }, 3000);
  }
}

// Preview a design in the modal
function previewDesign(designId) {
  const design = designGallery.find(d => d.id === designId);
  if (!design) return;
  
  const previewModal = document.getElementById('designPreviewModal');
  const previewImage = document.getElementById('previewImage');
  
  if (previewModal && previewImage) {
    previewImage.src = design.url;
    previewImage.alt = `Design ${designId}`;
    
    // Update the use this design button
    const useThisDesignBtn = document.getElementById('useThisDesignBtn');
    if (useThisDesignBtn) {
      useThisDesignBtn.dataset.designId = designId;
      
      // Update the click handler
      useThisDesignBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.preventDefault();
        event.stopPropagation();

        // If we have a selected print area, assign this design to it
        const highlightedPrintArea = document.querySelector('.highlight-print-area');
        if (highlightedPrintArea) {
          const printAreaId = highlightedPrintArea.dataset.printAreaId;
          if (printAreaId) {
            assignDesignToPrintArea(designId, printAreaId);
          }
        }
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(previewModal);
        if (modal) {
          modal.hide();
        }
      };
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(previewModal);
    modal.show();
  }
}

// Update the product preview with assigned designs
function updateProductPreview() {
  const previewContainer = document.getElementById('productPreview');
  if (!previewContainer) return;
  
  // Check if we have any designs assigned
  const hasAssignedDesigns = Object.keys(selectedDesigns).length > 0;
  
  if (hasAssignedDesigns) {
    // Show the preview with assigned designs
    previewContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h5>Product Preview</h5>
        </div>
        <div class="card-body text-center">
          <div class="product-preview-image position-relative">
            <!-- Base product image would go here -->
            <img src="${selectedBlueprintImageUrl || 'https://placehold.co/400x500/EFEFEF/999999?text=Product+Preview'}" class="img-fluid" alt="Product Preview">
            
            <!-- Overlay designs on their respective print areas -->
            ${Object.entries(selectedDesigns).map(([printAreaId, designId]) => {
              const design = designGallery.find(d => d.id === designId);
              const printArea = printAreas.find(p => p.id === printAreaId);
              
              if (!design || !printArea) return '';
              
              // Calculate position and size based on print area data
              const scale = 100; // Using 100 for percentage-based positioning
              const left = (printArea.placeholders[0].position.x / 5100) * scale;
              const top = (printArea.placeholders[0].position.y / 5100) * scale;
              const width = (4500 / 5100) * scale;

              const positionStyle = `
                left: ${left}%; 
                top: ${top}%; 
                width: ${width}%; 
                position: absolute;
              `;

              return `
                <div style="${positionStyle}">
                  <img src="${design.url}" class="img-fluid" alt="Design on ${printArea.title || printArea.id}">
                </div>
              `;
            }).join('')}
          </div>
          <p class="mt-3">This is a preview of your product with selected designs.</p>
        </div>
      </div>
    `;
  } else {
    // Show empty state
    previewContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h5>Product Preview</h5>
        </div>
        <div class="card-body text-center">
          <p class="text-muted">Assign designs to print areas to see a preview</p>
        </div>
      </div>
    `;
  }
}

// Update the create product button based on design selections
function updateCreateProductButton() {
  const createProductBtn = document.getElementById('createProductBtn');
  if (!createProductBtn) return;
  
  // Enable button if we have at least one design assigned
  const hasAssignedDesigns = Object.keys(selectedDesigns).length > 0;
  
  if (hasAssignedDesigns) {
    createProductBtn.disabled = false;
    createProductBtn.textContent = 'Create Product';
    createProductBtn.classList.remove('btn-secondary');
    createProductBtn.classList.add('btn-primary');
  } else {
    createProductBtn.disabled = true;
    createProductBtn.textContent = 'Assign designs first';
    createProductBtn.classList.remove('btn-primary');
    createProductBtn.classList.add('btn-secondary');
  }
}
