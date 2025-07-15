/**
 * Publish Product Functionality
 * Handles the publishing of products with assigned designs
 */

/**
 * Create the publish button if it doesn't exist
 */
function createPublishButton() {
  // Check if the button already exists
  if (document.getElementById('publishProductBtn')) return;
  
  console.log('Creating publish button');
  
  // Find a suitable container for the publish button
  const designGallerySection = document.getElementById('designGallerySection');
  const productPreviewContainer = document.getElementById('productPreviewContainer');
  const targetContainer = designGallerySection || productPreviewContainer || document.querySelector('.container');
  
  if (!targetContainer) {
    console.error('No suitable container found for publish button');
    return;
  }
  
  // Create the publish button container
  const publishContainer = document.createElement('div');
  publishContainer.className = 'publish-container mt-4 p-3 bg-light rounded border';
  publishContainer.innerHTML = `
    <h4 class="mb-3"><i class="bi bi-cloud-upload me-2"></i>Publish Your Product</h4>
    <div id="publishInfo" class="alert alert-info small">
      <i class="bi bi-info-circle-fill me-2"></i>Assign designs to all print areas to enable publishing
    </div>
    <button id="publishProductBtn" class="btn btn-success btn-lg w-100" disabled>
      <i class="bi bi-cloud-upload me-2"></i>Publish Product
    </button>
  `;
  
  // Add the publish container to the page
  targetContainer.appendChild(publishContainer);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing publish product functionality');
  initializePublishButton();
  
  // Expose functions globally
  window.publishProductUpdateButtonState = updatePublishButtonState;
});

/**
 * Initialize the publish button functionality
 */
function initializePublishButton() {
  const publishBtn = document.getElementById('publishProductBtn');
  const publishInfo = document.getElementById('publishInfo');
  
  if (!publishBtn) {
    console.log('Publish button not found, creating it');
    createPublishButton();
    return initializePublishButton(); // Try again after creating
  }
  
  publishBtn.addEventListener('click', handlePublishProduct);
  
  // Initial button state update
  updatePublishButtonState();
  
  // Listen for design assignment changes
  document.addEventListener('designAssignmentChanged', () => {
    console.log('Design assignment changed, updating publish button state');
    updatePublishButtonState();
  });
  
  // Also listen for product selection changes
  document.addEventListener('productSelected', () => {
    console.log('Product selected, updating publish button state');
    updatePublishButtonState();
  });
}

/**
 * Update the publish button state based on design assignments
 */
function updatePublishButtonState() {
  const publishBtn = document.getElementById('publishProductBtn');
  const publishInfo = document.getElementById('publishInfo');
  
  if (!publishBtn || !publishInfo) {
    console.log('Publish button or info element not found');
    return;
  }
  
  // Get print areas and assignments
  const printAreas = getPrintAreas();
  const designAssignments = window.designAssignments || {};
  
  console.log('Updating publish button state with:', { 
    printAreas: printAreas.length, 
    designAssignments: Object.keys(designAssignments).length 
  });
  
  if (!printAreas || printAreas.length === 0) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Select Product First';
    publishInfo.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Select a product to see available print areas';
    publishInfo.className = 'alert alert-info small';
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

/**
 * Get print areas from the product data
 * @returns {Array} Array of print areas
 */
function getPrintAreas() {
  // Check multiple possible sources for print area data
  let printAreas = [];
  
  if (window.currentBlueprintData && window.currentBlueprintData.print_areas) {
    printAreas = window.currentBlueprintData.print_areas;
  } else if (window.printAreas) {
    printAreas = window.printAreas;
  } else if (window.selectedProduct && window.selectedProduct.print_areas) {
    printAreas = window.selectedProduct.print_areas;
  }
  
  console.log('Retrieved print areas:', printAreas);
  return printAreas;
}

/**
 * Handle the publish product button click
 */
async function handlePublishProduct() {
  const publishBtn = document.getElementById('publishProductBtn');
  const publishInfo = document.getElementById('publishInfo');
  
  if (!publishBtn || !publishInfo) return;
  
  // Disable button and show loading state
  publishBtn.disabled = true;
  publishBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Publishing...';
  publishInfo.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Publishing product, please wait...';
  publishInfo.className = 'alert alert-info small';
  
  try {
    // Get necessary data
    const designAssignments = window.designAssignments || {};
    const designGallery = window.designGallery || [];
    const selectedProduct = window.selectedProduct || {};
    const selectedBlueprint = window.selectedBlueprint || {};
    const selectedVariant = window.selectedVariant || {};
    
    // Validate required data
    if (!selectedProduct.id || !selectedBlueprint.id || !selectedVariant.id) {
      throw new Error('Missing product, blueprint, or variant information');
    }
    
    // Prepare the product data
    const productData = {
      blueprint_id: selectedBlueprint.id,
      print_provider_id: selectedProduct.print_provider_id,
      variant_id: selectedVariant.id,
      print_areas: Object.entries(designAssignments).map(([areaId, designId]) => {
        const design = designGallery.find(d => d.id === designId);
        if (!design) return null;
        
        return {
          id: areaId,
          design_id: designId,
          image_url: design.url,
          position: design.printAreaContext?.position || 'center'
        };
      }).filter(Boolean)
    };
    
    // Send the publish request
    const response = await fetch('/.netlify/functions/publish-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to publish product');
    }
    
    const data = await response.json();
    
    // Show success message
    publishBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Published Successfully';
    publishBtn.className = 'btn btn-success btn-lg';
    publishInfo.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>Product published successfully! Product ID: ${data.product_id}`;
    publishInfo.className = 'alert alert-success small';
    
    // Show success modal
    showPublishSuccessModal(data.product_id, data.preview_url);
    
  } catch (error) {
    console.error('Error publishing product:', error);
    
    // Show error message
    publishBtn.disabled = false;
    publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Try Again';
    publishInfo.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>Error: ${error.message || 'Failed to publish product'}`;
    publishInfo.className = 'alert alert-danger small';
  }
}

/**
 * Show a success modal after publishing
 * @param {string} productId - The published product ID
 * @param {string} previewUrl - URL to preview the published product
 */
function showPublishSuccessModal(productId, previewUrl) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('publishSuccessModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'publishSuccessModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'publishSuccessModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title" id="publishSuccessModalLabel">
              <i class="bi bi-check-circle me-2"></i>Product Published!
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-4">
              <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
              <h4 class="mt-3">Success!</h4>
              <p>Your product has been published successfully.</p>
            </div>
            <div class="mb-3">
              <label class="form-label">Product ID</label>
              <input type="text" class="form-control" id="publishedProductId" readonly>
            </div>
            <div id="previewUrlContainer" class="d-none">
              <label class="form-label">Preview URL</label>
              <div class="input-group mb-3">
                <input type="text" class="form-control" id="publishedPreviewUrl" readonly>
                <button class="btn btn-outline-primary" type="button" id="openPreviewBtn">
                  <i class="bi bi-box-arrow-up-right"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="createNewProductBtn">
              <i class="bi bi-plus-circle me-2"></i>Create New Product
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  // Update modal content
  const productIdInput = modal.querySelector('#publishedProductId');
  if (productIdInput) {
    productIdInput.value = productId;
  }
  
  const previewUrlContainer = modal.querySelector('#previewUrlContainer');
  const previewUrlInput = modal.querySelector('#publishedPreviewUrl');
  const openPreviewBtn = modal.querySelector('#openPreviewBtn');
  
  if (previewUrl && previewUrlContainer && previewUrlInput) {
    previewUrlContainer.classList.remove('d-none');
    previewUrlInput.value = previewUrl;
    
    if (openPreviewBtn) {
      openPreviewBtn.addEventListener('click', () => {
        window.open(previewUrl, '_blank');
      });
    }
  } else if (previewUrlContainer) {
    previewUrlContainer.classList.add('d-none');
  }
  
  // Add event listener for create new product button
  const createNewBtn = modal.querySelector('#createNewProductBtn');
  if (createNewBtn) {
    // Remove any existing event listeners
    const newCreateNewBtn = createNewBtn.cloneNode(true);
    createNewBtn.parentNode.replaceChild(newCreateNewBtn, createNewBtn);
    
    // Add new event listener
    newCreateNewBtn.addEventListener('click', () => {
      // Reset the form and UI
      const form = document.getElementById('productForm');
      if (form) {
        form.reset();
      }
      
      // Clear design assignments
      window.designAssignments = {};
      
      // Clear design gallery
      window.designGallery = [];
      
      // Hide design gallery section
      const designGallerySection = document.getElementById('designGallerySection');
      if (designGallerySection) {
        designGallerySection.style.display = 'none';
      }
      
      // Reset publish button
      const publishBtn = document.getElementById('publishProductBtn');
      if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Publish Product';
        publishBtn.className = 'btn btn-success btn-lg';
      }
      
      // Close the modal
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) {
        bsModal.hide();
      }
    });
  }
  
  // Initialize and show the modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}
