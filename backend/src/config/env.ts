const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.BACKEND_PORT ?? process.env.PORT, 4000),
  appName: process.env.APP_NAME ?? "Xelal AI API",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "xelal-local-dev-secret-change-me",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Xelal AI <noreply@xelal.ai>",
};

export const isProduction = env.nodeEnv === "production";
