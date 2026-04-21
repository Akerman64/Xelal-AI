/**
 * Utilitaire AI partagé — DeepSeek prioritaire, Gemini en fallback.
 *
 * DeepSeek utilise une API compatible OpenAI.
 * Config : DEEPSEEK_API_KEY (ou OPENAI_API_KEY pour DeepSeek) et/ou GEMINI_API_KEY.
 */

import { GoogleGenAI } from "@google/genai";

export const DATABASE_ONLY_AI_RULES = `
Règles de vérité des données:
- Tu dois te baser uniquement sur les informations explicitement fournies dans le contexte issu de la base de données.
- Tu ne dois jamais créer, deviner, compléter, extrapoler ou supposer une donnée absente.
- Cela concerne toutes les informations: notes, moyennes, absences, retards, horaires, salles, enseignants, matières, leçons, évaluations, recommandations, bulletins, rapports, coordonnées, statuts et tendances.
- Si une information n'est pas dans le contexte, réponds clairement qu'elle n'est pas disponible ou pas encore enregistrée.
- Tu peux faire une recommandation uniquement à partir des données présentes; si les données sont insuffisantes, donne une recommandation prudente et dis ce qui manque.
- Toute alerte de baisse, hausse, performance, absence ou retard doit citer ou résumer les valeurs réelles disponibles dans le contexte.
- N'utilise jamais de formule qui laisse penser qu'une donnée existe si elle n'est pas fournie.
`.trim();

const withDatabaseOnlyRules = (prompt: string) => `${DATABASE_ONLY_AI_RULES}\n\n${prompt}`;

let geminiInstance: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiInstance) geminiInstance = new GoogleGenAI({ apiKey: key });
  return geminiInstance;
}

async function callDeepSeek(prompt: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY non configuré.");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? "{}";
}

async function callDeepSeekText(messages: Array<{ role: string; content: string }>): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY non configuré.");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGeminiJson(prompt: string): Promise<string> {
  const ai = getGemini();
  if (!ai) throw new Error("GEMINI_API_KEY non configuré.");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  return response.text ?? "{}";
}

/**
 * Appelle l'IA disponible et retourne du JSON parsé.
 * Ordre : DeepSeek → Gemini → null
 */
export async function callAiJson<T = unknown>(prompt: string): Promise<T | null> {
  const guardedPrompt = withDatabaseOnlyRules(prompt);
  // Essai DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const text = await callDeepSeek(guardedPrompt);
      return JSON.parse(text) as T;
    } catch {
      // fallback Gemini
    }
  }

  // Essai Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGeminiJson(guardedPrompt);
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Appelle l'IA en mode conversation (texte libre, pas JSON).
 * Ordre : DeepSeek → Gemini → null
 */
export async function callAiText(
  messages: Array<{ role: string; content: string }>,
  fallbackSystemPrompt?: string,
): Promise<string | null> {
  const msgs = fallbackSystemPrompt
    ? [{ role: "system", content: `${DATABASE_ONLY_AI_RULES}\n\n${fallbackSystemPrompt}` }, ...messages]
    : [{ role: "system", content: DATABASE_ONLY_AI_RULES }, ...messages];

  // Essai DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeekText(msgs);
    } catch {
      // fallback Gemini
    }
  }

  // Essai Gemini (Gemini ne supporte pas le format messages multi-tour facilement,
  // on concatène en un seul prompt)
  if (process.env.GEMINI_API_KEY) {
    try {
      const combined = msgs.map((m) => `[${m.role}]: ${m.content}`).join("\n\n");
      const ai = getGemini()!;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: combined,
      });
      return response.text ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

export const isAiAvailable = () =>
  Boolean(process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY);
