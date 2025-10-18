// services/api/src/services/aiService.js
import { genAI, config } from '../config/gemini.js';

/** Embeddings */
export async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: config.embeddingModel });
  const res = await model.embedContent({ content: { parts: [{ text }] } });
  const values = res?.embedding?.values ?? res?.data?.[0]?.embedding?.values;
  if (!values) throw new Error("No se obtuvo embedding del modelo");
  return values;
}

/** Chat simple */
export async function chatAnswer(prompt) {
  const model = genAI.getGenerativeModel({ model: config.textModel });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/** Util: arma modelo con tools + systemInstruction + AUTO */
function buildModel({ tools, systemInstruction }) {
  return genAI.getGenerativeModel({
    model: config.textModel,
    systemInstruction: systemInstruction || undefined,
    tools: tools ? [{ functionDeclarations: tools }] : undefined,
    toolConfig: {
      functionCallingConfig: { mode: "AUTO" } // <- permite que el modelo llame tools
    }
  });
}

/** Chat con tools (Function Calling) */
export async function chatWithTools({ prompt, tools, systemInstruction }) {
  const model = buildModel({ tools, systemInstruction });

  // Mantén el chat para poder enviar functionResponse después
  const chat = model.startChat({ history: [] });

  const result = await chat.sendMessage(prompt);
  const resp = result?.response;
  const candidate = resp?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // Extrae function calls desde parts
  const functionCalls = [];
  for (const p of parts) {
    if (p.functionCall) {
      functionCalls.push({
        name: p.functionCall.name,
        args: p.functionCall.args || {}
      });
    }
  }

  // Texto “normal” (si lo hay)
  const text = parts
    .map(p => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  return { chat, text, functionCalls };
}

/** Enviar resultados de herramientas al modelo y obtener respuesta final */
export async function sendToolResults({ chat, toolResults }) {
  // toolResults: [{ functionResponse: { name, response } }, ...]
  const parts = toolResults.map(tr => ({ functionResponse: tr.functionResponse }));
  const result = await chat.sendMessage(parts);

  const outParts = result?.response?.candidates?.[0]?.content?.parts || [];
  const text = outParts.map(p => p.text).filter(Boolean).join("\n").trim();

  return text;
}
