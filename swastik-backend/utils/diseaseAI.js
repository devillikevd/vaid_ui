// AI disease-detail generation via Google Gemini (@google/genai).
// Ported from the original Python/ESM implementation to CommonJS.

const { GoogleGenAI } = require("@google/genai");

const DETAIL_KEYS = [
  "summary", "overview", "types", "symptoms", "causes", "risk_factors",
  "diagnosis", "medicines", "home_remedies", "complications", "prevention",
  "when_to_see_doctor", "faqs",
];

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildDetailsPrompt(name, code, chapter) {
  return `
    You are an empathetic doctor writing a patient-education article for a general audience with NO medical background.
    Explain the following condition so clearly that a 15-year-old could understand it. Avoid jargon; when a medical
    term is unavoidable, immediately explain it in plain words in the same sentence. Be warm and reassuring.

    Condition: ${name}
    ICD-10 Code: ${code}
    Category: ${chapter}

    CRITICAL: Every detail MUST be specifically and medically true for "${name}" in particular — NOT generic text
    that could apply to any disease. Name the actual symptoms, the actual causes, the real medicines/treatments,
    and the specific body parts involved for THIS exact condition. Do NOT use vague filler like "discomfort in the
    affected area", "underlying problems", or "targeted therapy". If a real medicine or test has a common name,
    state it. If you are genuinely unsure about a specific fact, say what is typically true for this class of
    condition rather than inventing details.

    Return ONLY valid JSON (no markdown, no \`\`\`). Use exactly these keys. For any "list" field, return a single
    string containing HTML <li>...</li> items (no <ul> wrapper). For paragraph fields, return plain sentences.

    - "summary": ONE simple sentence (max 25 words) answering "what is this in plain English?".
    - "overview": 2-3 short, easy paragraphs (use <br><br> between them) explaining what the condition is, what body part it affects, and why it happens.
    - "types": <li> items for the main types/forms. If there are no meaningful subtypes, return "<li>This condition is generally considered as a single type.</li>".
    - "symptoms": <li> items for signs a person would actually notice or feel.
    - "causes": <li> items for what causes the condition.
    - "risk_factors": <li> items for things that make someone MORE likely to get it (age, habits, family history, etc.).
    - "diagnosis": <li> items describing how doctors typically confirm it (exams, tests, scans) in simple terms.
    - "medicines": <li> items for common treatments, medicines, procedures or therapies.
    - "home_remedies": <li> items for safe self-care and lifestyle steps that help.
    - "complications": <li> items for what can happen if it is left untreated.
    - "prevention": <li> items for how to reduce the chance of getting it.
    - "when_to_see_doctor": 2-3 sentences describing warning signs that mean someone should see a doctor or seek emergency care.
    - "faqs": <li> items where each item is "<strong>Question?</strong> Answer." Provide 4-5 common patient questions with clear answers.
  `;
}

function coerceHtml(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        const s = String(item).trim();
        if (!s) return "";
        return s.includes("<li") ? s : `<li>${s}</li>`;
      })
      .join("");
  }
  if (typeof val === "object") {
    return Object.entries(val)
      .map(([k, v]) => `<li><strong>${k}</strong> ${v}</li>`)
      .join("");
  }
  return String(val);
}

function generateMockDetails(name, chapter) {
  const n = name.toLowerCase();
  const ch = chapter.toLowerCase();
  return {
    summary: `${name} is a health condition related to the ${ch} that may need medical attention.`,
    overview:
      `<strong>${name}</strong> is a condition grouped under <em>${chapter}</em>. In simple terms, it affects how ` +
      `this part of the body normally works, and the effects can range from mild to serious depending on the person.` +
      `<br><br>The good news is that conditions like this can usually be managed well once a doctor identifies the ` +
      `cause. This page gives a general, easy-to-understand overview — it is not a substitute for a real medical consultation.`,
    types: `<li><strong>Acute ${n}</strong> — comes on suddenly and is usually short-term.</li><li><strong>Chronic ${n}</strong> — develops slowly and lasts a long time.</li>`,
    symptoms: "<li>Discomfort or pain in the affected area</li><li>Noticeable changes in how that part of the body works</li><li>Feeling generally unwell, weak, or tired</li><li>Symptoms that get worse if the condition is ignored</li>",
    causes: `<li>Underlying problems affecting the ${ch}</li><li>Infection, injury, or wear-and-tear over time</li><li>Genetic or inherited factors in some people</li>`,
    risk_factors: "<li>Increasing age</li><li>Family history of similar conditions</li><li>Lifestyle habits such as poor diet, smoking, or lack of exercise</li><li>Other existing health problems</li>",
    diagnosis: "<li>The doctor asks about your symptoms and medical history</li><li>A physical examination of the affected area</li><li>Blood tests or lab work if needed</li><li>Imaging such as X-ray, ultrasound, or scans when appropriate</li>",
    medicines: "<li>Evaluation and diagnosis by a qualified doctor or specialist</li><li>Medicines to relieve symptoms such as pain or inflammation</li><li>Treatment aimed at the underlying cause</li><li>Follow-up care to check that treatment is working</li>",
    home_remedies: "<li>Get adequate rest and stay well hydrated</li><li>Eat a balanced, nutritious diet</li><li>Take medicines exactly as prescribed</li><li>Manage stress and avoid known triggers</li>",
    complications: "<li>Symptoms may worsen and become harder to treat</li><li>It can interfere with daily activities and quality of life</li><li>Untreated cases may lead to further health problems</li>",
    prevention: "<li>Have regular health check-ups and screenings</li><li>Avoid known risk factors and triggers</li><li>Maintain a healthy lifestyle with good diet and exercise</li>",
    when_to_see_doctor:
      `See a doctor if your symptoms are severe, do not improve, or suddenly get worse. Seek emergency care if ` +
      `${n} causes intense pain or makes it hard to function. When in doubt, it is always safer to get checked.`,
    faqs:
      `<li><strong>Is ${name} serious?</strong> It can range from mild to serious. A doctor can tell you how it applies to your situation.</li>` +
      `<li><strong>Can it be treated?</strong> Yes — most conditions like this can be managed with the right care and follow-up.</li>` +
      `<li><strong>Is it contagious?</strong> Not all conditions spread between people; ask your doctor about your specific case.</li>` +
      `<li><strong>Can I manage it at home?</strong> Home care can help, but it should support — not replace — professional medical advice.</li>`,
  };
}

function detailsFromParsed(parsed, name, chapter) {
  const mock = generateMockDetails(name, chapter);
  const out = {};
  for (const key of DETAIL_KEYS) {
    const val = coerceHtml(parsed[key]);
    out[key] = val || mock[key];
  }
  return out;
}

function looksLikeRateLimit(err) {
  const s = String(err?.message || err).toLowerCase();
  return ["429", "rate", "quota", "resource_exhausted", "unavailable", "503", "overloaded", "timeout", "deadline"]
    .some((t) => s.includes(t));
}

function suggestedRetryDelay(err) {
  const s = String(err?.message || err);
  let m = s.match(/retry in ([\d.]+)s/i) || s.match(/retryDelay['"]?:\s*['"]?(\d+)s/i);
  return m ? parseFloat(m[1]) : null;
}

function stripFences(text) {
  let t = text.trim();
  if (t.startsWith("```json")) t = t.slice(7, -3).trim();
  else if (t.startsWith("```")) t = t.slice(3, -3).trim();
  return t;
}

async function generateDetailsViaGemini(name, code, chapter, { maxRetries = 4, baseDelay = 2 } = {}) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = buildDetailsPrompt(name, code, chapter);
  let lastErr;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
      const parsed = JSON.parse(stripFences(response.text));
      return detailsFromParsed(parsed, name, chapter);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1 && looksLikeRateLimit(err)) {
        const suggested = suggestedRetryDelay(err);
        const delay = suggested ? suggested + 1 : baseDelay * 2 ** attempt;
        console.log(`  [retry ${attempt + 1}/${maxRetries - 1}] transient error for ${code}; waiting ${Math.round(delay)}s...`);
        await sleep(delay * 1000);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

module.exports = {
  DETAIL_KEYS,
  MODEL,
  generateMockDetails,
  generateDetailsViaGemini,
};
