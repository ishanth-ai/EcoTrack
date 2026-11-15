import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_CATEGORIES = [
  "Plastic bottles",
  "Plastic bags",
  "Plastic wrappers",
  "Plastic containers",
  "Other visible litter",
  "Uncertain / not identifiable",
] as const;

interface GeminiAnalysisPayload {
  plasticPresent: "YES" | "NO" | "UNCERTAIN";
  categories: string[];
  visibleEvidence: string;
  quantityEstimate: "LOW" | "MEDIUM" | "HIGH";
  suggestedPriority: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  limitations: string;
  modelName: string;
  analyzedAt: string;
}

function validateAndNormalizeAnalysis(raw: unknown, modelName: string): GeminiAnalysisPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model returned an empty or non-object JSON payload.");
  }

  const record = raw as Record<string, unknown>;
  const plasticPresent =
    record.plasticPresent === "YES" || record.plasticPresent === "NO" || record.plasticPresent === "UNCERTAIN"
      ? record.plasticPresent
      : "UNCERTAIN";

  const quantityEstimate =
    record.quantityEstimate === "LOW" || record.quantityEstimate === "MEDIUM" || record.quantityEstimate === "HIGH"
      ? record.quantityEstimate
      : "LOW";

  const suggestedPriority =
    record.suggestedPriority === "LOW" || record.suggestedPriority === "MEDIUM" || record.suggestedPriority === "HIGH"
      ? record.suggestedPriority
      : "LOW";

  const rawCategories = Array.isArray(record.categories) ? record.categories : [];
  const validCategories = rawCategories
    .filter((item): item is string => typeof item === "string")
    .filter((item) => (ALLOWED_CATEGORIES as readonly string[]).includes(item));

  const categories =
    validCategories.length > 0 ? Array.from(new Set(validCategories)) : ["Uncertain / not identifiable"];

  const visibleEvidence =
    typeof record.visibleEvidence === "string" && record.visibleEvidence.trim().length > 0
      ? record.visibleEvidence.trim()
      : "No distinct plastic items could be confirmed from the visible pixels.";

  const explanation =
    typeof record.explanation === "string" && record.explanation.trim().length > 0
      ? record.explanation.trim()
      : "Visual inspection completed with limited visibility.";

  const limitations =
    typeof record.limitations === "string" && record.limitations.trim().length > 0
      ? record.limitations.trim()
      : "This is an automated visual assessment, not a laboratory test or material composition analysis.";

  return {
    plasticPresent,
    categories,
    visibleEvidence,
    quantityEstimate,
    suggestedPriority,
    explanation,
    limitations,
    modelName,
    analyzedAt: new Date().toISOString(),
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "12mb" }));

  app.get("/api/health", (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
    res.json({
      ok: true,
      service: "PlasticWatch API",
      geminiConfigured: hasKey,
    });
  });

  app.post("/api/analyze-waste", async (req, res) => {
    try {
      const { imageBase64, mimeType, description } = req.body ?? {};

      if (typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
        res.status(400).json({ error: "Missing image data for analysis." });
        return;
      }

      const normalizedMime = typeof mimeType === "string" ? mimeType.toLowerCase().trim() : "";
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: "Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP.",
        });
        return;
      }

      // Strip optional data URL prefix if present
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      if (!cleanBase64 || cleanBase64.length > 10 * 1024 * 1024) {
        res.status(400).json({
          error: "Image payload is empty or exceeds the maximum 8 MB upload limit.",
        });
        return;
      }

      const ai = getGeminiClient();
      const modelName = "gemini-4-hydrogen";

      const systemInstruction = `You are an experimental environmental image analysis assistant for PlasticWatch, a student civic monitoring prototype near AJIET Mangalore, India.
Analyze the submitted photograph strictly for visible litter and plastic waste.
Rules you MUST follow:
1. Never claim plastic is present if the image is blurry, dark, obstructed, or unclear — return plasticPresent: "UNCERTAIN" and category "Uncertain / not identifiable".
2. Never invent exact object counts, weights (kg/grams), chemical polymer grades, or pollution measurements.
3. Never generate numeric confidence percentages.
4. Always state clearly in limitations that this is a visual assessment only, not a laboratory test.
5. Never claim the image proves who dumped or littered the waste.
6. Never identify people, faces, personal identities, or vehicle registration / license plate numbers.
7. Only choose categories from: "Plastic bottles", "Plastic bags", "Plastic wrappers", "Plastic containers", "Other visible litter", "Uncertain / not identifiable".`;

      const contextNote =
        typeof description === "string" && description.trim().length > 0
          ? `Citizen observation note (context only, verify against image pixels): ${description.trim().slice(0, 300)}`
          : "No citizen text description was provided.";

      const promptText = `Inspect this field photograph and return a structured JSON assessment.
- plasticPresent: "YES" if visible plastic waste is clearly present, "NO" if clearly free of plastic waste, or "UNCERTAIN" if unclear or ambiguous.
- categories: array of matching visible categories from the allowed list.
- visibleEvidence: concise description of the visible waste items or surface cues observed in the image (no invented counts or weights, no people or license plates).
- quantityEstimate: "LOW", "MEDIUM", or "HIGH" representing rough visible litter volume.
- suggestedPriority: "LOW", "MEDIUM", or "HIGH" for human verification and cleanup triage.
- explanation: brief plain-English summary of why this assessment was chosen.
- limitations: brief statement of visual limitations and a reminder that this is a visual assessment, not a laboratory test.

${contextNote}`;

      const maxAttempts = 3;
      let rawText = "";
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMime === "image/jpg" ? "image/jpeg" : normalizedMime,
                    data: cleanBase64,
                  },
                },
                { text: promptText },
              ],
            },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  plasticPresent: {
                    type: Type.STRING,
                    enum: ["YES", "NO", "UNCERTAIN"],
                    description: "Whether visible plastic waste is likely present.",
                  },
                  categories: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                      enum: [...ALLOWED_CATEGORIES],
                    },
                    description: "Visible waste categories observed.",
                  },
                  visibleEvidence: {
                    type: Type.STRING,
                    description: "Factual visual cues observed in the photo without invented counts or weights.",
                  },
                  quantityEstimate: {
                    type: Type.STRING,
                    enum: ["LOW", "MEDIUM", "HIGH"],
                    description: "Qualitative estimate of visible litter amount.",
                  },
                  suggestedPriority: {
                    type: Type.STRING,
                    enum: ["LOW", "MEDIUM", "HIGH"],
                    description: "Suggested triage priority for human review.",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Short plain-English explanation of the visual assessment.",
                  },
                  limitations: {
                    type: Type.STRING,
                    description: "Visual limitations and reminder that this is not a laboratory test.",
                  },
                },
                required: [
                  "plasticPresent",
                  "categories",
                  "visibleEvidence",
                  "quantityEstimate",
                  "suggestedPriority",
                  "explanation",
                  "limitations",
                ],
              },
            },
          });

          rawText = (response.text ?? "").trim();
          if (rawText) break;
          throw new Error("Gemini returned an empty response.");
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|timeout/i.test(msg);
          if (isTransient && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1200));
            continue;
          }
          throw err;
        }
      }

      if (!rawText) {
        throw lastError ?? new Error("Gemini returned an empty response.");
      }

      const parsed = JSON.parse(rawText);
      const validated = validateAndNormalizeAnalysis(parsed, modelName);
      res.json(validated);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown AI analysis failure.";
      let friendlyMessage = rawMessage;
      try {
        const parsedErr = JSON.parse(rawMessage);
        if (parsedErr?.error?.message) {
          friendlyMessage = parsedErr.error.message;
        }
      } catch {
        // rawMessage is already plain text
      }
      console.error("[/api/analyze-waste] Error:", friendlyMessage);
      res.status(502).json({
        error: "Gemini AI image analysis failed.",
        details: friendlyMessage,
      });
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      const indexHtml = path.join(distPath, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build output not found. Run npm run build first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PlasticWatch server listening on http://localhost:${PORT}`);
  });
}

startServer();
