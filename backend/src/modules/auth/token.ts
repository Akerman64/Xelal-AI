import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";

const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string) =>
  createHmac("sha256", env.authSecret).update(payload).digest("base64url");

export const createAccessToken = (userId: string, expiresInSeconds = ONE_DAY_IN_SECONDS) => {
  const payload = JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });

  const encodedPayload = encode(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyAccessToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Token invalide.");
  }

  const expectedSignature = sign(encodedPayload);
  const isValid =
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!isValid) {
    throw new Error("Signature invalide.");
  }

  const payload = JSON.parse(decode(encodedPayload)) as {
    sub?: string;
    exp?: number;
  };

  if (!payload.sub || !payload.exp) {
    throw new Error("Payload invalide.");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expire.");
  }

  return payload;
};
