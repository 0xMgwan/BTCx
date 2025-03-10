import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from './btc_payment.did.js';

// Canister ID - replace with your actual canister ID
const canisterId = process.env.CANISTER_ID_BTC_PAYMENT || "bkyz2-fmaaa-aaaaa-qaaaq-cai";

export const createActor = (options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  // When deploying locally, we need to fetch the root key
  if (process.env.NODE_ENV !== "production") {
    agent.fetchRootKey().catch(err => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }

  // Create an actor with the specified interface and canister ID
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

export const btc_payment = createActor();
