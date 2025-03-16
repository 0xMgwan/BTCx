/**
 * ckBTC UI Integration
 * 
 * This module provides UI components and handlers for the ckBTC integration.
 */

class CKBTCUserInterface {
    constructor() {
        this.ckbtcIntegration = null;
        this.isInitialized = false;
    }
    
    /**
     * Initialize the ckBTC UI integration
     * @param {Identity} identity - The user's Internet Identity
     */
    async initialize(identity) {
        try {
            // Create and initialize the ckBTC integration
            this.ckbtcIntegration = new window.CKBTCIntegration();
            const initialized = await this.ckbtcIntegration.initialize(identity);
            
            if (!initialized) {
                throw new Error('Failed to initialize ckBTC integration');
            }
            
            this.isInitialized = true;
            console.log('ckBTC UI integration initialized');
            
            // Update the UI with the current balance
            await this.updateBalanceDisplay();
            
            // Set up event listeners
            this._setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize ckBTC UI:', error);
            return false;
        }
    }
    
    /**
     * Set up event listeners for UI interactions
     * @private
     */
    _setupEventListeners() {
        // Send ckBTC form
        const sendForm = document.getElementById('send-ckbtc-form');
        if (sendForm) {
            sendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const recipient = document.getElementById('ckbtc-recipient').value;
                const amount = document.getElementById('ckbtc-amount').value;
                
                await this.sendCKBTC(recipient, amount);
            });
        }
        
        // Convert BTC to ckBTC form
        const convertToForm = document.getElementById('convert-to-ckbtc-form');
        if (convertToForm) {
            convertToForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.convertBTCtoCKBTC();
            });
        }
        
        // Convert ckBTC to BTC form
        const convertFromForm = document.getElementById('convert-from-ckbtc-form');
        if (convertFromForm) {
            convertFromForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btcAddress = document.getElementById('btc-address').value;
                const amount = document.getElementById('convert-amount').value;
                
                await this.convertCKBTCtoBTC(btcAddress, amount);
            });
        }
        
        // Refresh balance button
        const refreshButton = document.getElementById('refresh-ckbtc-balance');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                await this.updateBalanceDisplay();
            });
        }
        
        // Transaction history button
        const historyButton = document.getElementById('view-ckbtc-history');
        if (historyButton) {
            historyButton.addEventListener('click', async () => {
                await this.loadTransactionHistory();
            });
        }
    }
    
    /**
     * Update the balance display in the UI
     */
    async updateBalanceDisplay() {
        if (!this.isInitialized) {
            console.error('ckBTC UI not initialized');
            return;
        }
        
        try {
            const balanceElement = document.getElementById('ckbtc-balance');
            if (!balanceElement) return;
            
            balanceElement.innerHTML = '<span class="animate-pulse">Loading...</span>';
            
            const balance = await this.ckbtcIntegration.getBalance();
            
            if (balance.success) {
                balanceElement.textContent = `${balance.ckBTC.toFixed(8)} ckBTC`;
                
                // Also update any other balance displays
                const balanceDisplays = document.querySelectorAll('.ckbtc-balance-display');
                balanceDisplays.forEach(display => {
                    display.textContent = balance.ckBTC.toFixed(8);
                });
            } else {
                balanceElement.innerHTML = '<span class="text-red-500">Error loading balance</span>';
            }
        } catch (error) {
            console.error('Failed to update balance display:', error);
            const balanceElement = document.getElementById('ckbtc-balance');
            if (balanceElement) {
                balanceElement.innerHTML = '<span class="text-red-500">Error loading balance</span>';
            }
        }
    }
    
    /**
     * Send ckBTC to another account
     * @param {string} recipient - Recipient's principal ID
     * @param {number|string} amount - Amount in ckBTC
     */
    async sendCKBTC(recipient, amount) {
        if (!this.isInitialized) {
            this._showNotification('ckBTC integration not initialized', 'error');
            return;
        }
        
        try {
            const sendButton = document.getElementById('send-ckbtc-button');
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.innerHTML = '<span class="animate-spin mr-2">⟳</span> Sending...';
            }
            
            const result = await this.ckbtcIntegration.sendCKBTC(recipient, amount);
            
            if (result.success) {
                this._showNotification(`Successfully sent ${amount} ckBTC to ${recipient}`, 'success');
                
                // Clear the form
                const recipientInput = document.getElementById('ckbtc-recipient');
                const amountInput = document.getElementById('ckbtc-amount');
                if (recipientInput) recipientInput.value = '';
                if (amountInput) amountInput.value = '';
                
                // Update the balance
                await this.updateBalanceDisplay();
                
                // Update transaction history if visible
                const historyContainer = document.getElementById('ckbtc-transaction-history');
                if (historyContainer && historyContainer.style.display !== 'none') {
                    await this.loadTransactionHistory();
                }
            } else {
                this._showNotification(`Failed to send ckBTC: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error sending ckBTC:', error);
            this._showNotification(`Error sending ckBTC: ${error.message}`, 'error');
        } finally {
            const sendButton = document.getElementById('send-ckbtc-button');
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.textContent = 'Send ckBTC';
            }
        }
    }
    
    /**
     * Convert BTC to ckBTC
     */
    async convertBTCtoCKBTC() {
        if (!this.isInitialized) {
            this._showNotification('ckBTC integration not initialized', 'error');
            return;
        }
        
        try {
            const convertButton = document.getElementById('convert-to-ckbtc-button');
            if (convertButton) {
                convertButton.disabled = true;
                convertButton.innerHTML = '<span class="animate-spin mr-2">⟳</span> Processing...';
            }
            
            const result = await this.ckbtcIntegration.convertBTCtoCKBTC();
            
            if (result.success) {
                // Show the BTC address to deposit to
                const addressContainer = document.getElementById('btc-deposit-address');
                if (addressContainer) {
                    addressContainer.textContent = result.btcAddress;
                    
                    // Generate QR code if qrcode.js is available
                    const qrContainer = document.getElementById('btc-deposit-qr');
                    if (qrContainer && window.QRCode) {
                        qrContainer.innerHTML = '';
                        new window.QRCode(qrContainer, {
                            text: result.btcAddress,
                            width: 128,
                            height: 128
                        });
                    }
                    
                    // Show the deposit instructions
                    const instructionsElement = document.getElementById('btc-deposit-instructions');
                    if (instructionsElement) {
                        instructionsElement.classList.remove('hidden');
                    }
                }
                
                this._showNotification('BTC deposit address generated successfully', 'success');
            } else {
                this._showNotification(`Failed to generate BTC address: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error converting BTC to ckBTC:', error);
            this._showNotification(`Error generating BTC address: ${error.message}`, 'error');
        } finally {
            const convertButton = document.getElementById('convert-to-ckbtc-button');
            if (convertButton) {
                convertButton.disabled = false;
                convertButton.textContent = 'Get BTC Deposit Address';
            }
        }
    }
    
    /**
     * Convert ckBTC to BTC
     * @param {string} btcAddress - Bitcoin address to receive the BTC
     * @param {number|string} amount - Amount in ckBTC
     */
    async convertCKBTCtoBTC(btcAddress, amount) {
        if (!this.isInitialized) {
            this._showNotification('ckBTC integration not initialized', 'error');
            return;
        }
        
        try {
            const convertButton = document.getElementById('convert-from-ckbtc-button');
            if (convertButton) {
                convertButton.disabled = true;
                convertButton.innerHTML = '<span class="animate-spin mr-2">⟳</span> Processing...';
            }
            
            const result = await this.ckbtcIntegration.convertCKBTCtoBTC(btcAddress, amount);
            
            if (result.success) {
                this._showNotification(`Successfully initiated withdrawal of ${amount} ckBTC to ${btcAddress}`, 'success');
                
                // Clear the form
                const addressInput = document.getElementById('btc-address');
                const amountInput = document.getElementById('convert-amount');
                if (addressInput) addressInput.value = '';
                if (amountInput) amountInput.value = '';
                
                // Update the balance
                await this.updateBalanceDisplay();
                
                // Show withdrawal details
                const detailsElement = document.getElementById('btc-withdrawal-details');
                if (detailsElement) {
                    detailsElement.innerHTML = `
                        <div class="p-4 bg-green-50 border border-green-200 rounded-lg mt-4">
                            <h4 class="font-bold text-green-800 mb-2">Withdrawal Initiated</h4>
                            <p class="text-sm text-green-700 mb-1">Amount: ${result.amount} BTC</p>
                            <p class="text-sm text-green-700 mb-1">Fee: ${result.fee} BTC</p>
                            <p class="text-sm text-green-700 mb-1">To: ${result.btcAddress}</p>
                            <p class="text-sm text-green-700">Transaction will be processed on the Bitcoin network shortly.</p>
                        </div>
                    `;
                    detailsElement.classList.remove('hidden');
                }
            } else {
                this._showNotification(`Failed to withdraw ckBTC: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error converting ckBTC to BTC:', error);
            this._showNotification(`Error withdrawing ckBTC: ${error.message}`, 'error');
        } finally {
            const convertButton = document.getElementById('convert-from-ckbtc-button');
            if (convertButton) {
                convertButton.disabled = false;
                convertButton.textContent = 'Withdraw to BTC';
            }
        }
    }
    
    /**
     * Load transaction history
     * @param {number} limit - Maximum number of transactions to load
     */
    async loadTransactionHistory(limit = 10) {
        if (!this.isInitialized) {
            this._showNotification('ckBTC integration not initialized', 'error');
            return;
        }
        
        try {
            const historyContainer = document.getElementById('ckbtc-transaction-history');
            if (!historyContainer) return;
            
            historyContainer.innerHTML = '<div class="text-center py-4"><span class="animate-pulse">Loading transaction history...</span></div>';
            
            const result = await this.ckbtcIntegration.getTransactionHistory(limit);
            
            if (result.success) {
                if (result.transactions.length === 0) {
                    historyContainer.innerHTML = '<div class="text-center py-4 text-gray-500">No transactions found</div>';
                    return;
                }
                
                // Create a table for the transactions
                let tableHtml = `
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                `;
                
                result.transactions.forEach(tx => {
                    const date = new Date(tx.timestamp);
                    const formattedDate = date.toLocaleString();
                    
                    let typeClass = '';
                    let amountPrefix = '';
                    
                    if (tx.type === 'Transfer') {
                        if (tx.from === this.ckbtcIntegration.identity.getPrincipal().toString()) {
                            typeClass = 'text-red-600';
                            amountPrefix = '-';
                        } else {
                            typeClass = 'text-green-600';
                            amountPrefix = '+';
                        }
                    } else if (tx.type === 'Mint') {
                        typeClass = 'text-green-600';
                        amountPrefix = '+';
                    } else if (tx.type === 'Burn') {
                        typeClass = 'text-red-600';
                        amountPrefix = '-';
                    }
                    
                    let statusClass = '';
                    let statusText = '';
                    
                    if (tx.status === 'Confirmed') {
                        statusClass = 'text-green-600';
                        statusText = 'Confirmed';
                    } else if (tx.status === 'Pending') {
                        statusClass = 'text-yellow-600';
                        statusText = 'Pending';
                    } else {
                        statusClass = 'text-red-600';
                        statusText = 'Failed';
                    }
                    
                    tableHtml += `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm ${typeClass} font-medium">${tx.type}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm ${typeClass} font-medium">${amountPrefix}${tx.amount.toFixed(8)} ckBTC</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm ${statusClass}">${statusText}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button class="text-blue-600 hover:text-blue-800" 
                                        onclick="showTransactionDetails('${tx.id}', '${tx.type}', '${tx.from}', '${tx.to}', ${tx.amount}, ${tx.fee}, '${formattedDate}')">
                                    View
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                tableHtml += `
                        </tbody>
                    </table>
                `;
                
                historyContainer.innerHTML = tableHtml;
            } else {
                historyContainer.innerHTML = `<div class="text-center py-4 text-red-500">Error loading transactions: ${result.error}</div>`;
            }
        } catch (error) {
            console.error('Error loading transaction history:', error);
            const historyContainer = document.getElementById('ckbtc-transaction-history');
            if (historyContainer) {
                historyContainer.innerHTML = `<div class="text-center py-4 text-red-500">Error loading transactions: ${error.message}</div>`;
            }
        }
    }
    
    /**
     * Show a notification to the user
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, info)
     * @private
     */
    _showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out';
        
        // Set color based on type
        if (type === 'success') {
            notification.className += ' bg-green-100 border-l-4 border-green-500 text-green-700';
        } else if (type === 'error') {
            notification.className += ' bg-red-100 border-l-4 border-red-500 text-red-700';
        } else {
            notification.className += ' bg-blue-100 border-l-4 border-blue-500 text-blue-700';
        }
        
        // Set content
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="text-sm font-medium">${message}</span>
                </div>
                <button class="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add click event to close button
        const closeButton = notification.querySelector('button');
        closeButton.addEventListener('click', () => {
            notification.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

// Create a global function to show transaction details
window.showTransactionDetails = function(id, type, from, to, amount, fee, date) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('transaction-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transaction-details-modal';
        modal.className = 'fixed inset-0 z-50 overflow-y-auto hidden';
        modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div class="fixed inset-0 transition-opacity">
                    <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span class="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Transaction Details
                                </h3>
                                <div class="mt-4 space-y-3" id="modal-content">
                                    <!-- Content will be inserted here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" id="modal-close">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add click event to close button
        const closeButton = modal.querySelector('#modal-close');
        closeButton.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    // Fill in the details
    const content = modal.querySelector('#modal-content');
    
    let typeClass = type === 'Mint' ? 'text-green-600' : (type === 'Burn' ? 'text-red-600' : '');
    let amountClass = type === 'Transfer' && from === window.authClient?.getIdentity()?.getPrincipal().toString() ? 'text-red-600' : 'text-green-600';
    
    content.innerHTML = `
        <div class="grid grid-cols-3 gap-4 text-sm">
            <div class="font-medium text-gray-500">Transaction ID:</div>
            <div class="col-span-2">${id}</div>
            
            <div class="font-medium text-gray-500">Date:</div>
            <div class="col-span-2">${date}</div>
            
            <div class="font-medium text-gray-500">Type:</div>
            <div class="col-span-2 ${typeClass} font-medium">${type}</div>
            
            <div class="font-medium text-gray-500">Amount:</div>
            <div class="col-span-2 ${amountClass} font-medium">${amount.toFixed(8)} ckBTC</div>
            
            ${fee ? `
                <div class="font-medium text-gray-500">Fee:</div>
                <div class="col-span-2">${fee.toFixed(8)} ckBTC</div>
            ` : ''}
            
            ${from ? `
                <div class="font-medium text-gray-500">From:</div>
                <div class="col-span-2 break-all">${from}</div>
            ` : ''}
            
            ${to ? `
                <div class="font-medium text-gray-500">To:</div>
                <div class="col-span-2 break-all">${to}</div>
            ` : ''}
        </div>
    `;
    
    // Show the modal
    modal.classList.remove('hidden');
};

// Export the ckBTC UI class
window.CKBTCUserInterface = CKBTCUserInterface;
