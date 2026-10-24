export type LocalTurnAssessment = {
  clientReply: string;
  score: number;
  temperatureDelta: number;
  feedback: string;
  resolved: boolean;
};

const endpoint = import.meta.env.VITE_LLM_URL || "/ollama/api/chat";
const model = import.meta.env.VITE_LLM_MODEL || "qwen2.5:3b";

function extractJson(text: string): LocalTurnAssessment {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM вернула ответ не в JSON");
  const parsed = JSON.parse(match[0]) as Partial<LocalTurnAssessment>;
  if (typeof parsed.clientReply !== "string" || typeof parsed.feedback !== "string") {
    throw new Error("Неполный ответ LLM");
  }
  return {
    clientReply: parsed.clientReply,
    score: Math.max(1, Math.min(5, Number(parsed.score) || 3)),
    temperatureDelta: Math.max(-15, Math.min(15, Number(parsed.temperatureDelta) || 0)),
    feedback: parsed.feedback,
    resolved: Boolean(parsed.resolved),
  };
}

function applySafetyRubric(reply: string, assessment: LocalTurnAssessment): LocalTurnAssessment {
  const normalized = reply.toLowerCase().replace(/ё/g, "е");
  const insultPattern = /\b(идиот|дебил|дурак|туп(ой|ая|ые)|козел|коза|заткнись|отвали|пошел|пошла|ненавижу|чушь|бред)\b/i;
  const unsafePattern = /(код из sms|код из смс|cvv|cvc|полный номер карты|безопасн(ый|ом) счет|гарантирую возврат|обещаю возврат|гарантирую|обещаю|точно верн|сейчас закрою)/i;

  if (insultPattern.test(normalized)) {
    return {
      ...assessment,
      score: 1,
      temperatureDelta: 15,
      resolved: false,
      feedback: "Оскорбление разрушает доверие: сохраняй спокойный тон и возвращай разговор к фактам.",
      clientReply: "Мне неприятно это слышать. Давайте продолжим разговор спокойно и по существу.",
    };
  }

  if (unsafePattern.test(normalized)) {
    return {
      ...assessment,
      score: 1,
      temperatureDelta: 15,
      resolved: false,
      feedback: "Это нарушение безопасности. Нельзя запрашивать коды, CVV или обещать то, чего нет в полномочиях.",
      clientReply: "Я не буду сообщать коды или данные карты. Переключите меня на службу безопасности.",
    };
  }

  return assessment;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]/gi, "").replace(/\s+/g, " ").trim();
}

function isWeakReply(input: { selectedReply: string; history?: Array<{ speaker: string; text: string }> }, assessment: LocalTurnAssessment) {
  const reply = normalizeText(assessment.clientReply);
  const selected = normalizeText(input.selectedReply);
  const previousClientReplies = (input.history ?? [])
    .filter((message) => message.speaker === "client")
    .map((message) => normalizeText(message.text));

  if (reply.length < 8 || reply === selected || previousClientReplies.includes(reply)) return true;

  const replyWords = new Set(reply.split(" ").filter((word) => word.length > 3));
  const selectedWords = new Set(selected.split(" ").filter((word) => word.length > 3));
  if (selectedWords.size > 2) {
    const overlap = [...replyWords].filter((word) => selectedWords.has(word)).length / selectedWords.size;
    if (overlap >= 0.8) return true;
  }
  return false;
}

function buildPrompt(input: {
  clientName: string;
  clientIssue: string;
  clientTemperature: number;
  selectedReply: string;
  crmFlags: string[];
  history?: Array<{ speaker: string; text: string }>;
  trust?: number;
  traits?: string[];
}, correction = "") {
  const transcript = (input.history ?? []).slice(-8)
    .map((message) => `${message.speaker === "client" ? "КЛИЕНТ" : "ОПЕРАТОР"}: ${message.text}`)
    .join("\n");
  return `Ты играешь роль клиента банка. Ответь только JSON без markdown:
{"clientReply":"короткая естественная реплика клиента на русском","score":1-5,"temperatureDelta":-15..15,"feedback":"одно предложение оператору","resolved":true|false}

Клиент: ${input.clientName}
Главная проблема: ${input.clientIssue}
Температура: ${input.clientTemperature}/100
Доверие: ${input.trust ?? 50}/100
Особенности: ${input.traits?.join(", ") || "нет"}
CRM-флаги: ${input.crmFlags.join(", ") || "нет"}
Диалог:
${transcript || "Клиент только что описал проблему."}

Последний ответ оператора: ${input.selectedReply}
${correction}

Правила ответа клиента:
- ответь именно на последний ответ оператора и главную проблему;
- не повторяй дословно сообщение оператора или предыдущую реплику клиента;
- не пересказывай весь диалог и не пиши мета-комментарии;
- 1–2 предложения, максимум 220 символов;
- если оператор дал конкретный следующий шаг, отреагируй на него; если шаг плохой или опасный — возрази;
- не проси коды SMS, CVV или полный номер карты.

Оценка: грубость, оскорбления и небезопасные просьбы — score 1. resolved=true только если вопрос реально решён или клиент согласился на понятный следующий шаг.`;
}

async function requestAssessment(input: {
  clientName: string;
  clientIssue: string;
  clientTemperature: number;
  selectedReply: string;
  crmFlags: string[];
  history?: Array<{ speaker: string; text: string }>;
  trust?: number;
  traits?: string[];
}, correction = "") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: "Ты модуль симуляции клиента. Никогда не повторяй реплики дословно и не отвечай вместо оператора. Соблюдай JSON-формат." },
        { role: "user", content: buildPrompt(input, correction) },
      ],
      options: { temperature: 0.25, num_predict: 140 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Ollama: ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  return applySafetyRubric(input.selectedReply, extractJson(data.message?.content || ""));
}

export async function assessTurn(input: {
  clientName: string;
  clientIssue: string;
  clientTemperature: number;
  selectedReply: string;
  crmFlags: string[];
  history?: Array<{ speaker: string; text: string }>;
  trust?: number;
  traits?: string[];
}): Promise<LocalTurnAssessment> {
  const first = await requestAssessment(input);
  if (!isWeakReply(input, first)) return first;

  return requestAssessment(input, "ВАЖНАЯ ПОВТОРНАЯ ПРОВЕРКА: предыдущий вариант был неприемлем — он повторял текст или не отвечал по сути. Сгенерируй новую, конкретную реплику клиента, связанную с проблемой и последним ответом оператора.");
}
