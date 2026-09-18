const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const geminiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

const schema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        properties: {
          material: { type: "string", description: "Material or item name. Use a short carpenter-friendly name." },
          calculationType: { type: "string", enum: ["cut", "round", "sheet", "rft"] },
          fields: {
            type: "object",
            properties: {
              length: { type: ["number", "null"], description: "Length exactly read from the image, otherwise null." },
              width: { type: ["number", "null"], description: "Width exactly read from the image, otherwise null." },
              thickness: { type: ["number", "null"], description: "Thickness exactly read from the image, otherwise null." },
              diameter: { type: ["number", "null"], description: "Diameter exactly read from the image, otherwise null." },
              girth: { type: ["number", "null"], description: "Girth/circumference exactly read from the image, otherwise null." },
              quantity: { type: ["number", "null"], description: "Quantity exactly read from the image, otherwise null." },
              unit: { type: "string", enum: ["inch", "feet", "cm", "mm", "meter"] },
              rate: { type: ["number", "null"], description: "Rate only if clearly visible; otherwise null." }
            },
            required: ["length", "width", "thickness", "diameter", "girth", "quantity", "unit", "rate"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          missingFields: { type: "array", items: { type: "string" } },
          needsConfirmation: { type: "boolean" }
        },
        required: ["material", "calculationType", "fields", "confidence", "missingFields", "needsConfirmation"]
      }
    }
  },
  required: ["items"]
};

function send(res, status, body) {
  res.status(status).set("Content-Type", "application/json").send(JSON.stringify(body));
}

function getOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const step = Array.isArray(data.steps) ? data.steps.find(s => s.type === "model_output") : null;
  if (!step || !Array.isArray(step.content)) return "";
  return step.content.filter(x => x.type === "text").map(x => x.text || "").join("");
}

exports.analyzeMeasurement = onRequest(
  { region: "asia-south1", secrets: [geminiApiKey], timeoutSeconds: 60, memory: "256MiB" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });

    try {
      const authHeader = String(req.get("Authorization") || "");
      if (!authHeader.startsWith("Bearer ")) return send(res, 401, { error: "Sign in is required." });
      await admin.auth().verifyIdToken(authHeader.slice(7));

      const { imageBase64, mimeType } = req.body || {};
      if (!imageBase64 || !mimeType || !/^image\/(jpeg|png|webp)$/i.test(mimeType)) {
        return send(res, 400, { error: "Please send a JPEG, PNG or WEBP image." });
      }
      if (imageBase64.length > 12_000_000) return send(res, 413, { error: "Image is too large. Try a smaller photo." });

      const prompt = [
        "You are a carpenter measurement extraction assistant.",
        "Read ONLY measurements, labels and rates that are actually visible in the image.",
        "Do NOT estimate physical dimensions from the apparent size of an object.",
        "If a real-world measurement is not visible or cannot be read reliably, return null and add its field name to missingFields.",
        "Understand common carpenter notation such as 7'0, 3'6, 4 inch, 4in, 10mm, 2 pcs, 5 nos and handwritten numbers.",
        "Convert mixed feet/inch notation into one numeric value while preserving the chosen unit. Example: 3'6 can be length 3.5 with unit feet.",
        "Use cut for rectangular wood/size wood, round for logs/poles, sheet for plywood/flush-door sheets, and rft for running-feet-only entries.",
        "Do not calculate CFT/Sq Ft/RFT totals. The application will calculate those deterministically.",
        "If a value is ambiguous, keep it null and set needsConfirmation=true.",
        "Return one item for each clearly separable measurement line or material item."
      ].join("\n");

      const apiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey.value()
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          store: false,
          input: [
            { type: "text", text: prompt },
            { type: "image", data: imageBase64, mime_type: mimeType }
          ],
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema
          }
        })
      });

      const raw = await apiResponse.text();
      if (!apiResponse.ok) {
        console.error("Gemini API error", raw);
        return send(res, 502, { error: "Gemini analysis failed. Check the Gemini API key and model access." });
      }

      const data = JSON.parse(raw);
      const outputText = getOutputText(data);
      if (!outputText) return send(res, 502, { error: "Gemini returned no structured result." });

      const result = JSON.parse(outputText);
      return send(res, 200, { items: Array.isArray(result.items) ? result.items : [] });
    } catch (error) {
      console.error(error);
      return send(res, 500, { error: "AI Scan failed. Please try again." });
    }
  }
);
