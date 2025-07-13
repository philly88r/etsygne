// Test script for state persistence
console.log('Running state persistence test...');

// Function to check if the API key is properly stored and retrieved
function testApiKeyPersistence() {
  console.log('Testing API key persistence...');
  
  // Check if API key exists in sessionStorage
  const storedApiKey = sessionStorage.getItem('printifyApiKey');
  console.log('API key in sessionStorage:', storedApiKey ? 'Yes (key exists)' : 'No (key missing)');
  
  // Check if API key exists in global variable
  console.log('API key in global variable:', printifyApiKey ? 'Yes (key exists)' : 'No (key missing)');
  
  // Check if they match
  if (storedApiKey && printifyApiKey) {
    console.log('API keys match:', storedApiKey === printifyApiKey);
  }
}

// Function to check if the application state is properly stored and retrieved
function testStatePersistence() {
  console.log('Testing application state persistence...');
  
  // Check if state exists in sessionStorage
  const storedState = sessionStorage.getItem('printifyAppState');
  console.log('App state in sessionStorage:', storedState ? 'Yes (state exists)' : 'No (state missing)');
  
  // Parse and display the stored state
  if (storedState) {
    try {
      const appState = JSON.parse(storedState);
      console.log('Stored state summary:');
      console.log('- API key:', appState.printifyApiKey ? 'Present' : 'Missing');
      console.log('- Selected shop ID:', appState.selectedShopId || 'None');
      console.log('- Selected design:', appState.selectedDesignUrl ? 'Present' : 'None');
      console.log('- Generated designs count:', appState.generatedDesigns ? appState.generatedDesigns.length : 0);
      console.log('- Assigned designs count:', appState.assignedDesigns ? Object.keys(appState.assignedDesigns).length : 0);
    } catch (error) {
      console.error('Error parsing stored state:', error);
    }
  }
}

// Function to simulate a page refresh and verify that the state is restored
function simulatePageRefresh() {
  console.log('Simulating page refresh...');
  
  // Store the current state for comparison
  const beforeRefresh = {
    apiKey: printifyApiKey,
    shopId: selectedShopId,
    designUrl: selectedDesignUrl,
    generatedDesignsCount: generatedDesigns ? generatedDesigns.length : 0,
    assignedDesignsCount: assignedDesigns ? Object.keys(assignedDesigns).length : 0
  };
  
  console.log('State before refresh:', beforeRefresh);
  
  // Simulate a page refresh by calling loadStateFromStorage
  const stateRestored = loadStateFromStorage();
  console.log('State restored successfully:', stateRestored);
  
  // Check the state after "refresh"
  const afterRefresh = {
    apiKey: printifyApiKey,
    shopId: selectedShopId,
    designUrl: selectedDesignUrl,
    generatedDesignsCount: generatedDesigns ? generatedDesigns.length : 0,
    assignedDesignsCount: assignedDesigns ? Object.keys(assignedDesigns).length : 0
  };
  
  console.log('State after refresh:', afterRefresh);
  
  // Compare states
  console.log('States match:',
    beforeRefresh.apiKey === afterRefresh.apiKey &&
    beforeRefresh.shopId === afterRefresh.shopId &&
    beforeRefresh.designUrl === afterRefresh.designUrl &&
    beforeRefresh.generatedDesignsCount === afterRefresh.generatedDesignsCount &&
    beforeRefresh.assignedDesignsCount === afterRefresh.assignedDesignsCount
  );
}

// Run the tests
document.addEventListener('DOMContentLoaded', function() {
  // Add a button to run the tests
  const testButton = document.createElement('button');
  testButton.id = 'run-state-tests';
  testButton.className = 'btn btn-info btn-sm';
  testButton.innerHTML = 'Run State Persistence Tests';
  testButton.style.position = 'fixed';
  testButton.style.bottom = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  
  testButton.addEventListener('click', function() {
    console.clear();
    testApiKeyPersistence();
    testStatePersistence();
    simulatePageRefresh();
  });
  
  document.body.appendChild(testButton);
  
  // Run initial test after a short delay to allow the app to initialize
  setTimeout(() => {
    console.log('Running initial state tests...');
    testApiKeyPersistence();
    testStatePersistence();
  }, 2000);
});
