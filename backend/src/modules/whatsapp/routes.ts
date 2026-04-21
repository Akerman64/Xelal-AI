import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import { whatsappService } from "./service";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", (req, res) => {
  const challenge = whatsappService.verifyWebhook(
    typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : undefined,
    typeof req.query["hub.verify_token"] === "string"
      ? req.query["hub.verify_token"]
      : undefined,
    typeof req.query["hub.challenge"] === "string"
      ? req.query["hub.challenge"]
      : undefined,
  );

  if (!challenge) {
    return res.status(403).json({ error: "Verification WhatsApp refusee." });
  }

  return res.status(200).send(challenge);
});

whatsappRouter.post("/webhook", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const result = await whatsappService.processWebhookPayload(req.body ?? {});
      return res.status(200).json({ data: result });
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Traitement WhatsApp impossible.";
      return res.status(400).json({ error: message });
    });
});

whatsappRouter.post("/simulate", requireAuth, requireRole("ADMIN", "TEACHER"), (req, res) => {
  Promise.resolve()
    .then(async () => {
      const from = typeof req.body?.from === "string" ? req.body.from : "";
      const text = typeof req.body?.text === "string" ? req.body.text : "";

      if (!from || !text) {
        return res.status(400).json({ error: "from et text sont obligatoires." });
      }

      return res.status(200).json({
        data: await whatsappService.simulateMessage({ from, text }),
      });
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Simulation WhatsApp impossible.";
      return res.status(400).json({ error: message });
    });
});

whatsappRouter.post("/preview-reply", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const message = typeof req.body?.message === "string" ? req.body.message : "";
      const studentName = typeof req.body?.studentName === "string" ? req.body.studentName : undefined;
      if (!message.trim()) {
        return res.status(400).json({ error: "message est obligatoire." });
      }
      return res.status(200).json({
        data: await whatsappService.previewReply({ message: message.trim(), studentName }),
      });
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Prévisualisation WhatsApp impossible.";
      return res.status(400).json({ error: message });
    });
});
