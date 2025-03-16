# ICPesa Payment Application Deployment Guide

This guide provides step-by-step instructions for deploying the ICPesa payment application to the Internet Computer mainnet.

## Deployment Status

The ICPesa Payment application has been successfully deployed to the Internet Computer mainnet with the following canister IDs:

### Backend Canister (ICPesa Payment)
- Canister ID: `2x6e4-aqaaa-aaaad-qg66a-cai`
- Candid Interface URL: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=2x6e4-aqaaa-aaaad-qg66a-cai

### Frontend Canister
- Canister ID: `2q7ci-niaaa-aaaad-qg66q-cai`
- Frontend URL: https://2q7ci-niaaa-aaaad-qg66q-cai.icp0.io/

## Prerequisites

Before you begin, make sure you have:

1. **DFX CLI**: Version 0.25.0 or later installed
2. **Identity with cycles**: An identity with sufficient cycles for deployment
3. **Internet connection**: A stable internet connection

## Step 1: Verify Your Identity

First, check which identity you're using and make sure it has sufficient cycles:

```bash
# Check current identity
dfx identity whoami

# Check your principal
dfx identity get-principal

# Check your cycles balance
dfx wallet --network ic balance
```

## Step 2: Create a New Cycles Wallet (if needed)

If your current identity doesn't have a cycles wallet or sufficient cycles:

```bash
# Create a new cycles wallet
dfx ledger create-canister $(dfx identity get-principal) --amount 1.0 --network ic

# Initialize the wallet
dfx identity --network ic set-wallet $(dfx canister --network ic id <CANISTER_ID>)
```

## Step 3: Deploy the Canisters

Once your identity has sufficient cycles, you can deploy the canisters:

```bash
# Deploy all canisters to the IC mainnet
dfx deploy --network ic
```

This will deploy the following canisters:
- `icpesa_payment`: The main backend canister
- `frontend`: The frontend assets canister

## Step 4: Get Canister IDs

After deployment, you can get the canister IDs for your deployed canisters:

```bash
# Get the frontend canister ID
dfx canister --network ic id frontend

# Get the icpesa_payment canister ID
dfx canister --network ic id icpesa_payment
```

## Step 5: Access Your Application

You can access your deployed application using the frontend canister ID:

```
https://<FRONTEND_CANISTER_ID>.icp0.io/
```

The currently deployed application is accessible at:

```
https://2q7ci-niaaa-aaaad-qg66q-cai.icp0.io/
```

## Troubleshooting

If you encounter issues during deployment:

1. **Cycles Issues**: Make sure your identity has sufficient cycles
   ```bash
   dfx wallet --network ic balance
   ```

2. **Configuration Issues**: Verify your dfx.json file is correctly formatted
   ```bash
   dfx config validate
   ```

3. **Dependency Issues**: Make sure all dependencies are correctly specified in dfx.json

## Updating Your Application

To update your application after making changes:

```bash
# Deploy only the frontend
dfx deploy --network ic frontend

# Deploy only the backend
dfx deploy --network ic icpesa_payment

# Deploy all canisters
dfx deploy --network ic
```

## Additional Resources

- [DFINITY Developer Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [Internet Computer Dashboard](https://dashboard.internetcomputer.org/)
- [Cycles Faucet](https://faucet.dfinity.org/) (for obtaining cycles for development)
