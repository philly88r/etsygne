// Functions for handling modal interactions
console.log('Modal functions script loaded successfully');

// Add event listener for the modal generate button when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up modal event listeners');
  const modalGenerateBtn = document.getElementById('modalGenerateDesignBtn');
  if (modalGenerateBtn) {
    console.log('Modal generate button found, adding event listener');
    modalGenerateBtn.addEventListener('click', function(event) {
      event.preventDefault();
      console.log('Modal generate button clicked');
      generateDesignForPrintArea();
    });
  } else {
    console.error('Modal generate button not found');
  }
});

/**
 * Generates a design for a specific print area from the modal
 */
window.generateDesignForPrintArea = async function() {
  console.log('generateDesignForPrintArea function called');

  const promptInput = document.getElementById('modalDesignPrompt');
  const generationStatus = document.getElementById('modalGenerationStatus');
  const designSelectionContainer = document.getElementById('designSelectionContainer');
  
  if (!promptInput || !promptInput.value.trim()) {
    generationStatus.innerHTML = '<div class="alert alert-danger">Please enter a design description</div>';
    return;
  }
  
  try {
    // Show loading state
    generationStatus.innerHTML = '<div class="alert alert-info">Generating designs, please wait...</div>';
    designSelectionContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Get the prompt value
    const prompt = promptInput.value.trim();
    console.log('Modal: Generating designs with prompt:', prompt);

    // Get the selected print area dimensions if available
    let width, height;
    let printAreaId = window.selectedPrintAreaId;
    console.log('Modal: Selected print area ID:', printAreaId);

    // Method 1: Use our new utility function if available
    if (printAreaId && window.getPrintAreaDimensions) {
      console.log('Attempting to get dimensions using getPrintAreaDimensions utility...');
      const dimensions = await window.getPrintAreaDimensions(printAreaId);
      if (dimensions && dimensions.width && dimensions.height) {
        width = dimensions.width;
        height = dimensions.height;
        console.log(`SUCCESS: Using dimensions from API utility: ${width}x${height} for area ${printAreaId}`);
      } else {
        console.log('Failed to get dimensions from getPrintAreaDimensions utility');
      }
    }
    
    // Method 2: Try to get dimensions from the print areas array (fallback)
    if ((!width || !height) && printAreaId && window.printAreas) {
      console.log('Attempting to get dimensions from window.printAreas...');
      const selectedArea = window.printAreas.find(area => area.id === printAreaId);
      if (selectedArea && selectedArea.width && selectedArea.height) {
        width = selectedArea.width;
        height = selectedArea.height;
        console.log(`SUCCESS: Using dimensions from print areas array: ${width}x${height} for area ${printAreaId}`);
      } else {
        console.log('Failed to get dimensions from window.printAreas');
      }
    }
    
    // Method 3: Try to get dimensions from the selectedProduct object (another fallback)
    if ((!width || !height) && printAreaId && window.selectedProduct) {
      console.log('Attempting to get dimensions from window.selectedProduct...');
      if (window.selectedProduct.placeholders) {
        const placeholder = window.selectedProduct.placeholders.find(p => p.id === printAreaId || p.position === printAreaId);
        if (placeholder && placeholder.width && placeholder.height) {
          width = placeholder.width;
          height = placeholder.height;
          console.log(`SUCCESS: Using dimensions from selectedProduct placeholders: ${width}x${height} for area ${printAreaId}`);
        } else {
          console.log('Failed to get dimensions from window.selectedProduct.placeholders');
        }
      }
    }

    // Final check - if we still don't have valid dimensions, show an error
    if (!width || !height || width === 0 || height === 0) {
      console.error('ERROR: Failed to retrieve valid print area dimensions');
      generationStatus.innerHTML = '<div class="alert alert-danger">Unable to determine print area dimensions. Please try again or select a different print area.</div>';
      designSelectionContainer.innerHTML = '';
      return;
    }
    
    // Log the final dimensions being sent to the API
    console.log(`FINAL DIMENSIONS: Sending ${width}x${height} to generate-image endpoint`);
    
    // Make API call to generate designs with the correct dimensions
    const response = await fetch('/.netlify/functions/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        numImages: 4,
        width,
        height,
        printAreaId
      })
    });
    
    const data = await response.json();
    console.log('Modal: Design generation response:', data);
    
    if (data.success && data.images && data.images.length > 0) {
      // Store the generated designs in the global variable with print area dimensions
      window.generatedDesigns = data.images.map(img => ({
        url: img.url,
        name: img.name,
        originalUrl: img.url,
        printAreaContext: {
          id: printAreaId,
          width: width,
          height: height
        }
      }));
      
      // Clear the container
      designSelectionContainer.innerHTML = '';
      
      // Display the designs in the modal with dimensions
      window.generatedDesigns.forEach((design, index) => {
        const designCard = document.createElement('div');
        designCard.className = 'col-md-6 mb-3';
        designCard.innerHTML = `
          <div class="card h-100 design-card" data-design-index="${index}">
            <div class="position-relative">
              <img src="${design.url}" class="card-img-top" alt="Generated Design">
              <span class="position-absolute top-0 end-0 badge bg-secondary m-2">
                ${design.printAreaContext.width || 'auto'}×${design.printAreaContext.height || 'auto'}
              </span>
            </div>
            <div class="card-body">
              <button class="btn btn-sm btn-primary w-100 select-design-btn" data-design-id="${design.name}">Select This Design</button>
            </div>
          </div>
        `;
        designSelectionContainer.appendChild(designCard);
      });
      
      // Add event listeners to the select buttons
      const selectButtons = document.querySelectorAll('.select-design-btn');
      selectButtons.forEach(button => {
        button.addEventListener('click', function(event) {
          event.preventDefault();
          // Only stop propagation for form elements
          if (event.target.form) {
            event.stopPropagation();
          }
          
          console.log('Design button clicked in modal-functions.js');
          const designId = this.getAttribute('data-design-id');
          const design = window.generatedDesigns.find(d => d.name === designId);
          
          if (design && window.selectedPrintAreaId) {
            console.log('Selected design for print area:', design, window.selectedPrintAreaId);
            
            // Assign this design to the selected print area
            // Use the main app's assignedDesigns object if available
            if (typeof window.assignedDesigns === 'object') {
              window.assignedDesigns[window.selectedPrintAreaId] = {
                url: design.url,
                originalUrl: design.originalUrl || design.url,
                id: design.name,
                position: 'front'
              };
            }
            
            // Propagate selected design globals for compatibility
            window.selectedDesignUrl = design.url;
            window.selectedDesignOriginalUrl = design.originalUrl || design.url;
            window.selectedDesignId = design.name;
            
            // Persist state
            if (typeof window.saveStateToStorage === 'function') {
              window.saveStateToStorage();
            }
            
            // Update UI if these functions exist
            if (typeof window.updatePrintAreaDropdowns === 'function') {
              window.updatePrintAreaDropdowns();
            }
            if (typeof window.updateProductPreview === 'function') {
              window.updateProductPreview();
            }
            if (typeof window.updateCreateProductButton === 'function') {
              window.updateCreateProductButton();
            }
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('designSelectionModal'));
            if (modal) {
              modal.hide();
            }
          } else {
            console.error('Missing design or selectedPrintAreaId:', { design, selectedPrintAreaId: window.selectedPrintAreaId });
          }
        });
      });
      
      generationStatus.innerHTML = '<div class="alert alert-success">Designs generated successfully! Select one for this print area.</div>';
      return window.generatedDesigns;
    } else {
      console.error('Failed to generate designs:', data.message || 'Unknown error');
      generationStatus.innerHTML = '<div class="alert alert-danger">Failed to generate designs. Please try again.</div>';
      designSelectionContainer.innerHTML = '';
      return [];
    }
  } catch (error) {
    console.error('Error generating design for print area:', error);
    generationStatus.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    designSelectionContainer.innerHTML = '';
    return [];
  }
}
