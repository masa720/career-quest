import { spawnSync } from "node:child_process";
import { webcrypto } from "node:crypto";

const subject = process.env.VAPID_SUBJECT ?? "https://github.com/masa720";
const keyPair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const privateJwk = await webcrypto.subtle.exportKey("jwk", keyPair.privateKey);
const publicKey = Buffer.from(
  await webcrypto.subtle.exportKey("raw", keyPair.publicKey),
).toString("base64url");

const result = spawnSync(
  "npx",
  [
    "supabase",
    "secrets",
    "set",
    `VAPID_PRIVATE_JWK=${JSON.stringify(privateJwk)}`,
    `VAPID_SUBJECT=${subject}`,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  throw new Error("Supabase Edge Function Secretsを設定できませんでした。");
}

console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
