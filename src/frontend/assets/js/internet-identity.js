/**
 * Internet Identity Authentication Client
 * A simplified implementation that works without external dependencies
 */

// Global variables
window.INTERNET_IDENTITY_URL = 'https://identity.ic0.app';
window.authClient = null;

// Mock implementation of the AuthClient for Internet Identity
class AuthClient {
  constructor() {
    this.isLoggedIn = false;
    this.identity = null;
    this.principal = null;
  }

  static async create() {
    console.log('Creating AuthClient...');
    return new AuthClient();
  }

  async isAuthenticated() {
    return this.isLoggedIn;
  }

  async login(options = {}) {
    const identityProviderUrl = options.identityProvider || window.INTERNET_IDENTITY_URL;
    
    return new Promise((resolve, reject) => {
      try {
        // Open the Internet Identity provider in a new window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const features = `toolbar=0,location=0,menubar=0,width=${width},height=${height},left=${left},top=${top}`;
        
        const authWindow = window.open(identityProviderUrl, 'Internet Identity', features);
        
        if (!authWindow) {
          reject(new Error('Failed to open authentication window. Please disable popup blocker and try again.'));
          return;
        }
        
        // Function to check if the window was closed
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            reject(new Error('Authentication was cancelled.'));
          }
        }, 500);
        
        // Handle the message from the identity provider
        const handleMessage = (event) => {
          // Only accept messages from the identity provider
          if (event.origin !== new URL(identityProviderUrl).origin) {
            return;
          }
          
          // Process the authentication response
          if (event.data && event.data.type === 'authorize-ready') {
            // This is just a mock implementation - in a real scenario, 
            // we would process the delegation and create a proper identity
            this.isLoggedIn = true;
            this.principal = 'mock-principal-id-' + Math.random().toString(36).substring(2, 15);
            this.identity = {
              getPrincipal: () => ({
                toString: () => this.principal
              })
            };
            
            // Clean up
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            authWindow.close();
            
            // Call the success callback
            if (options.onSuccess) {
              options.onSuccess();
            }
            resolve();
          }
        };
        
        // Listen for messages from the identity provider
        window.addEventListener('message', handleMessage);
        
        // For demo purposes, simulate a successful login after 2 seconds
        // In a real implementation, this would come from the identity provider
        setTimeout(() => {
          const mockEvent = {
            origin: new URL(identityProviderUrl).origin,
            data: { type: 'authorize-ready' }
          };
          handleMessage(mockEvent);
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  }

  getIdentity() {
    return this.identity;
  }

  async logout() {
    this.isLoggedIn = false;
    this.identity = null;
    this.principal = null;
    return Promise.resolve();
  }
}

// Expose the AuthClient to the window
window.AuthClient = AuthClient;

// Initialize the auth client when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing Internet Identity authentication...');
    window.authClient = await AuthClient.create();
    console.log('AuthClient initialized successfully');
    
    // Check if user is already authenticated (in a real implementation)
    const isAuthenticated = await window.authClient.isAuthenticated();
    console.log('User is authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      const identity = window.authClient.getIdentity();
      const principal = identity.getPrincipal().toString();
      console.log('User principal:', principal);
    }
  } catch (error) {
    console.error('Error initializing AuthClient:', error);
  }
});
