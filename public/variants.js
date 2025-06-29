// Load Variants when a print provider is selected
document.addEventListener('DOMContentLoaded', function() {
  const providerSelect = document.getElementById('provider-select');
  
  if (providerSelect) {
    providerSelect.addEventListener('change', async (e) => {
      const providerId = e.target.value;
      const blueprintId = document.getElementById('blueprint-select').value;
      
      if (!providerId || !blueprintId) return;
      
      try {
        console.log('Loading variants from:', `${API_BASE}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`);
        const response = await fetch(`${API_BASE}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`, {
          headers: {
            'Authorization': `Bearer ${printifyApiKey}`
          }
        });
        
        console.log('Variants response status:', response.status);
        const data = await response.json();
        console.log('Variants data:', data);
        
        if (data.success || data.variants) {
          const variantContainer = document.getElementById('variant-container');
          variantContainer.innerHTML = '';
          
          const variants = data.variants || (data.success && data.data) || [];
          console.log('Processed variants:', variants);
          
          variants.forEach(variant => {
            const variantDiv = document.createElement('div');
            variantDiv.className = 'form-check';
            
            const input = document.createElement('input');
            input.className = 'form-check-input';
            input.type = 'checkbox';
            input.id = `variant-${variant.id}`;
            input.value = variant.id;
            input.dataset.variantId = variant.id;
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `variant-${variant.id}`;
            label.textContent = `${variant.title} - $${variant.cost || '?'}`;
            
            variantDiv.appendChild(input);
            variantDiv.appendChild(label);
            variantContainer.appendChild(variantDiv);
          });
        } else {
          console.error('Error loading variants:', data.message || data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error loading variants:', error);
      }
    });
  }
});
