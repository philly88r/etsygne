// This is a completely new file to bypass caching issues
console.log('fix.js loaded at', new Date().toLocaleString());

document.addEventListener('DOMContentLoaded', function() {
  // Add a visible indicator that this script is running
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.top = '0';
  indicator.style.right = '0';
  indicator.style.backgroundColor = 'blue'; // Changed to blue to show the new version
  indicator.style.color = 'white';
  indicator.style.padding = '10px';
  indicator.style.zIndex = '10000';
  indicator.textContent = 'PRINT AREA SELECTOR ACTIVE';
  document.body.appendChild(indicator);
  
  // Find all design cards and fix their click handlers
  setTimeout(function() {
    console.log('Looking for design cards to fix...');
    
    // Find all buttons with class select-design-btn
    const selectButtons = document.querySelectorAll('.select-design-btn');
    console.log('Found select buttons:', selectButtons.length);
    
    selectButtons.forEach(button => {
      // Make the button more visible
      button.className = 'btn btn-primary btn-lg w-100';
      button.textContent = 'ASSIGN TO PRINT AREA';
      button.style.fontSize = '16px';
      button.style.fontWeight = 'bold';
      button.style.zIndex = '9999';
      button.style.position = 'relative';
      
      // Remove all existing event listeners (not perfect but helps)
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add our new click handler
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the parent card
        const card = this.closest('.card');
        if (!card) {
          console.error('Could not find parent card');
          alert('Error: Could not find design card. Please try again.');
          return;
        }
        
        const designId = card.dataset.designId;
        console.log('FIXED BUTTON CLICKED for design ID:', designId);
        
        // Create and show the print area selection popup
        createPrintAreaPopup(designId);
      });
    });
    
    // Also add click handlers to the design cards themselves
    const designCards = document.querySelectorAll('.design-card');
    console.log('Found design cards:', designCards.length);
    
    designCards.forEach(card => {
      // Make sure the card has proper styling
      card.style.position = 'relative';
      card.style.zIndex = '9000';
      card.style.cursor = 'pointer';
      
      // Add click handler to the card
      card.addEventListener('click', function(e) {
        // Only handle clicks directly on the card, not on buttons
        if (e.target.tagName.toLowerCase() === 'button') {
          return;
        }
        
        const designId = this.dataset.designId;
        if (!designId) {
          console.error('No design ID found on card');
          return;
        }
        
        console.log('Design card clicked with ID:', designId);
        createPrintAreaPopup(designId);
      });
    });
    
    // Function to open the existing print area selection modal
    function createPrintAreaPopup(designId) {
      console.log('Opening print area selection modal for design ID:', designId);
      
      // Find the existing modal element
      const modalElement = document.getElementById('printAreaSelectionModal');
      console.log('Modal element:', modalElement);
      
      if (!modalElement) {
        console.error('Print area selection modal element not found in the DOM!');
        alert('Error: Modal not found. Please refresh the page and try again.');
        return;
      }
      
      // Store the design ID as a data attribute on the modal
      modalElement.dataset.designId = designId;
      
      // Get the print areas from the blueprint data
      const printAreas = window.currentBlueprintData?.print_areas || [];
      console.log('Print areas available for modal:', printAreas);
      
      // Get the modal body where we'll add the print areas
      const modalPrintAreasList = document.getElementById('modalPrintAreasList');
      if (!modalPrintAreasList) {
        console.error('Modal print areas list element not found');
        return;
      }
      
      // Clear existing content
      modalPrintAreasList.innerHTML = '';
      
      if (printAreas.length === 0) {
        modalPrintAreasList.innerHTML = '<div class="alert alert-warning">No print areas available for this product.</div>';
      } else {
        // Create a button for each print area
        printAreas.forEach(area => {
          const areaBtn = document.createElement('button');
          areaBtn.type = 'button';
          areaBtn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
          areaBtn.dataset.areaId = area.id;
          areaBtn.innerHTML = `
            <div>
              <h6 class="mb-1">${area.title || 'Print Area'}</h6>
              <small class="text-muted">${area.id}</small>
            </div>
            <span class="badge bg-primary rounded-pill">${area.height}×${area.width}</span>
          `;
          
          areaBtn.addEventListener('click', function() {
            const areaId = this.dataset.areaId;
            const designId = modalElement.dataset.designId;
            console.log(`Print area selected: ${areaId} for design: ${designId}`);
            
            if (typeof window.assignDesignToPrintArea === 'function') {
              window.assignDesignToPrintArea(designId, areaId);
              modal.hide();
            } else {
              console.error('assignDesignToPrintArea function not found');
              alert(`Selected print area: ${areaId} for design: ${designId}`);
              modal.hide();
            }
          });
          
          modalPrintAreasList.appendChild(areaBtn);
        });
      }
      
      // Create and show the Bootstrap modal
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }, 1000); // Wait 1 second for the page to fully load
});
