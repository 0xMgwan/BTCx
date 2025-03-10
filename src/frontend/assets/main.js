/**
 * Bitcoin Payment Gateway
 * A secure, non-custodial Bitcoin payment gateway using Internet Computer Protocol
 * 
 * This file contains the frontend logic for the Bitcoin Payment Gateway application,
 * handling authentication, payment processing, and user interface interactions.
 */

// Access DFINITY libraries from the global scope
const { Actor, HttpAgent } = window.ic.agent;
const AuthClient = window.ic.authClient.AuthClient;

// Canister IDs from HTML global variables
const canisterId = BTC_PAYMENT_CANISTER_ID;
const internetIdentityCanisterId = INTERNET_IDENTITY_CANISTER_ID;

// Define the interface for the backend canister
const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'createPaymentRequest': IDL.Func(
      [IDL.Nat64, IDL.Text, IDL.Text],
      [IDL.Text],
      [],
    ),
    'getPaymentDetails': IDL.Func(
      [IDL.Text],
      [
        IDL.Opt(
          IDL.Record({
            'amount': IDL.Nat64,
            'memo': IDL.Text,
            'payer': IDL.Principal,
            'recipient': IDL.Text,
            'status': IDL.Text,
            'timestamp': IDL.Int,
          })
        ),
      ],
      ['query'],
    ),
    'healthCheck': IDL.Func([], [IDL.Bool], ['query']),
    'listUserPayments': IDL.Func(
      [IDL.Principal],
      [
        IDL.Vec(
          IDL.Tuple(
            IDL.Text,
            IDL.Record({
              'amount': IDL.Nat64,
              'memo': IDL.Text,
              'payer': IDL.Principal,
              'recipient': IDL.Text,
              'status': IDL.Text,
              'timestamp': IDL.Int,
            })
          )
        ),
      ],
      ['query'],
    ),
    'updatePaymentStatus': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
  });
};

// Initialize variables
let authClient;
let actor;
let isAuthenticated = false;

// DOM Elements
const authButton = document.getElementById('auth-button');
const paymentForm = document.getElementById('payment-form');
const paymentStatus = document.getElementById('payment-status');
const paymentDetails = document.getElementById('payment-details');

// Create actor with the provided identity
function createActor(identity) {
    const agent = new HttpAgent({ identity, host: "http://127.0.0.1:8080" });
    
    // When deploying locally, we need to fetch the root key
    agent.fetchRootKey().catch(err => {
        console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
        console.error(err);
    });

    // Create an actor with the specified interface and canister ID
    return Actor.createActor(idlFactory, {
        agent,
        canisterId,
    });
}

// Initialize the auth client
async function initAuth() {
    try {
        authClient = await AuthClient.create();
        const authenticated = await authClient.isAuthenticated();
        
        if (authenticated) {
            await initActor();
        }
        
        updateAuthState(authenticated);
        console.log("Auth client initialized. Authenticated:", authenticated);
    } catch (error) {
        console.error("Failed to initialize auth client:", error);
    }
}

// Update UI based on authentication state
function updateAuthState(authenticated) {
    isAuthenticated = authenticated;
    if (authenticated) {
        authButton.textContent = 'Sign Out';
        if (paymentForm) paymentForm.classList.remove('hidden');
    } else {
        authButton.textContent = 'Sign In';
        if (paymentForm) paymentForm.classList.add('hidden');
        if (paymentStatus) paymentStatus.classList.add('hidden');
    }
}

// Handle authentication
async function handleAuth() {
    if (!authClient) {
        console.error("Auth client not initialized");
        alert("Auth client not initialized. Please refresh the page and try again.");
        return;
    }
    
    try {
        if (isAuthenticated) {
            await authClient.logout();
            actor = null;
            updateAuthState(false);
            console.log("User logged out");
        } else {
            // For testing, we'll just simulate a successful login
            console.log("Simulating login for testing purposes");
            alert("For this demo, we're simulating a successful login.");
            
            // Create a basic anonymous identity
            const anonymousIdentity = { 
                getPrincipal: () => new window.ic.Principal.Principal(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1])),
                transformRequest: (request) => request
            };
            
            // Initialize actor with anonymous identity
            actor = createActor(anonymousIdentity);
            updateAuthState(true);
            console.log("User logged in with anonymous identity");
            
            /* Uncomment this for actual Internet Identity login
            await authClient.login({
                identityProvider: `http://127.0.0.1:8080?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`,
                onSuccess: async () => {
                    await initActor();
                    updateAuthState(true);
                    console.log("User logged in successfully");
                },
                onError: (error) => {
                    console.error("Login failed:", error);
                    alert("Login failed. Please try again.");
                }
            });
            */
        }
    } catch (error) {
        console.error("Authentication error:", error);
        alert("Authentication error: " + error.message);
    }
}

// Initialize the actor
async function initActor() {
    try {
        const identity = await authClient.getIdentity();
        actor = createActor(identity);
        console.log("Actor initialized with identity", identity.getPrincipal().toString());
        
        // Verify connection by calling a simple query method
        try {
            const healthCheck = await actor.healthCheck();
            console.log("Canister health check:", healthCheck);
        } catch (err) {
            console.error("Health check failed:", err);
            // Try to call a different method
            try {
                const payments = await actor.listUserPayments(identity.getPrincipal());
                console.log("User payments:", payments);
            } catch (err2) {
                console.error("List payments failed:", err2);
            }
        }
    } catch (error) {
        console.error("Failed to initialize actor:", error);
    }
}

// Create payment request
async function createPayment() {
    if (!actor) return;

    const amount = document.getElementById('amount').value;
    const recipient = document.getElementById('recipient').value;
    const memo = document.getElementById('memo').value;

    try {
        // Convert BTC to Satoshis
        const satoshis = Math.floor(amount * 100000000);
        const paymentId = await actor.createPaymentRequest(satoshis, recipient, memo);
        
        // Show payment details
        displayPaymentDetails(paymentId, amount, recipient, memo);
        
        // Start monitoring payment status
        startPaymentMonitoring(paymentId);
    } catch (error) {
        console.error('Error creating payment:', error);
        alert('Failed to create payment request. Please try again.');
    }
}

// Display payment details
function displayPaymentDetails(paymentId, amount, recipient, memo) {
    paymentStatus.classList.remove('hidden');
    paymentDetails.innerHTML = `
        <p><strong>Payment ID:</strong> ${paymentId}</p>
        <p><strong>Amount:</strong> ${amount} BTC</p>
        <p><strong>Recipient:</strong> ${recipient}</p>
        <p><strong>Memo:</strong> ${memo}</p>
        <p><strong>Status:</strong> <span id="status-${paymentId}">Pending</span></p>
    `;
}

// Monitor payment status
async function startPaymentMonitoring(paymentId) {
    const statusElement = document.getElementById(`status-${paymentId}`);
    
    const checkStatus = async () => {
        try {
            const details = await actor.getPaymentDetails(paymentId);
            if (details) {
                statusElement.textContent = details.status;
                if (details.status === 'confirmed') {
                    return; // Stop monitoring
                }
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
        setTimeout(checkStatus, 10000); // Check every 10 seconds
    };

    checkStatus();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize authentication when the DOM is fully loaded
    initAuth();
    
    // Add event listener for auth button if it exists
    if (authButton) {
        authButton.addEventListener('click', handleAuth);
    } else {
        console.warn("Auth button not found in the DOM");
    }
    
    // Add event listener for payment submission if the element exists
    const submitPaymentButton = document.getElementById('submit-payment');
    if (submitPaymentButton) {
        submitPaymentButton.addEventListener('click', createPayment);
    }
});

// Helper function to format Bitcoin amounts
function formatBTC(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
    }).format(amount);
}
