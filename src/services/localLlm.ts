export type LocalTurnAssessment = {
  clientReply: string;
  score: number;
  temperatureDelta: number;
  feedback: string;
  resolved: boolean;
};

const endpoint = import.meta.env.VITE_LLM_URL || "http://localhost:11434/api/chat";
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

export async function assessTurn(input: {
  clientName: string;
  clientIssue: string;
  clientTemperature: number;
  selectedReply: string;
  crmFlags: string[];
}): Promise<LocalTurnAssessment> {
  const prompt = `Ты — реалистичный клиент банка и строгий наставник оператора.
Ответь только JSON без markdown:
{"clientReply":"короткая реплика клиента на русском","score":1-5,"temperatureDelta":-15..15,"feedback":"одно предложение для стажёра","resolved":true|false}

Клиент: ${input.clientName}
Проблема: ${input.clientIssue}
Температура до ответа: ${input.clientTemperature}/100
Флаги CRM: ${input.crmFlags.join(", ") || "нет"}
Ответ оператора: ${input.selectedReply}

Не проси коды из SMS, CVV или полный номер карты. Не придумывай банковские обещания.
resolved=true ставь только если проблема реально решена или клиент согласился на следующий шаг.`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: "Ты модуль оценки диалогов контакт-центра." },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.35, num_predict: 160 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Ollama: ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  return extractJson(data.message?.content || "");
}
