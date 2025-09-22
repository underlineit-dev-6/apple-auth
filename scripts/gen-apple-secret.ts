// scripts/gen-apple-secret.ts
import "dotenv/config"; // <-- ensure .env(.local) is loaded
import * as jose from "jose";

(async () => {
  const alg = "ES256";
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_ID!;
  const keyId = process.env.APPLE_KEY_ID!;

  if (!process.env.APPLE_PRIVATE_KEY) {
    throw new Error("APPLE_PRIVATE_KEY is missing");
  }

  // Normalize the key:
  // - convert literal "\n" to real newlines
  // - strip surrounding quotes (if present)
  // - remove CRs and trim
  let privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1"); // strip wrapping double quotes, if any

  // Basic guard to ensure PKCS#8 PEM framing is present
  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "APPLE_PRIVATE_KEY must be a PKCS#8 PEM with BEGIN/END PRIVATE KEY headers"
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const key = await jose.importPKCS8(privateKey, alg); // <- will throw if not valid PKCS#8
  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg, kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 86400 * 180) // 180 days
    .sign(key);

  console.log(token);
})();
