/**
 * Solana Actions Example
 */

import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DEFAULT_SOL_ADDRESS } from "./const";
import axios from "axios";

const zetaClient = axios.create({
  baseURL: "https://api-gql.zeta.markets",
  headers: {
    "Content-Type": "application/json",
    origin: "https://token.zeta.markets",
    referer: "https://token.zeta.markets",
    "x-amz-user-agent": "aws-amplify/6.3.6 api/1 framework/1",
    "x-api-key": "da2-rrupjjccivdndc6rvltixlmsma",
  },
  timeout: 2 * 60 * 1000, // 2 mins
});

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const payload: ActionGetResponse = {
      title: "Check Zeta Airdrop",
      icon: new URL("/zeta.jpg", requestUrl.origin).toString(),
      description: "How many ZEX tokens you are eligible for?",
      label: "Check Eligible",
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    const fee = 0.0001; // fee of check airdrop

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"),
    );

    const transaction = new Transaction();
    transaction.feePayer = account;

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: DEFAULT_SOL_ADDRESS,
        lamports: fee * LAMPORTS_PER_SOL,
      }),
    );

    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const res = await zetaClient
      .post("/graphql", {
        query:
          "query GetAirdropFinalFrontend($authority: String!) {\n  getAirdropFinalFrontend(authority: $authority) {\n    authority\n    community_allocation\n    eligibility\n    main_allocation\n    og_allocation\n    s1_allocation\n    s2_allocation\n    total_allocation\n    __typename\n  }\n}\n",
        variables: {
          authority: account.toBase58(),
        },
      })
      .then((res) => res?.data?.data);

    const message =
      res?.getAirdropFinalFrontend?.eligibility === "ELIGIBLE"
        ? `Account is eligible to claim ${res?.getAirdropFinalFrontend?.total_allocation} ZEX`
        : `Account is not eligible for ZEX airdrop`;

    console.log(message);

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message,
      },
      // note: no additional signers are needed
      // signers: [],
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
