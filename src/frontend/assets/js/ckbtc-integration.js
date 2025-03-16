/**
 * ckBTC Integration Module
 * 
 * This module provides integration with ckBTC (Chain Key Bitcoin),
 * a trustless, non-custodial, 1:1 backed synthetic Bitcoin twin token
 * that utilizes ICRC1/ICRC2 token standards for fast and low-cost transactions.
 */

class CKBTCIntegration {
    constructor(options = {}) {
        // Default canister IDs for ckBTC ecosystem
        this.ledgerCanisterId = options.ledgerCanisterId || 'mxzaz-hqaaa-aaaar-qaada-cai'; // ckBTC Ledger canister
        this.minterCanisterId = options.minterCanisterId || 'mqygn-kiaaa-aaaar-qaadq-cai'; // ckBTC Minter canister
        this.indexCanisterId = options.indexCanisterId || 'n5wcd-faaaa-aaaar-qaaea-cai';   // ckBTC Index canister
        
        // Host for the IC network
        this.host = options.host || 'https://ic0.app';
        
        // Initialize actors when identity is available
        this.actors = {};
        this.identity = null;
        
        // Transaction fee in ckBTC (approximately $0.01)
        this.transactionFee = BigInt(10); // 10 e8s = 0.0000001 ckBTC
        
        console.log('ckBTC Integration initialized with ledger canister:', this.ledgerCanisterId);
    }
    
    /**
     * Initialize the ckBTC integration with user identity
     * @param {Identity} identity - The user's Internet Identity
     */
    async initialize(identity) {
        try {
            if (!identity) {
                throw new Error('Identity is required to initialize ckBTC integration');
            }
            
            this.identity = identity;
            console.log('Initializing ckBTC integration with identity');
            
            // Create actors for interacting with the canisters
            await this._createActors();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize ckBTC integration:', error);
            return false;
        }
    }
    
    /**
     * Create actors for interacting with the ckBTC canisters
     * @private
     */
    async _createActors() {
        try {
            // Check if the required libraries are available
            if (!window.ic || !window.ic.agent) {
                throw new Error('Agent-js libraries not available');
            }
            
            // Create an agent with the user's identity
            const agent = new window.ic.agent.HttpAgent({
                host: this.host,
                identity: this.identity
            });
            
            // In development, we might need to fetch the root key
            if (this.host.includes('localhost')) {
                await agent.fetchRootKey();
            }
            
            // Create actors for each canister
            this.actors.ledger = await window.ic.agent.Actor.createActor(idlFactories.ledger, {
                agent,
                canisterId: this.ledgerCanisterId
            });
            
            this.actors.minter = await window.ic.agent.Actor.createActor(idlFactories.minter, {
                agent,
                canisterId: this.minterCanisterId
            });
            
            this.actors.index = await window.ic.agent.Actor.createActor(idlFactories.index, {
                agent,
                canisterId: this.indexCanisterId
            });
            
            console.log('ckBTC actors created successfully');
        } catch (error) {
            console.error('Failed to create ckBTC actors:', error);
            throw error;
        }
    }
    
    /**
     * Get the ckBTC balance for the current user
     * @returns {Promise<Object>} Balance information
     */
    async getBalance() {
        try {
            if (!this.actors.ledger) {
                throw new Error('Ledger actor not initialized');
            }
            
            // Get the principal from the identity
            const principal = this.identity.getPrincipal();
            
            // Convert principal to account identifier (ICRC-1 standard)
            const accountIdentifier = this._principalToAccountIdentifier(principal);
            
            // Query the ledger for the balance
            const balance = await this.actors.ledger.icrc1_balance_of({
                owner: principal,
                subaccount: []
            });
            
            return {
                e8s: balance,
                ckBTC: Number(balance) / 100000000, // Convert e8s to ckBTC
                success: true
            };
        } catch (error) {
            console.error('Failed to get ckBTC balance:', error);
            return {
                e8s: BigInt(0),
                ckBTC: 0,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send ckBTC to another account
     * @param {string} to - Recipient's principal ID or account identifier
     * @param {number|string} amount - Amount in ckBTC
     * @returns {Promise<Object>} Transaction result
     */
    async sendCKBTC(to, amount) {
        try {
            if (!this.actors.ledger) {
                throw new Error('Ledger actor not initialized');
            }
            
            // Convert amount to e8s (1 ckBTC = 100,000,000 e8s)
            const amountE8s = BigInt(Math.floor(Number(amount) * 100000000));
            
            // Get the principal from the identity
            const senderPrincipal = this.identity.getPrincipal();
            
            // Convert recipient to principal if it's an account identifier
            let recipientPrincipal;
            try {
                recipientPrincipal = typeof to === 'string' ? 
                    window.ic.Principal.fromText(to) : to;
            } catch (error) {
                throw new Error('Invalid recipient principal ID');
            }
            
            // Create the transfer args
            const transferArgs = {
                from_subaccount: [],
                to: {
                    owner: recipientPrincipal,
                    subaccount: []
                },
                amount: amountE8s,
                fee: [this.transactionFee],
                memo: [BigInt(Date.now())],
                created_at_time: []
            };
            
            // Execute the transfer
            const result = await this.actors.ledger.icrc1_transfer(transferArgs);
            
            if ('Ok' in result) {
                return {
                    success: true,
                    blockHeight: result.Ok,
                    amount: Number(amountE8s) / 100000000,
                    fee: Number(this.transactionFee) / 100000000
                };
            } else {
                throw new Error(`Transfer failed: ${Object.keys(result.Err)[0]}`);
            }
        } catch (error) {
            console.error('Failed to send ckBTC:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Convert BTC to ckBTC
     * @param {string} btcAddress - Bitcoin address to receive the BTC
     * @returns {Promise<Object>} Conversion information
     */
    async convertBTCtoCKBTC(btcAddress) {
        try {
            if (!this.actors.minter) {
                throw new Error('Minter actor not initialized');
            }
            
            // Get the principal from the identity
            const principal = this.identity.getPrincipal();
            
            // Get a BTC address to deposit to
            const addressResult = await this.actors.minter.get_btc_address({
                owner: principal,
                subaccount: []
            });
            
            if ('Ok' in addressResult) {
                return {
                    success: true,
                    btcAddress: addressResult.Ok.address,
                    minConfirmations: addressResult.Ok.min_confirmations
                };
            } else {
                throw new Error(`Failed to get BTC address: ${Object.keys(addressResult.Err)[0]}`);
            }
        } catch (error) {
            console.error('Failed to initiate BTC to ckBTC conversion:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Convert ckBTC to BTC
     * @param {string} btcAddress - Bitcoin address to receive the BTC
     * @param {number|string} amount - Amount in ckBTC
     * @returns {Promise<Object>} Conversion information
     */
    async convertCKBTCtoBTC(btcAddress, amount) {
        try {
            if (!this.actors.minter) {
                throw new Error('Minter actor not initialized');
            }
            
            // Convert amount to e8s (1 ckBTC = 100,000,000 e8s)
            const amountE8s = BigInt(Math.floor(Number(amount) * 100000000));
            
            // Get the principal from the identity
            const principal = this.identity.getPrincipal();
            
            // Retrieve the withdrawal fee
            const feeResult = await this.actors.minter.estimate_withdrawal_fee({
                amount: amountE8s
            });
            
            if ('Ok' in feeResult) {
                const withdrawalFee = feeResult.Ok.bitcoin_fee;
                
                // Execute the withdrawal
                const withdrawalResult = await this.actors.minter.withdraw_btc({
                    address: btcAddress,
                    amount: amountE8s
                });
                
                if ('Ok' in withdrawalResult) {
                    return {
                        success: true,
                        btcAddress: btcAddress,
                        amount: Number(amountE8s) / 100000000,
                        fee: Number(withdrawalFee) / 100000000,
                        blockHeight: withdrawalResult.Ok.block_index
                    };
                } else {
                    throw new Error(`Withdrawal failed: ${Object.keys(withdrawalResult.Err)[0]}`);
                }
            } else {
                throw new Error(`Failed to estimate withdrawal fee: ${Object.keys(feeResult.Err)[0]}`);
            }
        } catch (error) {
            console.error('Failed to convert ckBTC to BTC:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get transaction history for the current user
     * @param {number} limit - Maximum number of transactions to retrieve
     * @returns {Promise<Object>} Transaction history
     */
    async getTransactionHistory(limit = 10) {
        try {
            if (!this.actors.index) {
                throw new Error('Index actor not initialized');
            }
            
            // Get the principal from the identity
            const principal = this.identity.getPrincipal();
            
            // Query the index canister for transactions
            const transactions = await this.actors.index.get_account_transactions({
                account: {
                    owner: principal,
                    subaccount: []
                },
                max_results: limit,
                start: []
            });
            
            if ('Ok' in transactions) {
                // Process and format the transactions
                const formattedTransactions = transactions.Ok.transactions.map(tx => {
                    const kind = Object.keys(tx.transaction.operation)[0];
                    const details = tx.transaction.operation[kind];
                    
                    return {
                        id: tx.id,
                        timestamp: Number(tx.transaction.timestamp) / 1000000, // Convert nanoseconds to milliseconds
                        type: kind,
                        amount: Number(details.amount) / 100000000,
                        fee: kind === 'Transfer' ? Number(details.fee) / 100000000 : 0,
                        from: kind === 'Transfer' ? details.from.toString() : '',
                        to: kind === 'Transfer' ? details.to.toString() : '',
                        memo: details.memo ? Number(details.memo) : '',
                        status: tx.transaction.status
                    };
                });
                
                return {
                    success: true,
                    transactions: formattedTransactions,
                    oldest_tx_id: transactions.Ok.oldest_tx_id
                };
            } else {
                throw new Error(`Failed to get transactions: ${Object.keys(transactions.Err)[0]}`);
            }
        } catch (error) {
            console.error('Failed to get transaction history:', error);
            return {
                success: false,
                error: error.message,
                transactions: []
            };
        }
    }
    
    /**
     * Convert a principal to an account identifier (ICRC-1 standard)
     * @param {Principal} principal - The principal to convert
     * @param {Array<number>} subaccount - Optional subaccount
     * @returns {string} Account identifier
     * @private
     */
    _principalToAccountIdentifier(principal, subaccount = []) {
        // This is a simplified implementation
        // In a production environment, use the proper ICRC-1 account calculation
        return principal.toString();
    }
}

// IDL factories for the ckBTC canisters
const idlFactories = {
    // ICRC-1 Ledger IDL
    ledger: ({ IDL }) => {
        const Subaccount = IDL.Vec(IDL.Nat8);
        const Account = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(Subaccount)
        });
        const TransferArgs = IDL.Record({
            from_subaccount: IDL.Opt(Subaccount),
            to: Account,
            amount: IDL.Nat,
            fee: IDL.Opt(IDL.Nat),
            memo: IDL.Opt(IDL.Nat64),
            created_at_time: IDL.Opt(IDL.Nat64)
        });
        const TransferError = IDL.Variant({
            BadFee: IDL.Record({ expected_fee: IDL.Nat }),
            BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
            InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
            TooOld: IDL.Null,
            CreatedInFuture: IDL.Null,
            TemporarilyUnavailable: IDL.Null,
            Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
            GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
        });
        const TransferResult = IDL.Variant({
            Ok: IDL.Nat,
            Err: TransferError
        });
        
        return IDL.Service({
            icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
            icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], [])
        });
    },
    
    // ckBTC Minter IDL
    minter: ({ IDL }) => {
        const Subaccount = IDL.Vec(IDL.Nat8);
        const Account = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(Subaccount)
        });
        const GetBtcAddressArgs = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(Subaccount)
        });
        const BtcAddress = IDL.Record({
            address: IDL.Text,
            min_confirmations: IDL.Nat32
        });
        const GetBtcAddressResult = IDL.Variant({
            Ok: BtcAddress,
            Err: IDL.Variant({
                MalformedAddress: IDL.Text,
                TemporarilyUnavailable: IDL.Text,
                GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
            })
        });
        const EstimateWithdrawalFeeArgs = IDL.Record({
            amount: IDL.Nat
        });
        const WithdrawalFee = IDL.Record({
            bitcoin_fee: IDL.Nat,
            minter_fee: IDL.Nat
        });
        const EstimateWithdrawalFeeResult = IDL.Variant({
            Ok: WithdrawalFee,
            Err: IDL.Variant({
                TemporarilyUnavailable: IDL.Text,
                GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
            })
        });
        const WithdrawBtcArgs = IDL.Record({
            address: IDL.Text,
            amount: IDL.Nat
        });
        const WithdrawBtcResult = IDL.Variant({
            Ok: IDL.Record({ block_index: IDL.Nat }),
            Err: IDL.Variant({
                MalformedAddress: IDL.Text,
                InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
                TemporarilyUnavailable: IDL.Text,
                GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
            })
        });
        
        return IDL.Service({
            get_btc_address: IDL.Func([GetBtcAddressArgs], [GetBtcAddressResult], []),
            estimate_withdrawal_fee: IDL.Func([EstimateWithdrawalFeeArgs], [EstimateWithdrawalFeeResult], ['query']),
            withdraw_btc: IDL.Func([WithdrawBtcArgs], [WithdrawBtcResult], [])
        });
    },
    
    // ckBTC Index IDL
    index: ({ IDL }) => {
        const Subaccount = IDL.Vec(IDL.Nat8);
        const Account = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(Subaccount)
        });
        const GetAccountTransactionsArgs = IDL.Record({
            account: Account,
            max_results: IDL.Nat,
            start: IDL.Opt(IDL.Nat)
        });
        const Transaction = IDL.Record({
            timestamp: IDL.Nat64,
            operation: IDL.Variant({
                Transfer: IDL.Record({
                    from: Account,
                    to: Account,
                    amount: IDL.Nat,
                    fee: IDL.Nat,
                    memo: IDL.Opt(IDL.Nat64)
                }),
                Mint: IDL.Record({
                    to: Account,
                    amount: IDL.Nat
                }),
                Burn: IDL.Record({
                    from: Account,
                    amount: IDL.Nat
                })
            }),
            status: IDL.Variant({
                Pending: IDL.Null,
                Confirmed: IDL.Null,
                Failed: IDL.Text
            })
        });
        const TransactionWithId = IDL.Record({
            id: IDL.Nat,
            transaction: Transaction
        });
        const GetAccountTransactionsResult = IDL.Variant({
            Ok: IDL.Record({
                transactions: IDL.Vec(TransactionWithId),
                oldest_tx_id: IDL.Opt(IDL.Nat)
            }),
            Err: IDL.Variant({
                TemporarilyUnavailable: IDL.Text,
                GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
            })
        });
        
        return IDL.Service({
            get_account_transactions: IDL.Func([GetAccountTransactionsArgs], [GetAccountTransactionsResult], ['query'])
        });
    }
};

// Export the ckBTC integration class
window.CKBTCIntegration = CKBTCIntegration;
