// Global variables
let printifyApiKey = null;
let selectedShopId = '';
let selectedDesignUrl = null;
let selectedDesignOriginalUrl = null; // Store the original Fal.ai URL
let selectedDesignId = null;
let currentProduct = null;
let blueprintData = {};
let printAreas = {};
let currentDesignPrompt = ''; // Store the current design prompt globally
let currentPlaceholders = []; // Store the current print area placeholders
let selectedPrintAreaWidth = 1000; // Default width for print areas
let selectedPrintAreaHeight = 1000; // Default height for print areas
let selectedPrintAreaPosition = 'front'; // Default position
let generatedDesigns = []; // Store the generated designs
let selectedPrintAreaId = null; // Store the selected print area ID
let printifyImageWidth = 1000; // Default width for uploaded images
let printifyImageHeight = 1000; // Default height for uploaded images
let printifyImageSrc = ''; // Store the image source URL

// API base URL - using new server on port 3003
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? `http://${window.location.hostname}:3003/api` 
  : '/api';

// DOM Elements - using let instead of const to allow reassignment in DOMContentLoaded
let apiKeyInput;
let verifyApiKeyBtn;
let apiKeyStatus;
let shopSelectionSection;
let shopSelect;
let mainContent;

let refreshProductsBtn;
let productsList;
let productsLoading;
let blueprintSelect;
let providerSelect;
let variantsList;
let printAreasList;
let createProductForm;
let selectedDesignContainer;
let previewImage;
let useThisDesignBtn;
let publishProductBtn;
let productTitle;
let productDescription;
let selectedDesignPreview;
let createProductBtn;

// Bootstrap Modal instances
let designPreviewModal;
let productCreatedModal;

// Function to prompt for Printify API key
function promptForApiKey() {
  if (!printifyApiKey) {
    const key = prompt('Please enter your Printify API key to continue:');
    if (key && key.trim()) {
      printifyApiKey = key.trim();
      localStorage.setItem('printifyApiKey', printifyApiKey); // Save for convenience
      return true;
    } else {
      alert('A valid Printify API key is required to use this application.');
      return false;
    }
  }
  return true;
}

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
      
      // Get shops using the new getShops function
      getShops();
      
      // Show shop selection section
      shopSelectionSection.style.display = 'block';
    } else {
      const errorMessage = data.details ? `Invalid API key: ${data.details}` : 'Invalid API key. Please check and try again.';
      showApiKeyStatus(errorMessage, 'danger');
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

// Initialize UI function declaration
function initializeUI() {
  // Check if we have a stored API key
  const storedApiKey = localStorage.getItem('printifyApiKey');
  if (storedApiKey) {
    apiKeyInput.value = storedApiKey;
    printifyApiKey = storedApiKey;
    verifyApiKey();
  }
  
  // Initialize the Create Product button state
  updateCreateProductButton();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  apiKeyInput = document.getElementById('printifyApiKey');
  verifyApiKeyBtn = document.getElementById('verifyApiKey');
  apiKeyStatus = document.getElementById('apiKeyStatus');
  shopSelectionSection = document.getElementById('shopSelectionSection');
  shopSelect = document.getElementById('shopSelect');
  mainContent = document.getElementById('mainContent');
  selectedDesignPreview = document.getElementById('selectedDesignPreview');
  refreshProductsBtn = document.getElementById('refreshProductsBtn');
  productsList = document.getElementById('productsList');
  productsLoading = document.getElementById('productsLoading');
  blueprintSelect = document.getElementById('blueprintSelect');
  providerSelect = document.getElementById('providerSelect');
  variantsList = document.getElementById('variantsList');
  printAreasList = document.getElementById('printAreasList');
  createProductForm = document.getElementById('createProductForm');
  selectedDesignContainer = document.getElementById('selectedDesignContainer');
  previewImage = document.getElementById('previewImage');
  useThisDesignBtn = document.getElementById('useThisDesignBtn');
  publishProductBtn = document.getElementById('publishProductBtn');
  productTitle = document.getElementById('productTitle');
  productDescription = document.getElementById('productDescription');
  createProductBtn = document.getElementById('createProductBtn');
  
  // Initialize Bootstrap modals
  const designPreviewModalEl = document.getElementById('designPreviewModal');
  const productCreatedModalEl = document.getElementById('productCreatedModal');
  if (designPreviewModalEl) designPreviewModal = new bootstrap.Modal(designPreviewModalEl);
  if (productCreatedModalEl) productCreatedModal = new bootstrap.Modal(productCreatedModalEl);
  
  // Setup event listeners
  if (verifyApiKeyBtn) {
    verifyApiKeyBtn.addEventListener('click', verifyApiKey);
  }
  if (apiKeyInput) {
    apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyApiKey();
      }
    });
  }
  if (shopSelect) {
    shopSelect.addEventListener('change', handleShopSelection);
  }
  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener('click', loadProducts);
  }
  if (blueprintSelect) {
    blueprintSelect.addEventListener('change', handleBlueprintSelection);
  }
  if (providerSelect) {
    providerSelect.addEventListener('change', loadVariants);
  }
  if (createProductForm) {
    createProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleProductCreation();
    });
  }
  if (useThisDesignBtn) {
    useThisDesignBtn.addEventListener('click', useSelectedDesign);
  }
  if (publishProductBtn) {
    publishProductBtn.addEventListener('click', publishProduct);
  }

  // Tab change listeners
  document.getElementById('products-tab').addEventListener('click', () => {
    if (selectedShopId) loadProducts();
  });
  document.getElementById('create-tab').addEventListener('click', () => {
    if (selectedShopId && !blueprintSelect.options.length) loadBlueprints();
  });
  
  // Initialize UI
  initializeUI();
});

// Get shops from Printify API
async function getShops() {
  if (!printifyApiKey) {
    if (!promptForApiKey()) {
      return;
    }
  }
  
  try {
    const response = await fetch(`${API_BASE}/shops`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Shops response:', data);
    
    // Check if the response has a shops property (from our API endpoint)
    const shops = data.shops || data;
    
    if (!shops || !Array.isArray(shops) || shops.length === 0) {
      alert('No shops found. Please check your Printify API key.');
      return;
    }
    
    shopSelect.innerHTML = '<option selected disabled value="">Select a shop...</option>';
    
    shops.forEach(shop => {
      const option = document.createElement('option');
      option.value = shop.id;
      option.textContent = shop.title;
      shopSelect.appendChild(option);
    });
    
    // Show the shop selection
    if (shopSelectionSection) {
      shopSelectionSection.style.display = 'block';
    } else {
      console.error('shopSelectionSection element not found');
      // Try to find it by ID as a fallback
      const section = document.getElementById('shopSelectionSection');
      if (section) {
        section.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error fetching shops:', error);
    alert('Error fetching shops: ' + error.message);
  }
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

// Generate Design specifically for the selected print area
async function generateDesignForPrintArea() {
  const promptElement = document.getElementById('designPrompt');
  if (!promptElement) {
    console.error('Design prompt element not found');
    return;
  }
  
  const prompt = promptElement.value.trim();
  if (!prompt) {
    document.getElementById('generationStatus').innerHTML = '<div class="alert alert-danger">Please enter a design description</div>';
    return;
  }
  
  // Include print area information in the prompt
  const enhancedPrompt = `${prompt} - Design for ${selectedPrintAreaPosition} placement, optimized for ${selectedPrintAreaWidth}x${selectedPrintAreaHeight} dimensions.`;
  console.log('Enhanced prompt with print area info:', enhancedPrompt);
  
  await generateDesignWithDetails(enhancedPrompt, selectedPrintAreaWidth, selectedPrintAreaHeight);
}

// Shared design generation function with size parameters
async function generateDesignWithDetails(prompt, width = selectedPrintAreaWidth, height = selectedPrintAreaHeight) {
  console.log('generateDesignWithDetails called with:', { prompt, width, height });
  
  // Find the status element - could be either the main one or the one in the print area
  const statusElement = document.getElementById('generationStatus');
  console.log('Found status element:', statusElement);
  
  // Find the button that triggered this - could be either the main one or the print area one
  const mainBtnElement = document.getElementById('generateDesignBtn');
  const printAreaBtnElement = document.getElementById('printAreaDesignBtn');
  console.log('Found buttons:', { mainBtnElement, printAreaBtnElement });
  
  // Use whichever button is available
  const btnElement = printAreaBtnElement || mainBtnElement;
  
  if (!statusElement) {
    console.error('Status element not found');
    return;
  }
  
  console.log('Starting design generation with prompt:', prompt);
  statusElement.innerHTML = '<div class="d-flex align-items-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Generating designs...</div>';
  
  // Disable the button if it exists
  if (btnElement) {
    console.log('Disabling button:', btnElement);
    btnElement.disabled = true;
  }
  
  try {
    console.log(`Generating design with prompt: ${prompt}, size: ${width}x${height}`);
    
    // Log the API endpoint we're calling
    console.log('Calling API endpoint:', `${API_BASE}/generate-image`);
    
    const requestBody = { 
      prompt, 
      width, 
      height,
      numImages: 1 
    };
    console.log('Request body:', requestBody);
    
    const response = await fetch(`${API_BASE}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('API response status:', response.status);
    const data = await response.json();
    console.log('API response data:', data);
    
    if (data.success || data.images) {
      statusElement.innerHTML = '<div class="alert alert-success">Designs generated successfully!</div>';
      
      // Make sure the designs container exists
      let designsContainer = document.getElementById('generatedDesigns');
      if (!designsContainer) {
        console.log('Creating generatedDesigns container');
        designsContainer = document.createElement('div');
        designsContainer.id = 'generatedDesigns';
        designsContainer.className = 'row mt-3';
        statusElement.parentNode.insertBefore(designsContainer, statusElement.nextSibling);
      }
      
      displayGeneratedDesigns(data.images || []);
    } else {
      statusElement.innerHTML = `<div class="alert alert-danger">Error: ${data.message || data.error || 'Unknown error'}</div>`;
    }
  } catch (error) {
    console.error('Error generating designs:', error);
    statusElement.innerHTML = '<div class="alert alert-danger">Error generating designs. Please try again.</div>';
  } finally {
    // Re-enable the button if it exists
    if (btnElement) {
      btnElement.disabled = false;
    }
  }
}

// Function to store generated designs from API response
function storeGeneratedDesigns(images) {
  console.log('Storing generated designs:', images);
  if (!Array.isArray(images)) {
    console.error('Images is not an array:', images);
    return;
  }
  
  // Initialize generatedDesigns if needed
  if (!Array.isArray(generatedDesigns)) {
    generatedDesigns = [];
  }
  
  // Add the new images to the generatedDesigns array
  images.forEach(image => {
    generatedDesigns.push({
      name: image.name,
      url: image.url,
      originalUrl: image.originalUrl,
      data: image.data
    });
  });
  
  console.log('Updated generatedDesigns array:', generatedDesigns);
}

// Update the Create Product button to show if design is selected
function updateCreateProductButton() {
  const createProductBtn = document.getElementById('createProductBtn');
  if (createProductBtn) {
    if (selectedDesignId && selectedDesignUrl) {
      createProductBtn.textContent = 'Create Product';
      createProductBtn.disabled = false;
      createProductBtn.classList.remove('btn-secondary');
      createProductBtn.classList.add('btn-primary');
    } else {
      createProductBtn.textContent = 'Select design first';
      createProductBtn.disabled = true;
      createProductBtn.classList.remove('btn-primary');
      createProductBtn.classList.add('btn-secondary');
    }
  }
}

// Function to select a design and use it for the current print area
function selectDesign(designId, designUrl, originalUrl) {
  console.log(`Selecting design: ${designId}`);
  selectedDesignId = designId; // Store the selected design ID
  
  // Safety check - ensure generatedDesigns is an array
  if (!Array.isArray(generatedDesigns)) {
    console.log('Warning: generatedDesigns is not an array, initializing it');
    generatedDesigns = [];
  }
  
  // Find the design in generatedDesigns to get both local and original URLs
  let designObj = null;
  try {
    designObj = generatedDesigns.find(design => design && design.name === designId);
  } catch (error) {
    console.error('Error finding design:', error);
  }
  
  // Store both URLs - local URL for display, original URL for Printify API
  selectedDesignUrl = designUrl || `/generated-images/${designId}`;
  selectedDesignOriginalUrl = designObj && designObj.originalUrl ? designObj.originalUrl : selectedDesignUrl;
  
  // Immediately upload the selected design to Printify
  uploadDesignToPrintify();
  
  console.log(`Design selected: ${designId}, URL: ${selectedDesignUrl.substring(0, 30)}...`);
  console.log(`Original URL for Printify: ${selectedDesignOriginalUrl.substring(0, 30)}...`);
  
  // Remove checkmarks from all designs
  const allCheckmarks = document.querySelectorAll('.design-checkmark');
  allCheckmarks.forEach(checkmark => checkmark.remove());
  
  // Remove highlight from all design containers
  const allDesignContainers = document.querySelectorAll('#generatedDesigns .col-md-4');
  allDesignContainers.forEach(container => {
    container.style.border = '';
  });
  
  // Find the selected design container - try multiple methods for reliability
  let selectedContainer = null;
  
  // Method 1: Try to find by data attribute first (most reliable)
  selectedContainer = document.querySelector(`#generatedDesigns [data-design-id="${designId}"]`);
  console.log('Method 1 result:', selectedContainer ? 'Found container' : 'Not found');
  
  // Method 2: Try to find by image with data attribute
  if (!selectedContainer) {
    const img = document.querySelector(`#generatedDesigns img[data-design-id="${designId}"]`);
    if (img) {
      // Walk up to find the column container
      selectedContainer = img.closest('.col-md-4');
      console.log('Method 2 result:', selectedContainer ? 'Found container' : 'Not found');
    }
  }
  
  // Method 3: Try to find by image src or alt
  if (!selectedContainer) {
    selectedContainer = Array.from(allDesignContainers).find(container => {
      const img = container.querySelector('img');
      return img && (img.src.includes(designId) || img.alt.includes(designId));
    });
    console.log('Method 3 result:', selectedContainer ? 'Found container' : 'Not found');
  }
  
  // Method 4: Try to find by button with data-design-id
  if (!selectedContainer) {
    const button = document.querySelector(`#generatedDesigns button[data-design-id="${designId}"]`);
    if (button) {
      selectedContainer = button.closest('.col-md-4');
      console.log('Method 4 result:', selectedContainer ? 'Found container' : 'Not found');
    }
  }
  
  if (selectedContainer) {
    console.log('Found selected container:', selectedContainer);
    
    // Add visual indicator (checkmark)
    const checkmark = document.createElement('div');
    checkmark.className = 'design-checkmark';
    
    // Create a simple checkmark without using Bootstrap icons
    const checkmarkInner = document.createElement('div');
    checkmarkInner.style.width = '30px';
    checkmarkInner.style.height = '30px';
    checkmarkInner.style.backgroundColor = '#28a745';
    checkmarkInner.style.borderRadius = '50%';
    checkmarkInner.style.display = 'flex';
    checkmarkInner.style.alignItems = 'center';
    checkmarkInner.style.justifyContent = 'center';
    checkmarkInner.style.color = 'white';
    checkmarkInner.style.fontWeight = 'bold';
    checkmarkInner.innerHTML = '✓';
    checkmarkInner.style.fontSize = '20px';
    
    checkmark.appendChild(checkmarkInner);
    checkmark.style.position = 'absolute';
    checkmark.style.top = '10px';
    checkmark.style.right = '25px';
    checkmark.style.zIndex = '100';
    
    // Find the image container within the column
    const imgContainer = selectedContainer.querySelector('.design-image-container');
    if (imgContainer) {
      // Add checkmark to the image container
      imgContainer.style.position = 'relative';
      imgContainer.appendChild(checkmark);
      console.log('Checkmark added to design image container');
    } else {
      // Fallback: add to the column container
      selectedContainer.style.position = 'relative';
      selectedContainer.appendChild(checkmark);
      console.log('Checkmark added to design column container');
    }
    
    // Add border to the column container
    selectedContainer.style.border = '3px solid #28a745';
    selectedContainer.style.borderRadius = '8px';
    selectedContainer.style.padding = '5px';
    
    console.log('Design container highlighted with border');
  } else {
    console.log('Could not find the selected design container');
  }
  
  // Update the UI to show the design is selected
  const statusElement = document.getElementById('generationStatus');
  if (statusElement) {
    statusElement.innerHTML = `<div class="alert alert-success">Design selected! Ready to create product.</div>`;
  }
  
  // Update the Create Product button
  updateCreateProductButton();
  
  // Update any other buttons that were waiting for design selection
  document.querySelectorAll('.needs-design-selection').forEach(element => {
    if (element.tagName === 'BUTTON') {
      element.disabled = false;
      element.textContent = element.textContent.replace('Select design first', 'Create Product');
    }
  });
  
  // Enable the assign button if it exists
  const assignBtn = document.getElementById('assignDesignBtn');
  if (!assignBtn) {
    // Create an assign button if it doesn't exist
    const printAreaContainer = document.querySelector('.print-area-container');
    if (printAreaContainer) {
      const newAssignBtn = document.createElement('button');
      newAssignBtn.id = 'assignDesignBtn';
      newAssignBtn.className = 'btn btn-success btn-lg w-100 mt-3';
      newAssignBtn.textContent = 'Assign Design to Print Area';
      newAssignBtn.type = 'button';
      newAssignBtn.onclick = assignDesignToPrintArea;
      printAreaContainer.appendChild(newAssignBtn);
    }
  } else {
    assignBtn.disabled = false;
  }
  
  console.log(`Design selected: ${designId}, URL: ${designUrl ? designUrl.substring(0, 30) + '...' : 'undefined'}`);
}

// Display Generated Designs
function displayGeneratedDesigns(images) {
  // Store the images in our global array for later use
  storeGeneratedDesigns(images);
  
  // Update the Create Product button state
  updateCreateProductButton();
  
  // First make sure we're on the Create Product tab
  document.getElementById('create-tab').click();
  
  // Get or create the designs container
  let designsContainer = document.getElementById('generatedDesigns');
  if (!designsContainer) {
    // Try to find a parent element to add the container to
    const designGenContainer = document.querySelector('.design-generation-container');
    
    if (designGenContainer) {
      designsContainer = document.createElement('div');
      designsContainer.id = 'generatedDesigns';
      designsContainer.className = 'row mt-3';
      designGenContainer.appendChild(designsContainer);
    } else {
      console.error('Could not find a place to add designs container');
      return;
    }
  }
  
  designsContainer.innerHTML = '';
  
  if (!images || images.length === 0) {
    designsContainer.innerHTML = '<div class="col-12"><div class="alert alert-warning">No designs were generated</div></div>';
    return;
  }
  
  console.log('Displaying generated designs:', images);
  
  // Add a clear message to show designs are being displayed
  const messageDiv = document.createElement('div');
  messageDiv.className = 'col-12 mb-3';
  messageDiv.innerHTML = '<div class="alert alert-success">Generated designs are ready! Click on an image to select it.</div>';
  designsContainer.appendChild(messageDiv);

  images.forEach((image, index) => {
    console.log(`Processing image ${index}:`, image);
    
    // Create a column for the design
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-4';
    col.dataset.designId = image.name; // Add data attribute for easier selection
    col.style.position = 'relative'; // For absolute positioning of checkmark
    
    // Create a container for the image (helps with positioning the checkmark)
    const imgContainer = document.createElement('div');
    imgContainer.className = 'design-image-container';
    imgContainer.style.position = 'relative';
    imgContainer.style.cursor = 'pointer';
    
    // Create an image element
    const img = document.createElement('img');
    img.src = image.url || image.data;
    img.alt = `Generated Design ${index + 1}`;
    img.dataset.designId = image.name; // Add data attribute to image too
    img.style.maxHeight = '200px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.backgroundColor = '#ffffff';
    img.style.border = '1px solid #ddd';
    img.style.borderRadius = '4px';
    img.style.padding = '5px';

    // Make the container clickable
    imgContainer.onclick = function() {
      selectDesign(image.name, image.url || image.data, image.url);
    };

    // Add the image to the container
    imgContainer.appendChild(img);

    // Add the container to the column
    col.appendChild(imgContainer);

    // Add a title under the image
    const designTitle = document.createElement('h6');
    designTitle.className = 'text-center mt-2';
    designTitle.textContent = `Design ${index + 1}`;
    col.appendChild(designTitle);

    // Add a select button under the title
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-primary btn-sm d-block mx-auto';
    selectBtn.textContent = 'Select Design';
    selectBtn.dataset.designId = image.name; // Store design ID for easy reference
    selectBtn.onclick = function() {
      // Clear any previous selection
      document.querySelectorAll('#generatedDesigns .btn-success').forEach(btn => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        btn.textContent = 'Select Design';
      });

      // Mark this button as selected
      this.classList.remove('btn-primary');
      this.classList.add('btn-success');
      this.textContent = 'Design Selected ✓';

      // Select the design
      selectDesign(image.name, image.url || image.data, image.url);
    };
    col.appendChild(selectBtn);

    // Add info about the print area this was generated for
    if (selectedPrintAreaPosition) {
      const infoText = document.createElement('p');
      infoText.className = 'text-muted small mt-2 mb-0 text-center';
      infoText.textContent = `For: ${selectedPrintAreaPosition.charAt(0).toUpperCase() + selectedPrintAreaPosition.slice(1)} (${selectedPrintAreaWidth}x${selectedPrintAreaHeight})`;
      col.appendChild(infoText);
    }

    // Add debug message
    console.log(`Image ${index} added with source:`, (image.url || '').substring(0, 30) + '...');
    
    // Add the column to the designs container
    designsContainer.appendChild(col);
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
  if (!selectedDesignOriginalUrl || !printifyApiKey) {
    console.error('Missing selectedDesignOriginalUrl or printifyApiKey. Aborting upload.');
    return;
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Extract filename from URL
      const urlParts = selectedDesignOriginalUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      console.log('Attempting to upload image using original URL:', selectedDesignOriginalUrl);
      console.log('Extracted fileName:', fileName);

      // Ensure fileName and imageUrl are correctly populated before stringifying
      console.log('Values before JSON.stringify:');
      console.log('  fileName:', fileName);
      console.log('  imageUrl:', selectedDesignOriginalUrl);

      const payload = {
        fileName: fileName,
        imageUrl: selectedDesignOriginalUrl
      };
      
      console.log('Frontend sending payload object:', payload);
      const requestBody = JSON.stringify(payload);
      console.log('Frontend sending JSON string:', requestBody);

      // Use XMLHttpRequest for more detailed debugging
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/images/upload`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${printifyApiKey}`);
      
      xhr.onreadystatechange = function() {
        console.log('XHR state change:', xhr.readyState, 'status:', xhr.status);
        
        if (xhr.readyState === 4) {
          console.log('XHR complete. Status:', xhr.status);
          console.log('Response headers:', xhr.getAllResponseHeaders());
          console.log('Response text:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('Parsed response data:', data);
              
              if (data.success) {
                selectedDesignId = data.image.id;
                console.log('Design uploaded successfully:', data.image);
                resolve(data);
              } else {
                console.error('Error uploading design:', data.message);
                reject(new Error(data.message || 'Unknown error'));
              }
            } catch (parseError) {
              console.error('Error parsing response:', parseError);
              reject(parseError);
            }
          } else {
            console.error('HTTP error:', xhr.status, xhr.statusText);
            reject(new Error(`HTTP error: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = function(error) {
        console.error('XHR error:', error);
        reject(error);
      };
      
      console.log('Sending XHR request with body:', requestBody);
      xhr.send(requestBody);
      
    } catch (error) {
      console.error('Error in uploadDesignToPrintify function:', error);
      reject(error);
    }
  });
}

// Load Products
async function loadProducts() {
  if (!selectedShopId || !printifyApiKey) return;
  
  // Add null checks for DOM elements
  if (productsLoading) productsLoading.style.display = 'block';
  if (productsList) productsList.innerHTML = '';
  
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
    if (productsList) {
      productsList.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again.</div></div>';
    }
  } finally {
    // Add null check for productsLoading
    if (productsLoading) {
      productsLoading.style.display = 'none';
    }
  }
}

// Display Products
function displayProducts(products) {
  // Check if productsList exists
  if (!productsList) {
    console.error('productsList element not found');
    return;
  }
  
  if (!products || products.length === 0) {
    productsList.innerHTML = '<div class="col-12"><div class="alert alert-info">No products found. Create your first product in the Create Product tab.</div></div>';
    return;
  }
  
  productsList.innerHTML = '';
  
  products.forEach(product => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-4 col-sm-6 mb-4';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card product-card h-100';
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'product-img-container';
    
    const img = document.createElement('img');
    img.className = 'product-img';
    img.src = product.images[0]?.src || 'https://via.placeholder.com/300?text=No+Image';
    img.alt = product.title;
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex flex-column';
    
    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = product.title;
    
    const description = document.createElement('p');
    description.className = 'card-text';
    description.textContent = product.description || 'No description';
    
    const status = document.createElement('p');
    status.className = `badge ${product.is_locked ? 'bg-warning' : 'bg-success'}`;
    status.textContent = product.is_locked ? 'Draft' : 'Published';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mt-auto d-flex flex-wrap gap-2';
    
    const viewBtn = document.createElement('a');
    viewBtn.className = 'btn btn-sm btn-outline-primary';
    viewBtn.href = `https://printify.com/app/shop/${selectedShopId}/products/${product.id}`;
    viewBtn.target = '_blank';
    viewBtn.textContent = 'View in Printify';
    
    // Add Update button
    const updateBtn = document.createElement('button');
    updateBtn.className = 'btn btn-sm btn-outline-success';
    updateBtn.textContent = 'Update';
    updateBtn.dataset.productId = product.id;
    updateBtn.onclick = () => updateProduct(product.id);
    
    // Add Publish button if product is not published
    if (product.is_locked) {
      const publishBtn = document.createElement('button');
      publishBtn.className = 'btn btn-sm btn-outline-warning';
      publishBtn.textContent = 'Publish';
      publishBtn.dataset.productId = product.id;
      publishBtn.onclick = () => {
        currentProduct = product;
        publishProduct(publishBtn);
      };
      buttonContainer.appendChild(publishBtn);
    }
    
    imgContainer.appendChild(img);
    cardBody.appendChild(title);
    cardBody.appendChild(description);
    cardBody.appendChild(status);
    buttonContainer.appendChild(viewBtn);
    buttonContainer.appendChild(updateBtn);
    cardBody.appendChild(buttonContainer);
    
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
  
  // Store placeholders globally for later use
  currentPlaceholders = placeholders;
  
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
    
    // Get dimensions from the placeholder or use defaults
    const width = placeholder.width || 1000;
    const height = placeholder.height || 1000;
    
    const areaDiv = document.createElement('div');
    areaDiv.className = 'print-area-item card mb-3 p-2';
    areaDiv.dataset.areaId = areaId;
    areaDiv.dataset.position = position;
    areaDiv.dataset.width = width;
    areaDiv.dataset.height = height;
    
    // Make the entire area clickable for selection
    areaDiv.style.cursor = 'pointer';
    areaDiv.onclick = () => selectPrintArea(areaId, position, areaDiv, width, height);
    
    // Capitalize the first letter of the position (e.g., "front" -> "Front")
    const areaTitle = document.createElement('h6');
    areaTitle.textContent = position.charAt(0).toUpperCase() + position.slice(1);
    
    const areaDescription = document.createElement('p');
    areaDescription.className = 'text-muted small';
    
    // Show dimensions if available
    if (width && height) {
      areaDescription.textContent = `Size: ${width}x${height} px`;
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
  
  // Remove any existing design generation section when loading new print areas
  const existingDesignGenSection = document.getElementById('designGenSection');
  if (existingDesignGenSection) {
    existingDesignGenSection.remove();
  }
}

// Select Print Area
function selectPrintArea(areaId, position, clickedElement, width, height) {
  // Update the global selected print area ID
  selectedPrintAreaId = areaId;
  console.log(`Selected print area: ${areaId}, position: ${position}, dimensions: ${width}x${height}`);
  
  // Store the selected print area dimensions from parameters
  selectedPrintAreaWidth = width || 1000;
  selectedPrintAreaHeight = height || 1000;
  selectedPrintAreaPosition = position || 'front';
  
  // If dimensions weren't provided in parameters, try to find them in placeholders
  if ((!width || !height) && Array.isArray(currentPlaceholders)) {
    const selectedPlaceholder = currentPlaceholders.find(p => {
      const placeholderId = p.id || p.placeholder_id || p.print_area_id;
      return placeholderId === areaId;
    });
    
    if (selectedPlaceholder) {
      selectedPrintAreaWidth = selectedPlaceholder.width || selectedPrintAreaWidth;
      selectedPrintAreaHeight = selectedPlaceholder.height || selectedPrintAreaHeight;
      console.log(`Print area dimensions from placeholder: ${selectedPrintAreaWidth}x${selectedPrintAreaHeight}`);
    }
  }
  
  console.log(`Using print area dimensions: ${selectedPrintAreaWidth}x${selectedPrintAreaHeight}`);

  
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
  
  // Remove any existing design generation section
  const existingDesignGenSection = document.getElementById('designGenSection');
  if (existingDesignGenSection) {
    existingDesignGenSection.remove();
  }
  
  // Create a new design generation container
  const designGenContainer = document.createElement('div');
  designGenContainer.id = 'designGenSection';
  designGenContainer.className = 'mt-3 p-3 border rounded bg-light';
  
  // Add title with print area information
  const title = document.createElement('h5');
  title.textContent = `Generate Design for ${position.charAt(0).toUpperCase() + position.slice(1)}`;
  designGenContainer.appendChild(title);
  
  // Add size information
  const sizeInfo = document.createElement('p');
  sizeInfo.className = 'text-muted small';
  sizeInfo.textContent = `Target size: ${selectedPrintAreaWidth}x${selectedPrintAreaHeight} px`;
  designGenContainer.appendChild(sizeInfo);
  
  // Add the prompt input
  const promptGroup = document.createElement('div');
  promptGroup.className = 'mb-3';
  promptGroup.innerHTML = `
    <label for="designPrompt" class="form-label">Design Description</label>
    <textarea id="designPrompt" class="form-control" rows="4" placeholder="Describe the design you want to generate... (Example: A cute cartoon cat with sunglasses for a t-shirt)"></textarea>
    <div class="form-text">Enter your design idea above, then click Generate Design</div>
  `;
  designGenContainer.appendChild(promptGroup);
  
  // Add event listener to capture the prompt value as it's typed
  setTimeout(() => {
    const promptTextarea = document.getElementById('designPrompt');
    if (promptTextarea) {
      promptTextarea.addEventListener('input', function(e) {
        currentDesignPrompt = e.target.value;
        console.log('Prompt updated:', currentDesignPrompt);
      });
    }
  }, 100); // Small timeout to ensure the element is in the DOM
  
  // Add the generate button
  const generateBtn = document.createElement('button');
  generateBtn.id = 'printAreaDesignBtn'; // Changed ID to avoid conflict with main generate button
  generateBtn.className = 'btn btn-primary btn-lg w-100';
  generateBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Design for this Print Area';
  generateBtn.type = 'button'; // Explicitly set type to button to prevent form submission
  generateBtn.onclick = function(event) {
    console.log('Print area design button clicked!');
    
    // Prevent any form submission
    event.preventDefault();
    event.stopPropagation();
    
    // Get the actual prompt from the textarea
    const promptElement = document.getElementById('designPrompt');
    if (!promptElement || !promptElement.value.trim()) {
      alert('Please enter a design prompt.');
      // Re-enable the button if the prompt is empty
      const generateBtn = document.getElementById('printAreaDesignBtn');
      if(generateBtn) generateBtn.disabled = false;
      return;
    }
    const prompt = promptElement.value.trim();
    console.log('Using prompt from user:', prompt);
    console.log('Calling generateDesignWithDetails with dimensions:', selectedPrintAreaWidth, 'x', selectedPrintAreaHeight);

    // Call the function with the clean prompt and dimensions
    generateDesignWithDetails(prompt, selectedPrintAreaWidth, selectedPrintAreaHeight);
  };
  designGenContainer.appendChild(generateBtn);
  
  // Add status area for generation feedback
  const statusArea = document.createElement('div');
  statusArea.id = 'generationStatus';
  statusArea.className = 'mt-3';
  designGenContainer.appendChild(statusArea);
  
  // Add container for generated designs
  const designsContainer = document.createElement('div');
  designsContainer.id = 'generatedDesigns';
  designsContainer.className = 'row mt-3';
  designGenContainer.appendChild(designsContainer);
  
  // Insert the design generation section after the clicked element
  clickedElement.parentNode.insertBefore(designGenContainer, clickedElement.nextSibling);
  
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
  
  // Store the selected print area position for product creation
  selectedPrintAreaPosition = position || 'front';
  
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
  
  // Clear design indicators from all other areas
  document.querySelectorAll('.print-area-item .design-indicator').forEach(indicator => {
    indicator.classList.add('d-none');
  });
  
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
        <p class="mb-1"><strong>Design assigned to ${position || 'front'}!</strong></p>
        <img src="${selectedDesignUrl}" class="img-fluid border rounded" style="max-height: 100px;" alt="Assigned Design">
      </div>
    `;
    
    // Add the design indicator at the end of the card body
    element.querySelector('.card-body').appendChild(designIndicator);
  }
  
  // Update the assign button text
  const assignBtn = element.querySelector('.assign-design-btn');
  if (assignBtn) {
    assignBtn.textContent = 'Change Design';
  }
  
  // Show a message that the design is ready to be used
  const designReadyMsg = document.createElement('div');
  designReadyMsg.className = 'alert alert-info mt-3';
  designReadyMsg.innerHTML = `<strong>Design ready!</strong> Your design has been assigned to the ${position || 'front'} print area.`;
  
  // Remove any existing message
  const existingMsg = document.getElementById('designReadyMessage');
  if (existingMsg) existingMsg.remove();
  
  // Add ID for easy reference
  designReadyMsg.id = 'designReadyMessage';
  
  // Add to the page
  document.getElementById('printAreasList').after(designReadyMsg);
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

// Handle Product Creation and Updates
async function handleProductCreation(event) {
  // Make event parameter optional
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  if (!selectedShopId || !printifyApiKey) {
    alert('Please select a shop first');
    return;
  }
  
  // Validate required fields
  const productTitle = document.getElementById('productTitle').value.trim();
  if (!productTitle) {
    alert('Product title is required');
    return;
  }
  
  const createBtn = document.getElementById('createProductBtn');
  const isUpdateMode = createBtn && createBtn.dataset.mode === 'update';
  const productId = isUpdateMode ? createBtn.dataset.productId : null;

  // If we are in update mode, call the dedicated update function
  if (isUpdateMode) {
    await updateExistingProduct(productId);
    return;
  }

  // --- Logic for CREATING a new product ---

  if (createBtn) {
    createBtn.disabled = true;
    createBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading Image...`;
  }

  // Check if we have a design selected
  if (!selectedDesignOriginalUrl) {
    alert('Please select a design to create a product.');
     if (createBtn) {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Product';
    }
    return;
  }
  
  // First, upload the image to Printify directly
  let printifyImageId = null;
  try {
    console.log('Uploading image to Printify for new product...');
    console.log('Using direct image URL for Printify upload:', selectedDesignOriginalUrl);
      
    // Upload using the direct URL
    const uploadResponse = await fetch(`${API_BASE}/images/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify({
        fileName: `design_${Date.now()}.png`,
        imageUrl: selectedDesignOriginalUrl
      })
    });
    
    if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || `HTTP error ${uploadResponse.status}`);
    }
    
    const uploadResult = await uploadResponse.json();
    const imageData = uploadResult.image || uploadResult;
    
    if (!imageData || !imageData.id || typeof imageData.id !== 'string') {
      throw new Error(`Invalid image ID received from Printify: ${imageData ? imageData.id : 'undefined'}`);
    }
    
    printifyImageId = imageData.id;
    printifyImageWidth = imageData.width || 1000;
    printifyImageHeight = imageData.height || 1000;
    
    console.log('Image uploaded successfully to Printify with ID:', printifyImageId);
    
    if (createBtn) {
      createBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    alert(`Error uploading image: ${error.message}`);
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Product';
    }
    return;
  }
  
  // Get selected variants
  const selectedVariants = [];
  const variantCheckboxes = document.querySelectorAll('.variant-item input[type="checkbox"]:checked');
  const variantPrices = document.querySelectorAll('.variant-item .variant-price');
  
  if (variantCheckboxes.length === 0) {
    alert('Please select at least one variant.');
    return;
  }
  
  variantCheckboxes.forEach(checkbox => {
    const variantId = parseInt(checkbox.dataset.variantId, 10);
    let price = 1999;
    
    variantPrices.forEach(priceInput => {
      if (parseInt(priceInput.dataset.variantId, 10) === variantId) {
        price = Math.round(parseFloat(priceInput.value) * 100);
      }
    });
    
    selectedVariants.push({
      id: variantId,
      price: price,
      is_enabled: true
    });
  });
  
  // Prepare print areas with the new image ID
  const printAreasArray = [];
  const variantIds = selectedVariants.map(v => v.id);
  
  // This example assumes one design is applied to the selected print area
  const position = selectedPrintAreaPosition || 'front'; 
  
  let scale = 1;
  if (printifyImageWidth && printifyImageHeight && selectedPrintAreaWidth && selectedPrintAreaHeight) {
      const widthRatio = selectedPrintAreaWidth / printifyImageWidth;
      const heightRatio = selectedPrintAreaHeight / printifyImageHeight;
      scale = Math.min(widthRatio, heightRatio) * 0.9;
      scale = Math.max(0.1, Math.min(1.0, scale));
  }
  
  printAreasArray.push({
    variant_ids: variantIds,
    placeholders: [{
      position: position,
      images: [{ 
        id: printifyImageId,
        x: 0.5,
        y: 0.5,
        scale: scale,
        angle: 0
      }]
    }]
  });

  const blueprintId = document.getElementById('blueprintSelect').value;
  const printProviderId = document.getElementById('providerSelect').value;
  const title = document.getElementById('productTitle').value.trim();
  const description = document.getElementById('productDescription').value.trim() || title;
  
  const productData = {
    title,
    description,
    blueprint_id: parseInt(blueprintId),
    print_provider_id: parseInt(printProviderId),
    variants: selectedVariants,
    print_areas: printAreasArray
  };
  
  console.log('Creating product with payload:', JSON.stringify(productData));
  
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
      if (document.activeElement) document.activeElement.blur();
      productCreatedModal.show();
      resetProductForm();
    } else {
      console.error('Error creating product:', result);
      alert(`Error creating product: ${result.message || JSON.stringify(result.errors)}`);
    }
  } catch (error) {
    console.error('Error in fetch call for product creation:', error);
    alert('An unexpected error occurred while creating the product.');
  } finally {
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = 'Create Product';
      }
  }
}

// Publish Product
async function publishProduct() {
  if (!currentProduct || !currentProduct.id) {
    alert('No product to publish');
    return;
  }
  
  const publishBtn = document.getElementById('publishProductBtn');
  
  try {
    if (publishBtn) {
      publishBtn.disabled = true;
      publishBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Publishing...';
    }
    
    const publishData = {
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
      shipping_template: true
    };
    
    const response = await fetch(`${API_BASE}/shops/${selectedShopId}/products/${currentProduct.id}/publish.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(publishData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
        // The "publishing_succeeded" step is often not required and can cause issues.
        // The standard publish call is usually sufficient.
        console.log('Publish command sent successfully:', data);
        productCreatedModal.hide();
        setTimeout(() => {
            alert('Product published successfully! It may take a few moments to appear in your store.');
            loadProducts();
            resetProductForm();
        }, 300);
    } else {
      console.error('Error publishing product:', data);
      alert(`Error publishing product: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error publishing product:', error);
    alert('Error publishing product. Please try again.');
  } finally {
      if (publishBtn) {
        publishBtn.disabled = false;
        publishBtn.innerHTML = 'Publish Now';
    }
  }
}

// Update Product (Load data into form)
async function updateProduct(productId) {
  if (!selectedShopId || !printifyApiKey || !productId) {
    alert('Missing required information to update the product');
    return;
  }
  
  try {
    console.log(`Fetching product ${productId} for shop ${selectedShopId}`);
    const url = `${API_BASE}/shops/${selectedShopId}/products/${productId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    
    const productData = await response.json();
    const product = productData.product || productData;
    
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product data received');
    }
    
    currentProduct = product;
    
    console.log('Product data retrieved for update:', product);
    
    document.getElementById('create-tab').click();
    
    // Populate form
    document.getElementById('productTitle').value = product.title || '';
    document.getElementById('productDescription').value = product.description || '';
    
    // Set blueprint and trigger provider load
    blueprintSelect.value = product.blueprint_id;
    await handleBlueprintSelection(); // Wait for providers to load
    
    // Set provider and trigger variant load
    providerSelect.value = product.print_provider_id;
    await loadVariants(); // Wait for variants to load
    
    // Update variants in the form with existing data
    const variantCheckboxes = document.querySelectorAll('.variant-item input[type="checkbox"]');
    const variantPrices = document.querySelectorAll('.variant-item .variant-price');
    
    variantCheckboxes.forEach(checkbox => {
        const variantId = parseInt(checkbox.dataset.variantId);
        const productVariant = product.variants.find(v => v.id === variantId);
        if (productVariant) {
            checkbox.checked = productVariant.is_enabled;
            variantPrices.forEach(priceInput => {
                if(parseInt(priceInput.dataset.variantId) === variantId) {
                    priceInput.value = (productVariant.price / 100).toFixed(2);
                }
            });
        } else {
            checkbox.checked = false;
        }
    });

    // Update button to "Update" mode
    const createBtn = document.getElementById('createProductBtn');
    if (createBtn) {
      createBtn.textContent = 'Update Product';
      createBtn.dataset.mode = 'update';
      createBtn.dataset.productId = productId;
      // An existing product doesn't need a new design to be selected to update
      createBtn.disabled = false; 
    }
  } catch (error) {
    console.error('Error fetching product data for update:', error);
    alert(`Error fetching product data: ${error.message}`);
    resetProductForm();
  }
}

// ==================================================================
//               CORRECTED updateExistingProduct FUNCTION
// ==================================================================
async function updateExistingProduct(productId) {
  if (!selectedShopId || !printifyApiKey || !productId) {
    alert('Missing required information to update the product');
    return;
  }

  const createBtn = document.getElementById('createProductBtn');
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...`;
  }

  try {
    // 1. Fetch the full, current product data
    console.log(`Fetching full product details for update: ${productId}`);
    const productResponse = await fetch(`${API_BASE}/shops/${selectedShopId}/products/${productId}`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });

    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product details: ${productResponse.status}`);
    }
    const fullProductData = await productResponse.json();
    const existingProduct = fullProductData.product || fullProductData;

    // 2. Check if a NEW design has been selected to upload and replace the old one
    let imageIdToUse;
    if (selectedDesignOriginalUrl) {
        console.log('New design selected. Uploading to Printify to get a new ID...');
        const uploadResponse = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${printifyApiKey}` },
            body: JSON.stringify({
                fileName: `design_update_${Date.now()}.png`,
                imageUrl: selectedDesignOriginalUrl
            })
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload new design for update.');
        const uploadResult = await uploadResponse.json();
        imageIdToUse = (uploadResult.image || uploadResult).id;
        console.log(`Using new uploaded image ID: ${imageIdToUse}`);
    } else {
        // 3. NO new design. Find the EXISTING image ID from the product data.
        console.log('No new design selected. Finding existing image ID...');
        if (existingProduct.print_areas && existingProduct.print_areas[0]?.placeholders[0]?.images[0]?.id) {
            imageIdToUse = existingProduct.print_areas[0].placeholders[0].images[0].id;
            console.log(`Found existing image ID in print_areas: ${imageIdToUse}`);
        } else {
            throw new Error('Could not find an existing image ID in the product data. Cannot update without an image.');
        }
    }

    if (!imageIdToUse) {
        throw new Error('Failed to determine which image ID to use for the update.');
    }

    // 4. Get variants and other data from the form
    const selectedVariants = [];
    document.querySelectorAll('.variant-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const priceInput = item.querySelector('.variant-price');
        const variantId = parseInt(checkbox.dataset.variantId);
        
        selectedVariants.push({
            id: variantId,
            price: Math.round(parseFloat(priceInput.value) * 100),
            is_enabled: checkbox.checked
        });
    });

    const variantIds = selectedVariants.filter(v => v.is_enabled).map(v => v.id);

    // 5. Build the update payload using data from the form and the correct image ID
    const updatePayload = {
      title: document.getElementById('productTitle').value.trim(),
      description: document.getElementById('productDescription').value.trim(),
      blueprint_id: existingProduct.blueprint_id,
      print_provider_id: existingProduct.print_provider_id,
      variants: selectedVariants,
      print_areas: [{
        variant_ids: variantIds,
        placeholders: [{
          position: selectedPrintAreaPosition || 'front',
          images: [{
            id: imageIdToUse,
            x: 0.5,
            y: 0.5,
            scale: 1, // You might want to recalculate scale if image dimensions change
            angle: 0
          }]
        }]
      }]
    };
    
    console.log('Sending update payload:', JSON.stringify(updatePayload));
    
    // 6. Send the PUT request
    const updateResponse = await fetch(`${API_BASE}/shops/${selectedShopId}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('Update error details:', errorData);
      throw new Error(errorData.message || `HTTP error ${updateResponse.status}`);
    }
    
    const data = await updateResponse.json();
    console.log('Product update successful:', data);
    
    alert(`Product "${updatePayload.title}" updated successfully!`);
    resetProductForm();
    loadProducts(); // Refresh the products list
    
  } catch (error) {
    console.error('Error updating product:', error);
    alert(`Error updating product: ${error.message}`);
  } finally {
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Product';
      createBtn.dataset.mode = 'create';
      delete createBtn.dataset.productId;
    }
  }
}

// Reset Product Form
function resetProductForm() {
  // Reset form fields
  if(createProductForm) createProductForm.reset();
  if(blueprintSelect) blueprintSelect.selectedIndex = 0;

  // Reset create button to normal mode
  const createBtn = document.getElementById('createProductBtn');
  if (createBtn) {
    createBtn.textContent = 'Create Product';
    createBtn.dataset.mode = 'create';
    delete createBtn.dataset.productId;
  }
  
  // Reset UI sections
  if(providerSelect) {
      providerSelect.innerHTML = '<option selected disabled value="">Select product type first...</option>';
      providerSelect.disabled = true;
  }
  if(variantsList) variantsList.innerHTML = '<p class="text-muted">Select a product type and print provider to see available variants</p>';
  if(printAreasList) printAreasList.innerHTML = '<p class="text-muted">Select a product type to see available print areas</p>';
  
  const designGenSection = document.getElementById('designGenSection');
  if (designGenSection) designGenSection.remove();
  
  const generatedDesignsContainer = document.getElementById('generatedDesigns');
  if(generatedDesignsContainer) generatedDesignsContainer.innerHTML = '';

  // Reset global state variables
  selectedDesignId = null;
  selectedDesignUrl = null;
  selectedDesignOriginalUrl = null;
  currentProduct = null;
  generatedDesigns = [];
  
  updateCreateProductButton();

  // Switch back to the products tab
  document.getElementById('products-tab').click();
}