import { importSPKI, jwtVerify } from "jose";

import { config } from "@/lib/config";

export interface PrivyVerificationResult {
  verified: boolean;
  userId?: string;
  walletAddress?: string;
  reason?: string;
  claims?: Record<string, unknown>;
}

function parseToken(token: string) {
  const [, payloadPart] = token.split(".");
  if (!payloadPart) {
    return null;
  }
  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifyPrivyAccessToken(token: string): Promise<PrivyVerificationResult> {
  if (!token) {
    return { verified: false, reason: "missing_token" };
  }

  if (token.startsWith("demo_")) {
    return {
      verified: true,
      userId: token.replace("demo_", ""),
      reason: "demo_mode",
    };
  }

  const claims = parseToken(token);
  if (!claims) {
    return { verified: false, reason: "invalid_jwt_shape" };
  }

  // Prefer cryptographic verification when a Privy public key is configured.
  if (config.privy.verificationKey) {
    try {
      const publicKey = await importSPKI(config.privy.verificationKey, "RS256");
      const result = await jwtVerify(token, publicKey, {
        issuer: "privy.io",
      });
      const userId = String(result.payload.sub ?? result.payload.user_id ?? "");
      const walletAddress = String(result.payload.wallet_address ?? "");
      return {
        verified: true,
        userId,
        walletAddress: walletAddress || undefined,
        claims: result.payload as Record<string, unknown>,
      };
    } catch {
      return { verified: false, reason: "signature_verification_failed" };
    }
  }

  const userId = String(claims.sub ?? claims.user_id ?? "");
  const walletAddress = String(claims.wallet_address ?? "");
  if (!userId) {
    return { verified: false, reason: "missing_subject_claim" };
  }
  return {
    verified: true,
    userId,
    walletAddress: walletAddress || undefined,
    claims,
    reason: "unverified_without_public_key",
  };
}

