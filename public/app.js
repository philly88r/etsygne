// Global variables
let printifyApiKey = '';
let selectedShopId = '';
let selectedDesignUrl = '';
let selectedDesignId = '';
let currentProduct = null;
let blueprintData = {};
let printAreas = {};

// API base URL - dynamically set based on environment
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? `http://${window.location.hostname}:${window.location.port}/api` 
  : '/api';

// DOM Elements
const apiKeyInput = document.getElementById('printifyApiKey');
const verifyApiKeyBtn = document.getElementById('verifyApiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const shopSelectionSection = document.getElementById('shopSelectionSection');
const shopSelect = document.getElementById('shopSelect');
const mainContent = document.getElementById('mainContent');
const generateDesignBtn = document.getElementById('generateDesignBtn');
const designPrompt = document.getElementById('designPrompt');
const generationStatus = document.getElementById('generationStatus');
const generatedDesigns = document.getElementById('generatedDesigns');
const refreshProductsBtn = document.getElementById('refreshProductsBtn');
const productsList = document.getElementById('productsList');
const productsLoading = document.getElementById('productsLoading');
const blueprintSelect = document.getElementById('blueprintSelect');
const providerSelect = document.getElementById('providerSelect');
const variantsList = document.getElementById('variantsList');
const printAreasList = document.getElementById('printAreasList');
const createProductForm = document.getElementById('createProductForm');
const selectedDesignContainer = document.getElementById('selectedDesignContainer');
const previewImage = document.getElementById('previewImage');
const useThisDesignBtn = document.getElementById('useThisDesignBtn');
const publishProductBtn = document.getElementById('publishProductBtn');

// Bootstrap Modal instances
const designPreviewModal = new bootstrap.Modal(document.getElementById('designPreviewModal'));
const productCreatedModal = new bootstrap.Modal(document.getElementById('productCreatedModal'));

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check for stored API key
  const storedApiKey = localStorage.getItem('printifyApiKey');
  if (storedApiKey) {
    apiKeyInput.value = storedApiKey;
    verifyApiKey();
  }
  
  // Setup event listeners
  verifyApiKeyBtn.addEventListener('click', verifyApiKey);
  shopSelect.addEventListener('change', handleShopSelection);
  generateDesignBtn.addEventListener('click', generateDesign);
  refreshProductsBtn.addEventListener('click', loadProducts);
  blueprintSelect.addEventListener('change', handleBlueprintSelection);
  providerSelect.addEventListener('change', loadVariants);
  createProductForm.addEventListener('submit', handleProductCreation);
  useThisDesignBtn.addEventListener('click', useSelectedDesign);
  publishProductBtn.addEventListener('click', publishProduct);
  
  // Tab change listeners
  document.getElementById('products-tab').addEventListener('click', () => {
    if (selectedShopId) loadProducts();
  });
  
  document.getElementById('create-tab').addEventListener('click', () => {
    if (selectedShopId && !blueprintSelect.options.length) loadBlueprints();
  });
});

// API Key Verification
async function verifyApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showApiKeyStatus('Please enter your Printify API key', 'danger');
    return;
  }
  
  showApiKeyStatus('Verifying API key...', 'info');
  
  try {
    const response = await fetch(`${API_BASE}/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: apiKey })
    });
    
    const data = await response.json();
    
    if (data.success) {
      printifyApiKey = apiKey;
      localStorage.setItem('printifyApiKey', apiKey);
      showApiKeyStatus('API key verified successfully!', 'success');
      
      // Populate shops dropdown
      populateShops(data.shops);
      
      // Show shop selection section
      shopSelectionSection.style.display = 'block';
    } else {
      showApiKeyStatus('Invalid API key. Please check and try again.', 'danger');
    }
  } catch (error) {
    console.error('Error verifying API key:', error);
    showApiKeyStatus('Error verifying API key. Please try again.', 'danger');
  }
}

// Show API Key Status
function showApiKeyStatus(message, type) {
  apiKeyStatus.innerHTML = `<div class="alert alert-${type} mb-0 py-2">${message}</div>`;
}

// Populate Shops Dropdown
function populateShops(shops) {
  shopSelect.innerHTML = '<option selected disabled>Choose a shop...</option>';
  
  shops.forEach(shop => {
    const option = document.createElement('option');
    option.value = shop.id;
    option.textContent = shop.title;
    shopSelect.appendChild(option);
  });
}

// Handle Shop Selection
function handleShopSelection() {
  selectedShopId = shopSelect.value;
  if (selectedShopId) {
    mainContent.style.display = 'block';
    loadProducts();
    loadBlueprints();
  }
}

// Generate Design with Google Imagen 4
async function generateDesign() {
  const prompt = designPrompt.value.trim();
  if (!prompt) {
    generationStatus.innerHTML = '<div class="alert alert-danger">Please enter a design description</div>';
    return;
  }
  
  generationStatus.innerHTML = '<div class="d-flex align-items-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Generating designs...</div>';
  generateDesignBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    if (data.success || data.images) {
      generationStatus.innerHTML = '<div class="alert alert-success">Designs generated successfully!</div>';
      displayGeneratedDesigns(data.images || []);
    } else {
      generationStatus.innerHTML = `<div class="alert alert-danger">Error: ${data.message || data.error || 'Unknown error'}</div>`;
    }
  } catch (error) {
    console.error('Error generating designs:', error);
    generationStatus.innerHTML = '<div class="alert alert-danger">Error generating designs. Please try again.</div>';
  } finally {
    generateDesignBtn.disabled = false;
  }
}

// Display Generated Designs
function displayGeneratedDesigns(images) {
  generatedDesigns.innerHTML = '';
  
  images.forEach((imageUrl, index) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-3 col-sm-6';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card design-card';
    cardDiv.onclick = () => previewDesign(imageUrl);
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'design-img-container';
    
    const img = document.createElement('img');
    img.className = 'design-img';
    img.src = imageUrl;
    img.alt = `Generated Design ${index + 1}`;
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body text-center';
    
    const title = document.createElement('h6');
    title.className = 'card-title mb-0';
    title.textContent = `Design ${index + 1}`;
    
    imgContainer.appendChild(img);
    cardBody.appendChild(title);
    cardDiv.appendChild(imgContainer);
    cardDiv.appendChild(cardBody);
    colDiv.appendChild(cardDiv);
    
    generatedDesigns.appendChild(colDiv);
  });
}

// Preview Design
function previewDesign(imageUrl) {
  previewImage.src = imageUrl;
  selectedDesignUrl = imageUrl;
  designPreviewModal.show();
}

// Use Selected Design
function useSelectedDesign() {
  if (!selectedDesignUrl) return;
  
  selectedDesignContainer.innerHTML = `
    <img src="${selectedDesignUrl}" alt="Selected Design" class="img-fluid mb-3">
    <div class="d-grid">
      <button class="btn btn-outline-secondary btn-sm" onclick="changeDesign()">Change Design</button>
    </div>
  `;
  
  // Switch to Create Product tab
  document.getElementById('create-tab').click();
  
  designPreviewModal.hide();
  
  // Upload the design to Printify
  uploadDesignToPrintify();
}

// Change Design
function changeDesign() {
  document.getElementById('generate-tab').click();
  selectedDesignContainer.innerHTML = '<p class="text-muted">No design selected. Generate or select a design from the Generate Design tab.</p>';
  selectedDesignId = '';
}

// Upload Design to Printify
async function uploadDesignToPrintify() {
  if (!selectedDesignUrl || !printifyApiKey) return;
  
  try {
    // Extract filename from URL
    const urlParts = selectedDesignUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Fetch the image data
    const imgResponse = await fetch(selectedDesignUrl);
    const blob = await imgResponse.blob();
    
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    reader.onloadend = async () => {
      const base64data = reader.result;
      
      try {
        const response = await fetch(`${API_BASE}/images/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${printifyApiKey}`
          },
          body: JSON.stringify({
            fileName,
            imageData: base64data
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          selectedDesignId = data.image.id;
          console.log('Design uploaded successfully:', data.image);
        } else {
          console.error('Error uploading design:', data.message);
        }
      } catch (error) {
        console.error('Error uploading design to Printify:', error);
      }
    };
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

// Load Products
async function loadProducts() {
  if (!selectedShopId || !printifyApiKey) return;
  
  productsLoading.style.display = 'block';
  productsList.innerHTML = '';
  
  try {
    const response = await fetch(`${API_BASE}/shops/${selectedShopId}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayProducts(data.products.data);
    } else {
      productsList.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error: ${data.message}</div></div>`;
    }
  } catch (error) {
    console.error('Error loading products:', error);
    productsList.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again.</div></div>';
  } finally {
    productsLoading.style.display = 'none';
  }
}

// Display Products
function displayProducts(products) {
  if (!products || products.length === 0) {
    productsList.innerHTML = '<div class="col-12"><div class="alert alert-info">No products found. Create your first product in the Create Product tab.</div></div>';
    return;
  }
  
  productsList.innerHTML = '';
  
  products.forEach(product => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-4 col-sm-6';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card product-card';
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'product-img-container';
    
    const img = document.createElement('img');
    img.className = 'product-img';
    img.src = product.images[0]?.src || 'https://via.placeholder.com/300?text=No+Image';
    img.alt = product.title;
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = product.title;
    
    const description = document.createElement('p');
    description.className = 'card-text';
    description.textContent = product.description || 'No description';
    
    const status = document.createElement('p');
    status.className = `badge ${product.is_locked ? 'bg-warning' : 'bg-success'}`;
    status.textContent = product.is_locked ? 'Draft' : 'Published';
    
    const viewBtn = document.createElement('a');
    viewBtn.className = 'btn btn-sm btn-outline-primary';
    viewBtn.href = `https://printify.com/app/shop/${selectedShopId}/products/${product.id}`;
    viewBtn.target = '_blank';
    viewBtn.textContent = 'View in Printify';
    
    imgContainer.appendChild(img);
    cardBody.appendChild(title);
    cardBody.appendChild(description);
    cardBody.appendChild(status);
    cardBody.appendChild(document.createElement('br'));
    cardBody.appendChild(viewBtn);
    
    cardDiv.appendChild(imgContainer);
    cardDiv.appendChild(cardBody);
    colDiv.appendChild(cardDiv);
    
    productsList.appendChild(colDiv);
  });
}

// Load Blueprints (Product Types)
async function loadBlueprints() {
  if (!printifyApiKey) return;
  
  document.getElementById('blueprintLoading').style.display = 'block';
  blueprintSelect.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/catalog/blueprints`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      populateBlueprints(data.blueprints);
    } else {
      console.error('Error loading blueprints:', data.message);
    }
  } catch (error) {
    console.error('Error loading blueprints:', error);
  } finally {
    document.getElementById('blueprintLoading').style.display = 'none';
    blueprintSelect.disabled = false;
  }
}

// Populate Blueprints Dropdown
function populateBlueprints(blueprints) {
  blueprintSelect.innerHTML = '<option selected disabled value="">Choose a product type...</option>';
  
  blueprints.forEach(blueprint => {
    // Store blueprint data for later use
    blueprintData[blueprint.id] = blueprint;
    
    const option = document.createElement('option');
    option.value = blueprint.id;
    option.textContent = blueprint.title;
    blueprintSelect.appendChild(option);
  });
}

// Handle Blueprint Selection
async function handleBlueprintSelection() {
  const blueprintId = blueprintSelect.value;
  if (!blueprintId) return;
  
  // Reset dependent fields
  providerSelect.innerHTML = '<option selected disabled value="">Loading providers...</option>';
  providerSelect.disabled = true;
  variantsList.innerHTML = '<p class="text-muted">Select a print provider to see available variants</p>';
  
  // Get print areas for this blueprint
  const blueprint = blueprintData[blueprintId];
  if (blueprint && blueprint.print_areas) {
    printAreas = blueprint.print_areas;
    displayPrintAreas(blueprint.print_areas);
  }
  
  document.getElementById('providerLoading').style.display = 'block';
  
  try {
    const response = await fetch(`${API_BASE}/catalog/blueprints/${blueprintId}/print_providers`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // The backend returns 'providers' not 'printProviders'
      populatePrintProviders(data.providers);
    } else {
      console.error('Error loading print providers:', data.message);
    }
  } catch (error) {
    console.error('Error loading print providers:', error);
  } finally {
    document.getElementById('providerLoading').style.display = 'none';
  }
}

// Populate Print Providers Dropdown
function populatePrintProviders(providers) {
  providerSelect.innerHTML = '<option selected disabled value="">Choose a print provider...</option>';
  providerSelect.disabled = false;
  
  providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = provider.title;
    providerSelect.appendChild(option);
  });
}

// Display Print Areas
function displayPrintAreas(placeholders) {
  printAreasList.innerHTML = '';
  
  if (!placeholders || placeholders.length === 0) {
    printAreasList.innerHTML = '<p class="text-muted">No print areas available for this product type</p>';
    return;
  }
  
  console.log('Placeholders data:', placeholders);
  
  // Process placeholders from Printify API
  placeholders.forEach((placeholder, index) => {
    // Get position from any possible property
    const position = placeholder.position || placeholder.placement || `area-${index}`;
    // Get ID from any possible property
    const areaId = placeholder.id || placeholder.placeholder_id || placeholder.print_area_id || position;
    
    if (!position) {
      console.log('Skipping placeholder without position:', placeholder);
      return;
    }
    
    const areaDiv = document.createElement('div');
    areaDiv.className = 'print-area-item card mb-3 p-2';
    areaDiv.dataset.areaId = areaId;
    areaDiv.dataset.position = position;
    
    // Make the entire area clickable for selection
    areaDiv.style.cursor = 'pointer';
    areaDiv.onclick = () => selectPrintArea(areaId, position, areaDiv);
    
    // Capitalize the first letter of the position (e.g., "front" -> "Front")
    const areaTitle = document.createElement('h6');
    areaTitle.textContent = position.charAt(0).toUpperCase() + position.slice(1);
    
    const areaDescription = document.createElement('p');
    areaDescription.className = 'text-muted small';
    
    // Show dimensions if available
    if (placeholder.width && placeholder.height) {
      areaDescription.textContent = `Size: ${placeholder.width}x${placeholder.height} px`;
    } else {
      areaDescription.textContent = 'Print area dimensions will be determined by the product';
    }
    
    // Create a selection indicator
    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'selection-indicator';
    selectionIndicator.innerHTML = '<span class="badge bg-primary d-none">Selected</span>';
    
    // Create container for the content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'card-body p-2';
    
    contentDiv.appendChild(areaTitle);
    contentDiv.appendChild(areaDescription);
    contentDiv.appendChild(selectionIndicator);
    
    // Add a design indicator to show if a design is assigned
    const designIndicator = document.createElement('div');
    designIndicator.className = 'design-indicator d-none mt-2';
    designIndicator.innerHTML = '<div class="alert alert-success py-1 px-2 mb-0"><i class="bi bi-check-circle-fill"></i> Design assigned</div>';
    contentDiv.appendChild(designIndicator);
    
    areaDiv.appendChild(contentDiv);
    printAreasList.appendChild(areaDiv);
  });
  
  // If no print areas were displayed, show a message
  if (printAreasList.children.length === 0) {
    printAreasList.innerHTML = '<div class="alert alert-warning">No valid print areas found for this product.</div>';
  }
}

// Select Print Area
function selectPrintArea(areaId, position, clickedElement) {
  // Update the global selected print area ID
  selectedPrintAreaId = areaId;
  console.log(`Selected print area: ${areaId}, position: ${position}`);
  
  // Update UI to show selection
  const allAreas = document.querySelectorAll('.print-area-item');
  allAreas.forEach(area => {
    area.classList.remove('border-primary');
    const badge = area.querySelector('.selection-indicator .badge');
    if (badge) badge.classList.add('d-none');
  });
  
  // Highlight the selected area
  clickedElement.classList.add('border-primary');
  const badge = clickedElement.querySelector('.selection-indicator .badge');
  if (badge) badge.classList.remove('d-none');
  
  // If we have a design selected, show assign button
  if (selectedDesignUrl) {
    const assignBtn = document.createElement('button');
    assignBtn.className = 'btn btn-primary btn-sm mt-2';
    assignBtn.textContent = 'Assign Current Design';
    assignBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent triggering the parent click event
      assignDesignToPrintArea(areaId, position, clickedElement);
    };
    
    // Remove any existing assign button
    const existingBtn = clickedElement.querySelector('.assign-design-btn');
    if (existingBtn) existingBtn.remove();
    
    // Add the new button
    assignBtn.classList.add('assign-design-btn');
    clickedElement.querySelector('.card-body').appendChild(assignBtn);
  }
}

// Assign Design to Print Area
function assignDesignToPrintArea(areaId, position, element) {
  if (!selectedDesignUrl) {
    alert('Please select a design first');
    return;
  }
  
  console.log(`Assigning design to print area: ${areaId}, position: ${position}`);
  
  // Find the element if not provided
  if (!element) {
    const areaElements = document.querySelectorAll('.print-area-item');
    areaElements.forEach(el => {
      if (el.dataset.areaId === areaId) {
        element = el;
      }
    });
  }
  
  if (!element) return;
  
  // Remove any existing design indicator
  const existingIndicator = element.querySelector('.design-indicator');
  if (existingIndicator) {
    existingIndicator.classList.remove('d-none');
  } else {
    // Create new design indicator
    const designIndicator = document.createElement('div');
    designIndicator.className = 'design-indicator mt-2';
    designIndicator.innerHTML = `
      <div class="alert alert-success py-2 mb-2">
        <p class="mb-1"><strong>Design assigned!</strong></p>
        <img src="${selectedDesignUrl}" class="img-fluid border rounded" style="max-height: 100px;" alt="Assigned Design">
      </div>
    `;
    
    element.querySelector('.card-body').appendChild(designIndicator);
  }
  
  // Update the assign button text
  const assignBtn = element.querySelector('.assign-design-btn');
  if (assignBtn) {
    assignBtn.textContent = 'Change Design';
  }
}

// Load Variants
async function loadVariants() {
  const blueprintId = blueprintSelect.value;
  const providerId = providerSelect.value;
  
  if (!blueprintId || !providerId) return;
  
  document.getElementById('variantsLoading').style.display = 'block';
  variantsList.innerHTML = '<p class="text-muted">Loading variants...</p>';
  
  try {
    // Log the request URL for debugging
    const requestUrl = `${API_BASE}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`;
    console.log('Requesting variants from:', requestUrl);
    
    const response = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    const data = await response.json();
    console.log('Variants API response:', data);
    
    if (data.success) {
      // Make sure we're accessing the variants array correctly
      displayVariants(data.variants || []);
    } else {
      console.error('Error loading variants:', data.message);
      variantsList.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error loading variants:', error);
    variantsList.innerHTML = '<div class="alert alert-danger">Error loading variants. Please try again.</div>';
  } finally {
    document.getElementById('variantsLoading').style.display = 'none';
  }
}

// Global variables to store placeholders and selected print area
let currentPlaceholders = [];
let selectedPrintAreaId = null;

// Display Variants
function displayVariants(variantData) {
  variantsList.innerHTML = '';
  console.log('Variants data received:', variantData); // Debug log
  
  // Handle different possible data structures flexibly
  let actualVariants = [];
  
  // Case 1: If variantData is directly an array of variants
  if (Array.isArray(variantData)) {
    actualVariants = variantData;
  }
  // Case 2: If variantData has a variants array property
  else if (variantData && variantData.variants && Array.isArray(variantData.variants)) {
    actualVariants = variantData.variants;
  }
  // Case 3: If variantData is an object with variant objects as values
  else if (variantData && typeof variantData === 'object') {
    // Try to extract variants from the object structure
    // This handles nested structures that might contain variants
    const possibleArrays = Object.values(variantData).filter(val => Array.isArray(val));
    if (possibleArrays.length > 0) {
      // Use the longest array as it's likely the variants array
      actualVariants = possibleArrays.reduce((a, b) => a.length > b.length ? a : b, []);
    }
  }
  
  console.log('Extracted variants array:', actualVariants);
  
  // If no variants found, show message
  if (!actualVariants || actualVariants.length === 0) {
    variantsList.innerHTML = '<p class="text-muted">No variants available for this product and provider</p>';
    return;
  }
  
  // Try to find print areas/placeholders from any available source
  let placeholders = [];
  
  // Check multiple possible locations for print areas/placeholders
  if (variantData && variantData.print_areas && Array.isArray(variantData.print_areas)) {
    placeholders = variantData.print_areas;
  } else if (actualVariants[0] && actualVariants[0].placeholders) {
    placeholders = actualVariants[0].placeholders;
  } else if (actualVariants[0] && actualVariants[0].print_areas) {
    placeholders = actualVariants[0].print_areas;
  }
  
  // If we found placeholders, store them and display print areas
  if (placeholders && placeholders.length > 0) {
    console.log('Found placeholders:', placeholders);
    currentPlaceholders = placeholders;
    displayPrintAreas(currentPlaceholders);
  } else {
    console.log('No placeholders found in the variants response');
    currentPlaceholders = [];
    printAreasList.innerHTML = '<p class="text-muted">No print areas available for this product</p>';
  }
  
  // Process each variant
  actualVariants.forEach(variant => {
    console.log('Processing variant:', variant);
    
    // Create variant container
    const variantDiv = document.createElement('div');
    variantDiv.className = 'variant-item d-flex align-items-center mb-2 p-2 border rounded';
    
    // Create checkbox for variant selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input me-2';
    
    // Handle variant ID flexibly
    const variantId = variant.id || variant.variant_id || variant.sku || (typeof variant === 'object' ? JSON.stringify(variant) : variant);
    checkbox.value = variantId;
    checkbox.dataset.variantId = variantId;
    checkbox.checked = true;
    
    // Create label for variant information
    const label = document.createElement('label');
    label.className = 'form-check-label flex-grow-1';
    
    // Determine variant title/name in a flexible way
    let variantTitle = '';
    
    // Try different possible properties for the variant title
    if (variant.title) {
      variantTitle = variant.title;
    } else if (variant.name) {
      variantTitle = variant.name;
    } else if (variant.sku) {
      variantTitle = `SKU: ${variant.sku}`;
    } else if (variant.options) {
      // Handle options in different formats
      if (Array.isArray(variant.options)) {
        variantTitle = `Options: ${variant.options.join(', ')}`;
      } else if (typeof variant.options === 'object') {
        variantTitle = `Options: ${Object.values(variant.options).join(', ')}`;
      }
    } else {
      // Last resort - use ID or stringify the object
      variantTitle = `Variant ${variantId}`;
    }
    
    // Set the variant title
    label.textContent = variantTitle;
    
    // Add availability badge if that information exists
    if (variant.is_available === false || variant.in_stock === false) {
      const badge = document.createElement('span');
      badge.className = 'badge bg-danger ms-2';
      badge.textContent = 'Out of Stock';
      label.appendChild(badge);
    }
    
    // Create price input
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'form-control form-control-sm variant-price';
    priceInput.min = '0';
    priceInput.step = '0.01';
    
    // Set default price
    let price = '19.99';
    
    // Try to get price from different possible properties
    if (typeof variant.price === 'number') {
      // Price might be in cents or dollars, try to determine which
      price = variant.price > 100 ? (variant.price / 100).toFixed(2) : variant.price.toFixed(2);
    } else if (typeof variant.cost === 'number') {
      // Cost might be in cents or dollars, try to determine which
      const cost = variant.cost > 100 ? variant.cost / 100 : variant.cost;
      price = (cost * 2).toFixed(2); // 2x markup
    }
    
    // Add pricing guidance
    const pricingNote = document.createElement('small');
    pricingNote.className = 'text-muted d-block mb-1';
    pricingNote.textContent = 'Set your selling price:';
    label.appendChild(pricingNote);
    
    priceInput.value = price;
    priceInput.dataset.variantId = variantId;
    
    variantDiv.appendChild(checkbox);
    variantDiv.appendChild(label);
    variantDiv.appendChild(priceInput);
    
    variantsList.appendChild(variantDiv);
  });
  
  // If no variants were displayed, show a message
  if (variantsList.children.length === 0) {
    variantsList.innerHTML = '<div class="alert alert-warning">No valid variants found for this product.</div>';
  } else {
    console.log(`Successfully displayed ${variantsList.children.length} variants`);
  }
}

// Handle Product Creation
async function handleProductCreation(event) {
  event.preventDefault();
  
  if (!printifyApiKey || !selectedShopId) {
    alert('Please verify your API key and select a shop first.');
    return;
  }
  
  if (!selectedDesignId) {
    alert('Please select a design first.');
    return;
  }
  
  const title = document.getElementById('productTitle').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const blueprintId = blueprintSelect.value;
  const printProviderId = providerSelect.value;
  
  if (!title || !description || !blueprintId || !printProviderId) {
    alert('Please fill in all required fields.');
    return;
  }
  
  // Get selected variants - flexible approach to handle any structure
  const selectedVariants = [];
  const variantCheckboxes = document.querySelectorAll('.variant-item input[type="checkbox"]:checked');
  const variantPrices = document.querySelectorAll('.variant-item .variant-price');
  
  if (variantCheckboxes.length === 0) {
    alert('Please select at least one variant.');
    return;
  }
  
  console.log(`Found ${variantCheckboxes.length} selected variants`);
  
  variantCheckboxes.forEach(checkbox => {
    const variantId = checkbox.dataset.variantId;
    let price = 1999; // Default price in cents
    
    // Find corresponding price input
    variantPrices.forEach(priceInput => {
      if (priceInput.dataset.variantId === variantId) {
        // Convert from dollars to cents for API
        price = Math.round(parseFloat(priceInput.value) * 100);
      }
    });
    
    // Handle variant IDs that might be stored as JSON strings
    let processedId = variantId;
    if (variantId.startsWith('{') || variantId.startsWith('[')) {
      try {
        // Try to extract id from JSON string
        const parsedVariant = JSON.parse(variantId);
        processedId = parsedVariant.id || parsedVariant.variant_id || variantId;
      } catch (e) {
        console.log('Could not parse variant ID JSON:', e);
      }
    }
    
    selectedVariants.push({
      id: processedId,
      price: price,
      is_enabled: true
    });
  });
  
  console.log('Selected variants for product creation:', selectedVariants);
  
  // Get print areas with assigned designs - flexible approach
  const printAreasWithDesigns = {};
  
  // First check if we have any designs assigned
  if (!selectedDesignUrl) {
    alert('Please generate and select a design first');
    return;
  }
  
  // Check if we have a selected print area
  if (selectedPrintAreaId) {
    console.log('Selected print area ID:', selectedPrintAreaId);
    console.log('Current placeholders:', currentPlaceholders);
    
    // Find the corresponding placeholder in currentPlaceholders
    // Handle different possible structures
    let selectedArea = null;
    
    if (Array.isArray(currentPlaceholders)) {
      selectedArea = currentPlaceholders.find(area => {
        const areaId = area.id || area.placeholder_id || area.print_area_id;
        return areaId === selectedPrintAreaId;
      });
    }
    
    if (selectedArea) {
      // Get the position - could be in different properties
      const position = selectedArea.position || selectedArea.placement || 'front';
      
      printAreasWithDesigns[position] = {
        image_url: selectedDesignUrl
      };
      
      console.log(`Assigned design to print area position: ${position}`);
    } else {
      // If we can't find the exact area, use a default position
      console.log('Could not find selected print area, using default position');
      printAreasWithDesigns['front'] = {
        image_url: selectedDesignUrl
      };
    }
  } else {
    // If no specific area was selected but we have a design, use default position
    printAreasWithDesigns['front'] = {
      image_url: selectedDesignUrl
    };
    console.log('No print area selected, using default front position');
  }
  
  // Convert print areas object to array format required by API
  const printAreasArray = [];
  for (const position in printAreasWithDesigns) {
    printAreasArray.push({
      placement: position,
      images: [{ 
        id: 'design-image',
        url: printAreasWithDesigns[position].image_url
      }]
    });
  }
  
  console.log('Print areas for product creation:', printAreasArray);
  
  // Prepare the product creation payload - follow Printify API schema exactly
  const productData = {
    title: title,
    description: document.getElementById('productDescription').value || 'Custom designed product',
    blueprint_id: parseInt(blueprintId),
    print_provider_id: parseInt(printProviderId),
    variants: selectedVariants,
    print_areas: printAreasArray
  };
  
  console.log('Creating product with data:', productData);
  
  try {
    const response = await fetch(`${API_BASE}/shops/${selectedShopId}/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(productData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Product created successfully:', result);
      currentProduct = result;
      productCreatedModal.show();
    } else {
      console.error('Error creating product:', result);
      alert(`Error creating product: ${result.message || 'Unknown error'}`);
      console.log('Full error details:', result);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    alert('Error creating product. Please try again.');
  }
}

// Publish Product
async function publishProduct() {
  if (!currentProduct || !selectedShopId || !printifyApiKey) {
    alert('No product to publish.');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/shops/${selectedShopId}/products/${currentProduct.id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({ publishData: {} })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Product published successfully!');
      productCreatedModal.hide();
      loadProducts();
      resetProductForm();
    } else {
      alert(`Error publishing product: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error publishing product:', error);
    alert('Error publishing product. Please try again.');
  }
}

// Reset Product Form
function resetProductForm() {
  document.getElementById('productTitle').value = '';
  document.getElementById('productDescription').value = '';
  blueprintSelect.selectedIndex = 0;
  providerSelect.innerHTML = '<option selected disabled value="">Select product type first...</option>';
  providerSelect.disabled = true;
  variantsList.innerHTML = '<p class="text-muted">Select a product type and print provider to see available variants</p>';
  printAreasList.innerHTML = '<p class="text-muted">Select a product type to see available print areas</p>';
  selectedDesignContainer.innerHTML = '<p class="text-muted">No design selected. Generate or select a design from the Generate Design tab.</p>';
  selectedDesignId = '';
  currentProduct = null;
}
