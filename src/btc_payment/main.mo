import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";

actor BtcPayment {
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
}
