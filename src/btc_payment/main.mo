import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Result "mo:base/Result";

// Bitcoin and ckBTC imports
import BitcoinTypes "canister:bitcoin_types";
import BitcoinApi "canister:bitcoin_api";
import CkBtcLedger "canister:ckbtc_ledger";
import CkBtcMinter "canister:ckbtc_minter";

actor BtcPayment {
    // Bitcoin network type
    private let bitcoin_network : BitcoinTypes.Network = #Mainnet;

    // Types for Bitcoin and ckBTC integration
    type UTXO = {
        outpoint: { txid: Blob; vout: Nat32 };
        value: Nat64;
        height: Nat32;
    };

    type BitcoinAddress = Text;
    type Satoshi = Nat64;
    type MillisatoshiPerByte = Nat64;
    type BitcoinTransaction = Blob;
    
    // Types for payment management
    type PaymentRequest = {
        amount: Nat64;  // Amount in Satoshis
        recipient: Text;  // Bitcoin address
        memo: Text;
        status: Text;
        timestamp: Int;
        payer: Principal;
    };

    // State variables
    private stable var payments: [(Text, PaymentRequest)] = [];
    private stable var nextPaymentId: Nat64 = 0;

    // Create a new payment request
    public shared(msg) func createPaymentRequest(
        amount: Nat64,
        recipient: Text,
        memo: Text
    ) : async Text {
        let paymentId = await generatePaymentId();
        let payment: PaymentRequest = {
            amount;
            recipient;
            memo;
            status = "pending";
            timestamp = Time.now();
            payer = msg.caller;
        };
        
        payments := Array.append(payments, [(paymentId, payment)]);
        paymentId
    };

    // Get payment details
    public query func getPaymentDetails(paymentId: Text) : async ?PaymentRequest {
        for ((id, payment) in payments.vals()) {
            if (id == paymentId) {
                return ?payment;
            };
        };
        null
    };

    // Update payment status
    public shared func updatePaymentStatus(
        paymentId: Text,
        newStatus: Text
    ) : async Bool {
        var updated = false;
        payments := Array.map<(Text, PaymentRequest), (Text, PaymentRequest)>(
            payments,
            func ((id, payment)) {
                if (id == paymentId) {
                    updated := true;
                    (id, {
                        amount = payment.amount;
                        recipient = payment.recipient;
                        memo = payment.memo;
                        status = newStatus;
                        timestamp = payment.timestamp;
                        payer = payment.payer;
                    })
                } else {
                    (id, payment)
                }
            }
        );
        updated
    };

    // List all payments for a user
    public query func listUserPayments(user: Principal) : async [(Text, PaymentRequest)] {
        Array.filter<(Text, PaymentRequest)>(
            payments,
            func ((_, payment)) {
                payment.payer == user
            }
        )
    };

    // Helper function to generate unique payment IDs
    private func generatePaymentId() : async Text {
        let id = nextPaymentId;
        nextPaymentId += 1;
        Text.concat("PAY-", Nat64.toText(id))
    };

    // System health check
    public query func healthCheck() : async Bool {
        true
    };

    // ========== Bitcoin Integration Functions ==========

    // Get Bitcoin address for a principal
    public func getBitcoinAddress(p: Principal) : async BitcoinAddress {
        try {
            await BitcoinApi.get_p2pkh_address(bitcoin_network, p);
        } catch (e) {
            Debug.trap("Failed to get Bitcoin address: " # Error.message(e));
        }
    };

    // Get UTXOs for a Bitcoin address
    public func getUtxos(address: BitcoinAddress) : async [UTXO] {
        try {
            let utxos = await BitcoinApi.get_utxos(bitcoin_network, address);
            Array.map<BitcoinTypes.Utxo, UTXO>(
                utxos.utxos,
                func (utxo) {
                    {
                        outpoint = utxo.outpoint;
                        value = utxo.value;
                        height = utxo.height;
                    }
                }
            )
        } catch (e) {
            Debug.trap("Failed to get UTXOs: " # Error.message(e));
        }
    };

    // Get Bitcoin balance for an address
    public func getBitcoinBalance(address: BitcoinAddress) : async Satoshi {
        try {
            let utxos = await BitcoinApi.get_utxos(bitcoin_network, address);
            var balance : Satoshi = 0;
            for (utxo in utxos.utxos.vals()) {
                balance += utxo.value;
            };
            balance
        } catch (e) {
            Debug.trap("Failed to get Bitcoin balance: " # Error.message(e));
        }
    };

    // Get current Bitcoin fee percentiles
    public func getBitcoinFeePercentiles() : async [MillisatoshiPerByte] {
        try {
            await BitcoinApi.get_current_fee_percentiles(bitcoin_network);
        } catch (e) {
            Debug.trap("Failed to get fee percentiles: " # Error.message(e));
        }
    };

    // ========== ckBTC Integration Functions ==========

    // Get ckBTC balance for a principal
    public func getCkBtcBalance(p: Principal) : async Nat {
        try {
            let account = { owner = p; subaccount = null };
            await CkBtcLedger.icrc1_balance_of(account);
        } catch (e) {
            Debug.trap("Failed to get ckBTC balance: " # Error.message(e));
        }
    };

    // Transfer ckBTC to another principal
    public shared(msg) func transferCkBtc(to: Principal, amount: Nat) : async Result.Result<Nat, Text> {
        try {
            let from_account = { owner = msg.caller; subaccount = null };
            let to_account = { owner = to; subaccount = null };
            let transfer_args = {
                from_subaccount = null;
                to = to_account;
                amount = amount;
                fee = null;
                memo = null;
                created_at_time = null;
            };
            
            let transfer_result = await CkBtcLedger.icrc1_transfer(transfer_args);
            
            switch (transfer_result) {
                case (#Ok(blockIndex)) {
                    #ok(blockIndex)
                };
                case (#Err(transferError)) {
                    #err("Transfer failed: " # debug_show(transferError))
                };
            }
        } catch (e) {
            #err("Exception during transfer: " # Error.message(e))
        }
    };

    // Mint ckBTC from Bitcoin
    public shared(msg) func mintCkBtc(amount: Satoshi) : async Result.Result<Text, Text> {
        try {
            let caller = msg.caller;
            let update_balance_result = await CkBtcMinter.update_balance(caller);
            
            switch (update_balance_result) {
                case (#Ok(balance_update)) {
                    #ok("Balance updated successfully: " # debug_show(balance_update))
                };
                case (#Err(error)) {
                    #err("Failed to update balance: " # debug_show(error))
                };
            }
        } catch (e) {
            #err("Exception during minting: " # Error.message(e))
        }
    };

    // Withdraw ckBTC to Bitcoin
    public shared(msg) func withdrawCkBtc(amount: Satoshi, address: BitcoinAddress) : async Result.Result<Text, Text> {
        try {
            let caller = msg.caller;
            let withdraw_args = {
                amount = amount;
                address = address;
            };
            
            let withdraw_result = await CkBtcMinter.withdraw(caller, withdraw_args);
            
            switch (withdraw_result) {
                case (#Ok(withdrawal)) {
                    #ok("Withdrawal initiated successfully: " # debug_show(withdrawal))
                };
                case (#Err(error)) {
                    #err("Failed to initiate withdrawal: " # debug_show(error))
                };
            }
        } catch (e) {
            #err("Exception during withdrawal: " # Error.message(e))
        }
    };

    // Get estimated withdrawal fee
    public func getEstimatedWithdrawalFee() : async Satoshi {
        try {
            let fee_result = await CkBtcMinter.estimate_withdrawal_fee({ amount = null });
            fee_result.minter_fee + fee_result.bitcoin_fee
        } catch (e) {
            Debug.trap("Failed to get withdrawal fee: " # Error.message(e));
        }
    };
