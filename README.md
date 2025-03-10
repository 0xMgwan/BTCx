# Bitcoin Payment Gateway with Internet Computer Protocol

![Bitcoin Payment Gateway](https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/128px-Bitcoin.svg.png)

A secure, non-custodial Bitcoin payment gateway that allows businesses to accept Bitcoin payments without intermediaries, leveraging the Internet Computer Protocol (ICP) for secure transactions.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Bitcoin Payment Gateway is a decentralized application built on the Internet Computer Protocol that enables businesses to accept Bitcoin payments directly without relying on third-party payment processors. The application provides a secure, non-custodial solution that gives users full control over their funds while leveraging the security and reliability of the Internet Computer blockchain.

## Features

- **Direct Bitcoin Integration**: Seamlessly connect with the Bitcoin network using ICP's canister smart contracts
- **Non-custodial Payment Processing**: Users maintain control of their private keys and funds
- **Internet Identity Authentication**: Secure sign-in using Internet Identity service
- **Real-time Transaction Monitoring**: Track payment status and confirmations in real-time
- **Support for ckBTC**: Use chain-key Bitcoin for fast and low-cost transactions
- **Responsive UI**: Modern, mobile-friendly user interface
- **Candid UI Integration**: Enhanced authentication for the Candid interface

## Architecture

The application consists of three main components:

1. **Backend Canister (Motoko)**: Handles payment processing, user authentication, and data storage
2. **Frontend Assets**: Provides the user interface and client-side logic
3. **Internet Identity Canister**: Manages secure authentication

### System Diagram

```
┌─────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│                 │      │                   │      │                 │
│  Frontend       │◄────►│  Backend Canister │◄────►│  Bitcoin Network│
│  (HTML/JS/CSS)  │      │  (Motoko)         │      │                 │
│                 │      │                   │      │                 │
└────────┬────────┘      └─────────┬─────────┘      └─────────────────┘
         │                         │
         │                         │
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌─────────────────────┐
│                 │      │                     │
│  User Browser   │      │  Internet Identity  │
│                 │      │  Canister           │
│                 │      │                     │
└─────────────────┘      └─────────────────────┘
```

## Prerequisites

- **dfx** (DFINITY Canister SDK) version 0.12.0 or later
- **Node.js** (version 14 or later) and npm
- **Internet Computer Wallet** for deploying to the IC mainnet
- **Git** for version control

## Installation

1. Install the DFINITY Canister SDK:
```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

2. Clone the repository:
```bash
git clone https://github.com/yourusername/btc-payment.git
cd btc-payment
```

3. Start the local development network:
```bash
dfx start --background
```

4. Deploy the canisters to the local network:
```bash
dfx deploy
```

## Development Setup

1. Install project dependencies:
```bash
npm install
```

2. Configure your environment:
   - Set up your ICP identity: `dfx identity new my-identity && dfx identity use my-identity`
   - Configure Bitcoin network settings in `dfx.json` (testnet/mainnet)

3. Make code changes and redeploy:
```bash
dfx deploy
```

4. Access the application:
   - Frontend: `http://localhost:8080/?canisterId=$(dfx canister id frontend)`
   - Candid UI: `http://localhost:8080/?canisterId=be2us-64aaa-aaaaa-qaabq-cai&id=$(dfx canister id btc_payment)`

## Usage Guide

### Creating a Payment Request

1. Sign in with Internet Identity
2. Fill out the payment form with:
   - Amount (in BTC)
   - Recipient Bitcoin address
   - Optional memo
3. Submit the form to generate a payment request
4. Share the payment details with the payer

### Monitoring Payments

1. Sign in to your account
2. View the list of payment requests
3. Check the status of each payment (pending, confirmed, failed)
4. Receive notifications when payments are confirmed

### Managing Your Account

1. Sign in with Internet Identity
2. View your account dashboard
3. Check your payment history
4. Configure notification preferences

## API Reference

### Backend Canister API

The backend canister provides the following methods:

#### `createPaymentRequest`

Creates a new payment request and returns a unique payment ID.

```motoko
createPaymentRequest(amount: Nat64, recipient: Text, memo: Text) : async Text
```

**Parameters:**
- `amount`: The amount in Satoshis (1 BTC = 100,000,000 Satoshis)
- `recipient`: The Bitcoin address of the recipient
- `memo`: An optional memo or description for the payment

**Returns:**
- A unique payment ID (e.g., "PAY-123")

#### `getPaymentDetails`

Retrieves the details of a specific payment by its ID.

```motoko
getPaymentDetails(paymentId: Text) : async ?PaymentRequest
```

**Parameters:**
- `paymentId`: The unique ID of the payment

**Returns:**
- An optional `PaymentRequest` record containing the payment details

#### `updatePaymentStatus`

Updates the status of a payment.

```motoko
updatePaymentStatus(paymentId: Text, newStatus: Text) : async Bool
```

**Parameters:**
- `paymentId`: The unique ID of the payment
- `newStatus`: The new status (e.g., "pending", "confirmed", "failed")

**Returns:**
- A boolean indicating whether the update was successful

#### `listUserPayments`

Retrieves all payments associated with a specific user.

```motoko
listUserPayments(user: Principal) : async [(Text, PaymentRequest)]
```

**Parameters:**
- `user`: The principal ID of the user

**Returns:**
- An array of tuples containing payment IDs and payment details

### Frontend JavaScript API

The frontend provides the following functions for interacting with the backend:

#### `createPayment(amount, recipient, memo)`

Creates a new payment request.

**Parameters:**
- `amount`: The amount in BTC
- `recipient`: The Bitcoin address of the recipient
- `memo`: An optional memo or description for the payment

**Returns:**
- A Promise that resolves to the payment ID

#### `displayPaymentDetails(paymentId, amount, recipient, memo)`

Displays the payment details in the UI.

**Parameters:**
- `paymentId`: The unique ID of the payment
- `amount`: The amount in BTC
- `recipient`: The Bitcoin address of the recipient
- `memo`: The memo or description for the payment

## Authentication

The application uses Internet Identity for secure authentication. The authentication flow works as follows:

1. **User Initiates Login**: The user clicks the "Sign In" button in the application.

2. **Internet Identity Service**: The application redirects to the Internet Identity service, where the user can authenticate using their preferred method (WebAuthn, security key, etc.).

3. **Authentication Callback**: After successful authentication, the Internet Identity service redirects back to the application with the user's identity.

4. **Session Management**: The application stores the authentication session and updates the UI to reflect the authenticated state.

5. **Authenticated Requests**: All subsequent requests to the backend canister include the user's identity.

### Candid UI Authentication

The application also includes special handling for authentication in the Candid UI, allowing developers to test the backend API with authenticated requests.

## Security

The Bitcoin Payment Gateway implements several security measures to protect user funds and data:

1. **Non-custodial Design**: The application never takes custody of user funds. All Bitcoin transactions are executed directly between the payer and the recipient.

2. **Secure Authentication**: Internet Identity provides secure, decentralized authentication without passwords.

3. **Principal-based Access Control**: Backend functions verify the caller's principal to ensure only authorized users can access certain functionality.

4. **HTTPS and TLS**: All communication between the frontend and backend is encrypted using HTTPS and TLS.

5. **Input Validation**: All user inputs are validated both on the frontend and backend to prevent injection attacks.

## Testing

### Local Testing

1. Start the local development network:
```bash
dfx start --background
```

2. Deploy the canisters:
```bash
dfx deploy
```

3. Run the test suite:
```bash
npm test
```

### Manual Testing

1. Access the frontend application:
```bash
open http://localhost:8080/?canisterId=$(dfx canister id frontend)
```

2. Test the authentication flow by clicking the "Sign In" button.

3. Create a test payment request and verify that it appears in the payment list.

## Deployment

### Deploying to the IC Mainnet

1. Create or import an identity with cycles:
```bash
dfx identity use <your-identity>
```

2. Verify your identity has sufficient cycles.

3. Deploy to the IC mainnet:
```bash
dfx deploy --network ic
```

4. Note the canister IDs for your deployed canisters:
```bash
dfx canister --network ic id frontend
dfx canister --network ic id btc_payment
```

## Contributing

Contributions to the Bitcoin Payment Gateway are welcome! Please follow these steps to contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

© 2025 Bitcoin Payment Gateway. All rights reserved.
dfx start
```

2. Deploy your canisters:
```bash
dfx deploy
```

3. Access the application at the local URL provided by dfx

## Security Considerations

- All private keys are managed securely through ICP's threshold ECDSA
- No custodial storage of funds
- Secure authentication using Sign in with Bitcoin
- Transaction verification through multiple confirmations
- Rate limiting and security measures implemented at canister level

## Architecture

The application consists of three main components:

1. **Backend Canister (Motoko)**
   - Payment processing logic
   - Bitcoin transaction management
   - UTXO tracking
   - Fee estimation

2. **Frontend Assets**
   - Modern UI built with Tailwind CSS
   - Real-time payment status updates
   - Secure wallet integration

3. **Bitcoin Integration**
   - Direct Bitcoin network access
   - ckBTC integration for fast transactions
   - Threshold signature support

## License

MIT License

## Support

For support or questions, please open an issue in the repository.
