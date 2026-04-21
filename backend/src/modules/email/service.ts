import { Resend } from "resend";
import { env } from "../../config/env";

const getClient = () => {
  if (!env.resendApiKey) return null;
  return new Resend(env.resendApiKey);
};

export const emailService = {
  async sendInvitation(input: {
    to: string;
    firstName: string;
    role: string;
    code: string;
    email: string;
  }): Promise<{ delivered: boolean; reason?: string }> {
    const client = getClient();
    if (!client) {
      console.warn("[email] RESEND_API_KEY manquant — email non envoyé");
      return { delivered: false, reason: "missing_credentials" };
    }

    const roleLabel =
      input.role === "TEACHER"
        ? "enseignant(e)"
        : input.role === "STUDENT"
          ? "élève"
          : input.role === "ADMIN"
            ? "administrateur(rice)"
            : input.role.toLowerCase();

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 16px; }
  .card { background: #fff; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
  .logo { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 32px; }
  .logo span { color: #6366f1; }
  h1 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 12px; }
  p { color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .code-box { background: #f0f0ff; border: 2px dashed #6366f1; border-radius: 12px; text-align: center; padding: 24px; margin: 24px 0; }
  .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace; }
  .code-label { font-size: 12px; color: #888; margin-top: 6px; text-transform: uppercase; letter-spacing: 2px; }
  .info { background: #f9f9f9; border-radius: 10px; padding: 16px; font-size: 13px; color: #666; }
  .info strong { color: #333; }
  .footer { margin-top: 32px; font-size: 12px; color: #aaa; text-align: center; }
</style></head>
<body>
  <div class="card">
    <div class="logo">Xelal<span>AI</span></div>
    <h1>Bonjour ${input.firstName},</h1>
    <p>Vous avez été invité(e) sur <strong>Xelal AI</strong> en tant qu'<strong>${roleLabel}</strong>.</p>
    <p>Utilisez le code ci-dessous pour activer votre compte lors de votre première connexion :</p>
    <div class="code-box">
      <div class="code">${input.code}</div>
      <div class="code-label">Code d'activation provisoire</div>
    </div>
    <div class="info">
      <strong>Email de connexion :</strong> ${input.email}<br/>
      <strong>Validité :</strong> 7 jours
    </div>
    <p style="margin-top:20px">Connectez-vous sur l'application, entrez votre email et ce code pour définir votre mot de passe définitif.</p>
    <div class="footer">Xelal AI — Plateforme scolaire intelligente<br/>Si vous n'attendiez pas cet email, ignorez-le.</div>
  </div>
</body>
</html>`;

    try {
      const { error } = await client.emails.send({
        from: env.emailFrom,
        to: input.to,
        subject: `Votre code d'activation Xelal AI`,
        html,
      });

      if (error) {
        console.error("[email] Resend error:", error);
        return { delivered: false, reason: error.message };
      }

      return { delivered: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      console.error("[email] sendInvitation failed:", reason);
      return { delivered: false, reason };
    }
  },
};
