// Global variables
let printifyApiKey = '';
let selectedShopId = '';
let selectedDesignUrl = '';
let selectedDesignId = '';
let currentProduct = null;
let blueprintData = {};
let printAreas = {};

// API base URL - automatically detects if we're in production or development
const API_BASE = window.location.hostname === 'localhost' ? '' : '/.netlify/functions/api';

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
      populatePrintProviders(data.printProviders);
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
function displayPrintAreas(printAreas) {
  printAreasList.innerHTML = '';
  
  if (!printAreas || Object.keys(printAreas).length === 0) {
    printAreasList.innerHTML = '<p class="text-muted">No print areas available for this product type</p>';
    return;
  }
  
  for (const [key, area] of Object.entries(printAreas)) {
    const areaDiv = document.createElement('div');
    areaDiv.className = 'print-area-item';
    areaDiv.dataset.areaId = key;
    
    const areaTitle = document.createElement('h6');
    areaTitle.textContent = area.title || key;
    
    const areaDescription = document.createElement('p');
    areaDescription.className = 'text-muted small';
    areaDescription.textContent = `Size: ${area.width}x${area.height} ${area.width_unit || 'px'}`;
    
    areaDiv.appendChild(areaTitle);
    areaDiv.appendChild(areaDescription);
    
    if (selectedDesignId) {
      const useDesignBtn = document.createElement('button');
      useDesignBtn.className = 'btn btn-sm btn-outline-primary';
      useDesignBtn.textContent = 'Use Selected Design';
      useDesignBtn.onclick = () => assignDesignToPrintArea(key);
      areaDiv.appendChild(useDesignBtn);
    }
    
    printAreasList.appendChild(areaDiv);
  }
}

// Assign Design to Print Area
function assignDesignToPrintArea(areaId) {
  const areaElements = document.querySelectorAll('.print-area-item');
  
  areaElements.forEach(el => {
    if (el.dataset.areaId === areaId) {
      el.classList.add('border-primary');
      
      // Remove any existing design indicator
      const existingIndicator = el.querySelector('.design-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // Add design indicator
      const designIndicator = document.createElement('div');
      designIndicator.className = 'design-indicator mt-2';
      designIndicator.innerHTML = `
        <p class="text-success mb-1"><strong>Design assigned!</strong></p>
        <img src="${selectedDesignUrl}" class="print-area-img" alt="Assigned Design">
      `;
      
      el.appendChild(designIndicator);
    } else {
      el.classList.remove('border-primary');
    }
  });
}

// Load Variants
async function loadVariants() {
  const blueprintId = blueprintSelect.value;
  const providerId = providerSelect.value;
  
  if (!blueprintId || !providerId) return;
  
  document.getElementById('variantsLoading').style.display = 'block';
  variantsList.innerHTML = '<p class="text-muted">Loading variants...</p>';
  
  try {
    const response = await fetch(`${API_BASE}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayVariants(data.variants);
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

// Display Variants
function displayVariants(variants) {
  variantsList.innerHTML = '';
  
  if (!variants || variants.length === 0) {
    variantsList.innerHTML = '<p class="text-muted">No variants available for this product and provider</p>';
    return;
  }
  
  variants.forEach(variant => {
    const variantDiv = document.createElement('div');
    variantDiv.className = 'variant-item d-flex align-items-center';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input me-2';
    checkbox.value = variant.id;
    checkbox.dataset.variantId = variant.id;
    checkbox.checked = true;
    
    const label = document.createElement('label');
    label.className = 'form-check-label flex-grow-1';
    label.textContent = `${variant.title} (${variant.options.join(', ')})`;
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'form-control form-control-sm variant-price';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = (variant.cost * 2).toFixed(2); // Default price is 2x cost
    priceInput.dataset.variantId = variant.id;
    
    variantDiv.appendChild(checkbox);
    variantDiv.appendChild(label);
    variantDiv.appendChild(priceInput);
    
    variantsList.appendChild(variantDiv);
  });
}

// Handle Product Creation
async function handleProductCreation(event) {
  event.preventDefault();
  
  if (!selectedShopId || !printifyApiKey || !selectedDesignId) {
    alert('Please select a shop, verify your API key, and upload a design before creating a product.');
    return;
  }
  
  const title = document.getElementById('productTitle').value;
  const description = document.getElementById('productDescription').value;
  const blueprintId = parseInt(blueprintSelect.value);
  const printProviderId = parseInt(providerSelect.value);
  
  // Get selected variants and their prices
  const variantCheckboxes = document.querySelectorAll('.variant-item input[type="checkbox"]:checked');
  const variantPrices = document.querySelectorAll('.variant-item input[type="number"]');
  
  if (variantCheckboxes.length === 0) {
    alert('Please select at least one variant.');
    return;
  }
  
  const variants = [];
  variantCheckboxes.forEach(checkbox => {
    const variantId = parseInt(checkbox.dataset.variantId);
    const priceInput = Array.from(variantPrices).find(input => parseInt(input.dataset.variantId) === variantId);
    
    variants.push({
      variantId: variantId,
      price: parseFloat(priceInput.value),
      isEnabled: true
    });
  });
  
  // Get print areas with assigned designs
  const printAreasWithDesigns = {};
  const designIndicators = document.querySelectorAll('.design-indicator');
  
  if (designIndicators.length === 0) {
    alert('Please assign your design to at least one print area.');
    return;
  }
  
  designIndicators.forEach(indicator => {
    const areaItem = indicator.closest('.print-area-item');
    const areaId = areaItem.dataset.areaId;
    
    printAreasWithDesigns[areaId] = {
      position: 'center',
      imageId: selectedDesignId
    };
  });
  
  // Prepare product data
  const productData = {
    title,
    description,
    blueprintId,
    printProviderId,
    variants,
    printAreas: printAreasWithDesigns
  };
  
  try {
    const response = await fetch(`${API_BASE}/shops/${selectedShopId}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({ productData })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentProduct = data.product;
      productCreatedModal.show();
    } else {
      alert(`Error creating product: ${data.message || 'Unknown error'}`);
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
