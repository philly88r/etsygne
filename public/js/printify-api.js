/**
 * Printify API utility functions
 * This file contains functions for interacting with the Printify API
 */

/**
 * Fetch blueprint details from Printify API including print area dimensions
 * @param {string} blueprintId - The Printify blueprint ID
 * @param {string} printProviderId - The print provider ID
 * @returns {Promise<Object>} - Blueprint details with print area dimensions
 */
async function fetchBlueprintDetails(blueprintId, printProviderId) {
  try {
    // First get the blueprint details
    const blueprintResponse = await fetch(`/.netlify/functions/printify-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: `/v1/catalog/blueprints/${blueprintId}.json`,
        method: 'GET'
      })
    });

    if (!blueprintResponse.ok) {
      throw new Error(`Failed to fetch blueprint: ${blueprintResponse.status}`);
    }

    const blueprintData = await blueprintResponse.json();
    console.log('Blueprint data:', blueprintData);

    // Then get the variants which contain the print area placeholders with dimensions
    const variantsResponse = await fetch(`/.netlify/functions/printify-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: `/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
        method: 'GET'
      })
    });

    if (!variantsResponse.ok) {
      throw new Error(`Failed to fetch variants: ${variantsResponse.status}`);
    }

    const variantsData = await variantsResponse.json();
    console.log('Variants data:', variantsData);

    // Extract print area dimensions from the first variant's placeholders
    // Each placeholder represents a print area with position, width and height
    const printAreas = [];
    
    if (variantsData && variantsData.length > 0 && variantsData[0].placeholders) {
      variantsData[0].placeholders.forEach(placeholder => {
        printAreas.push({
          position: placeholder.position,
          width: placeholder.width,
          height: placeholder.height,
          id: `${blueprintId}-${placeholder.position}`
        });
      });
    }

    // Combine blueprint data with print area dimensions
    return {
      ...blueprintData,
      print_areas: printAreas
    };
  } catch (error) {
    console.error('Error fetching blueprint details:', error);
    throw error;
  }
}

/**
 * Get print area dimensions for a specific print area
 * @param {string} areaId - The print area ID
 * @returns {Object} - Object containing width and height of the print area
 */
function getPrintAreaDimensions(areaId) {
  // Check multiple possible sources for print area data
  let printAreas = [];
  
  if (window.currentBlueprintData && window.currentBlueprintData.print_areas) {
    printAreas = window.currentBlueprintData.print_areas;
  } else if (window.printAreas) {
    printAreas = window.printAreas;
  } else if (window.selectedProduct && window.selectedProduct.print_areas) {
    printAreas = window.selectedProduct.print_areas;
  }
  
  // Find the specific print area by ID
  const printArea = printAreas.find(area => area.id === areaId);
  
  if (printArea) {
    return {
      width: printArea.width || 0,
      height: printArea.height || 0
    };
  }
  
  // If we have placeholders data directly
  if (window.selectedProduct && window.selectedProduct.placeholders) {
    const placeholder = window.selectedProduct.placeholders.find(p => p.id === areaId || p.position === areaId);
    if (placeholder) {
      return {
        width: placeholder.width || 0,
        height: placeholder.height || 0
      };
    }
  }
  
  // Log that we couldn't find dimensions
  console.log(`Warning: Could not find dimensions for print area ${areaId}`);
  
  // Return null instead of zeros to indicate dimensions weren't found
  // This will help calling code know it needs to use its own fallbacks
  return null;
}

// Export functions for use in other files
window.fetchBlueprintDetails = fetchBlueprintDetails;
window.getPrintAreaDimensions = getPrintAreaDimensions;
