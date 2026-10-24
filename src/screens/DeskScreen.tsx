import { useMemo, useState, useEffect, useRef } from "react";
import { Case, CaseStatus, ClientId, Difficulty, Kpi, DialogueNode, DialogueOption } from "../types";
import { Hud } from "../components/Hud";
import { AILenna } from "../components/AILenna";
import { knowledgeArticles } from "../data/knowledge";
import { crmCards } from "../data/crm";
import { clientProfiles } from "../data/clientProfiles";
import { playIncoming, playTemperatureAlert } from "../utils/sound";
import { assessTurn, LocalTurnAssessment } from "../services/localLlm";
import styles from "./DeskScreen.module.css";

type Props = {
  nickname: string;
  difficulty: Difficulty;
  diffCfg: {
    label: string;
    timerMul: number;
    tempStartDelta: number;
    hints: boolean;
    strictCompliance: boolean;
    queueSpike: boolean;
  };
  caseItem: Case;
  queueOrder: ClientId[];
  caseIndex: number;
  temperature: number;
  startedAt?: number;
  trustValue?: number;
  stress: number;
  kpi: Kpi;
  openedKnowledge: string[];
  onOpenKnowledge: (id: string) => void;
  casesDone: Record<ClientId, CaseStatus>;
  onSelectClient: (index: number) => void;
  notes: string[];
  chatHistory: DialogueNode[];
  onChatHistoryChange: (clientId: ClientId, history: DialogueNode[]) => void;
  onTemperatureChange: (clientId: ClientId, value: number) => void;
  onTrustChange: (clientId: ClientId, value: number) => void;
  onFinish: (result: {
    tempDelta: number;
    csatDelta: number;
    ahtDelta: number;
    complianceDelta: number;
    fcr: boolean;
    escalated: boolean;
    reason?: string;
    stressDelta?: number;
    reputationDelta?: number;
    finalTemperature?: number;
    finalTrust?: number;
  }) => void;
};

const replyDictionary: Record<string, string> = {
  "Признать эмоцию и уточнить, по какой именно операции речь.": "Я понимаю ваше возмущение. Давайте уточним, по какой именно операции речь?",
  "Сказать: «В соответствии с тарифом комиссия предусмотрена».": "В соответствии с тарифом, данная комиссия предусмотрена условиями обслуживания.",
  "Сразу попросить эскалировать без проверки.": "Я передам ваш вопрос старшему специалисту для проверки.",
  "Проверить операцию в CRM и сверить с тарифом.": "Сейчас я проверю операцию в системе и сверю с тарифом.",
  "Использовать базу знаний «Комиссии» и корректно объяснить + зафиксировать претензию.": "Согласно нашей базе знаний, комиссия списана в соответствии с тарифом. Я зафиксирую вашу претензию и направлю на рассмотрение.",
  "Обещать, что комиссия точно вернётся сегодня.": "Я обещаю, что комиссия вернётся сегодня.",
  "Признать эмоцию, успокоить и предложить проверить операцию.": "Понимаю ваше возмущение. Давайте я проверю операцию и разберусь в ситуации.",
  "Повторить фразу по тарифу ещё раз.": "Согласно тарифу, комиссия предусмотрена условиями обслуживания.",
  "Зафиксировать претензию, объяснить эскалацию и попрощаться корректно.": "Я зафиксирую вашу претензию и передам её на рассмотрение. Спасибо за обращение.",
  "Завершить с фиксацией жалобы.": "Я зафиксирую вашу жалобу. Всего доброго.",
  "Успокоить, уточнить ошибку/сообщение.": "Понимаю, что ситуация срочная. Какое сообщение об ошибке вы видите?",
  "Советовать переустановить приложение.": "Попробуйте переустановить приложение.",
  "Проверить лимиты и статус в CRM.": "Сейчас проверю лимиты и статус операции в системе.",
  "Использовать «Переводы», объяснить причину и следующий шаг.": "Согласно нашей базе знаний, перевод отклонён из-за лимита. Давайте увеличим лимит и повторим операцию.",
  "Указать что-то гадательное без проверки.": "К сожалению, без проверки в системе я не могу дать точный ответ.",
  "Перейти к проверке в системе, признать ошибку совета.": "Прошу прощения за неверный совет. Сейчас проверю в системе.",
  "Успокоить, объяснить стоп-правила и не запрашивать коды.": "Вы правильно не стали переводить деньги. Запомните: банк никогда не запрашивает коды из SMS.",
  "Попросить назвать код из SMS для проверки.": "Назовите, пожалуйста, код из SMS для проверки.",
  "Сказать: «Переведите, это безопасно»": "Переведите деньги, это безопасно.",
  "Зафиксировать инцидент, дать краткие рекомендации, завершить.": "Я зафиксирую этот инцидент и направлю информацию в службу безопасности. Будьте бдительны!",
  "Срочно остановить разговор по инструкции и зафиксировать критичную ошибку.": "Пожалуйста, не совершайте никаких переводов! Это мошенники. Я зафиксирую инцидент.",
  "Уточнить причину и предложить временную блокировку.": "Подскажите, пожалуйста, причину? Я могу предложить временную блокировку карты.",
  "Сразу закрыть карту.": "Хорошо, я закрою вашу карту прямо сейчас.",
  "Проинформировать о процедуре и направить по регламенту.": "Процедура закрытия карты занимает до 30 дней. Я направлю вас по регламенту.",
  "Уважить выбор, заблокировать временно и объяснить процедуру закрытия.": "Я уважаю ваше решение. Карту можно заблокировать временно, а процедура полного закрытия занимает до 30 дней.",
  "Уговорить не закрывать карту.": "Может быть, стоит пересмотреть решение? У карты есть полезные функции.",
  "Корректно завершить, зафиксировать обращение.": "Я зафиксирую ваше обращение. Всего доброго!",
  "Собрать реквизиты: дата, сумма, ИНН получателя, назначение.": "Для проверки мне нужны реквизиты: дата, сумма, ИНН получателя и назначение платежа.",
  "Уверенно сказать: «Платёж ушёл, всё в порядке».": "Платёж ушёл, всё в порядке.",
  "Сверить статус платежа в CRM.": "Сейчас сверю статус платежа в системе.",
  "Сделать корректную эскалацию с фактами.": "Я передам ваш вопрос в платёжный стол с полным описанием ситуации.",
  "Попытаться сам исправить назначение платежа.": "Я попробую исправить назначение платежа.",
  "Корректно зафиксировать и эскалировать.": "Я зафиксирую обращение и передам в платёжный стол.",
  "Признать эмоцию, не оправдываться, уточнить факты.": "Понимаю, что ситуация неприятная. Расскажите, пожалуйста, что именно произошло?",
  "Сказать: «У нас все в polite», оправдываться.": "У нас все операторы вежливые. Возможно, вы неправильно поняли.",
  "Сразу зафиксировать жалобу по регламенту": "Я зафиксирую вашу жалобу по регламенту.",
  "Зафиксировать факты и направить на контроль качества.": "Я зафиксирую все факты и направлю их на контроль качества.",
  "Сократить фиксацию, торопить клиента.": "Давайте быстрее, у меня мало времени.",
  "Корректно зафиксировать претензию.": "Я зафиксирую вашу претензию. Всего доброго.",
  "Определить зону и корректно перевести с объяснением.": "Ваш вопрос находится вне зоны моей компетенции. Я корректно переведу вас к нужному специалисту.",
  "Попробовать ответить, хотя не уверен.": "Я постараюсь ответить, хотя не уверен в точности.",
  "Сказать «не знаю» и бросить перевод.": "К сожалению, я не знаю. До свидания.",
  "Корректная маршрутизация с объяснением клиенту.": "Я направлю вас к нужному специалисту с полным описанием вопроса.",
  "Перейти к корректной маршрутизации.": "Сейчас я направлю вас к нужному специалисту.",
};

const clientAvatars: Record<ClientId, string> = {
  c1: "/assets/clients/c1-igor.svg",
  c2: "/assets/clients/c2-marina.svg",
  c3: "/assets/clients/c3-petr.svg",
  c4: "/assets/clients/c4-alina.svg",
  c5: "/assets/clients/c5-yugtrade.svg",
  c6: "/assets/clients/c6-darya.svg",
  c7: "/assets/clients/c7-andrey.svg",
  c8: "/assets/clients/c8-olga.svg",
};

function cleanAgentText(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  cleaned = cleaned.replace(/^\s*\(.*?\)\s*/i, '');
  
  const prefixPatterns = [
    /^сказать\s*[:\-—–]?\s*/i,
    /^ответить\s*[:\-—–]?\s*/i,
    /^уточнить\s*[:\-—–]?\s*/i,
    /^написать\s*[:\-—–]?\s*/i,
    /^спросить\s*[:\-—–]?\s*/i,
    /^предложить\s*[:\-—–]?\s*/i,
    /^объяснить\s*[:\-—–]?\s*/i,
    /^попросить\s*[:\-—–]?\s*/i,
    /^сообщить\s*[:\-—–]?\s*/i,
    /^успокоить\s*[:\-—–]?\s*/i,
    /^идентифицировать\s*[:\-—–]?\s*/i,
    /^признать эмоцию[,\s]*и?\s*/i,
    /^проверить\s*/i,
    /^использовать\s*/i,
    /^обещать[,\s]*что\s*/i,
    /^сразу попросить эскалировать\s*/i,
    /^зафиксировать\s*/i,
    /^попробовать ответить\s*/i,
    /^сказать\s*«не знаю»\s*/i,
    /^советовать\s*/i,
    /^определить зону и корректно перевести\s*/i,
    /^повторить\s*/i,
    /^завершить\s*/i,
    /^перейти к\s*/i,
    /^корректно\s*/i,
    /^собрать\s*/i,
    /^сверить\s*/i,
    /^уверенно сказать\s*[:\-—–]?\s*/i,
    /^сразу закрыть\s*/i,
    /^поинформировать\s*/i,
    /^уговорить\s*/i,
    /^сделать\s*/i,
    /^попытаться\s*/i,
    /^сократить\s*/i,
    /^указать\s*/i,
  ];
  
  for (const pattern of prefixPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      break;
    }
  }
  
  cleaned = cleaned.replace(/^[«""]+\s*/, '');
  cleaned = cleaned.replace(/\s*[«""]+$/g, '');
  cleaned = cleaned.replace(/[«""]/g, '');
  cleaned = cleaned.replace(/,\s*(оправдываться|торопить клиента|без проверки по регламенту)\.?$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  cleaned = cleaned.replace(/\.{2,}$/, '.');
  cleaned = cleaned.replace(/,\s*$/, '.');
  
  return cleaned;
}

function getAgentReply(optionText: string): string {
  if (replyDictionary[optionText]) {
    return replyDictionary[optionText];
  }
  return cleanAgentText(optionText);
}

export function DeskScreen({
  nickname,
  difficulty,
  diffCfg,
  caseItem,
  queueOrder,
  caseIndex,
  temperature,
  startedAt,
  trustValue,
  stress,
  kpi,
  openedKnowledge,
  onOpenKnowledge,
  casesDone,
  onSelectClient,
  notes,
  chatHistory: savedChatHistory,
  onChatHistoryChange,
  onTemperatureChange,
  onTrustChange,
  onFinish,
}: Props) {
  const [nodeId, setNodeId] = useState(caseItem.startNodeId);
  const [tab, setTab] = useState<"crm" | "kb" | "script">("crm");
  const [kbQuery, setKbQuery] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isFinishing, setIsFinishing] = useState(false);
  const [activeTool, setActiveTool] = useState<"crm" | "knowledge" | "check" | null>(null);
  const [llmAssessment, setLlmAssessment] = useState<LocalTurnAssessment | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(false);
  const [freeMessage, setFreeMessage] = useState("");
  const [aiTurns, setAiTurns] = useState<LocalTurnAssessment[]>([]);
  const [liveTemperature, setLiveTemperature] = useState(temperature);
  const profile = clientProfiles[caseItem.id];
  const [trust, setTrust] = useState(trustValue ?? profile.trust);
  const [visibleQueueCount, setVisibleQueueCount] = useState(Math.min(queueOrder.length, Math.max(2, caseIndex + 1)));
  const visibleQueue = queueOrder.filter((_, index) => index < visibleQueueCount || index === caseIndex);
  const nextIncomingId = difficulty === "peak"
    ? queueOrder.find((id, index) => index !== caseIndex && casesDone[id] === "pending")
    : undefined;
  const promiseWarning = /обещаю|точно будет|гарантирую|сегодня вернется|сейчас закрою/i.test(freeMessage);
  const clientHistory = notes.filter((note) => note.startsWith(`${caseItem.name}:`));
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [chatHistory, setChatHistory] = useState<DialogueNode[]>(savedChatHistory);
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  const node = useMemo(() => caseItem.nodes.find((n) => n.id === nodeId) ?? caseItem.nodes[0], [caseItem, nodeId]);
  const crm = crmCards[caseItem.id];
  
  const articles = useMemo(() => {
    const q = kbQuery.toLowerCase();
    if (!q) return knowledgeArticles;
    return knowledgeArticles.filter((a) => a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)));
  }, [kbQuery]);

  useEffect(() => {
    const startNode = caseItem.nodes.find((n) => n.id === caseItem.startNodeId) ?? caseItem.nodes[0];
    const initialHistory = savedChatHistory.length > 0 ? savedChatHistory : [startNode];
    setChatHistory(initialHistory);
    if (savedChatHistory.length === 0) onChatHistoryChange(caseItem.id, initialHistory);
    setNodeId(caseItem.startNodeId);
    setLiveTemperature(temperature);
    setTrust(trustValue ?? profile.trust);
    setAiTurns([]);
    setFreeMessage("");
    setTab("crm");
    setKbQuery("");
    setSelectedArticleId(null);
    setShowEscalate(false);
    setEscalateReason("");
    setActiveTool(null);
  }, [caseItem.id, caseItem.startNodeId]);

  useEffect(() => {
    setTrust(trustValue ?? profile.trust);
  }, [caseItem.id, trustValue]);

  function changeTemperature(delta: number) {
    setLiveTemperature((value) => {
      const next = Math.max(0, Math.min(100, value + delta));
      onTemperatureChange(caseItem.id, next);
      return next;
    });
  }

  function changeTrust(delta: number) {
    setTrust((value) => {
      const next = Math.max(0, Math.min(100, value + delta));
      onTrustChange(caseItem.id, next);
      return next;
    });
  }

  function commitChatHistory(next: DialogueNode[]) {
    setChatHistory(next);
    onChatHistoryChange(caseItem.id, next);
  }

  useEffect(() => {
    playIncoming(caseItem.channel);
  }, [caseItem.id, caseItem.channel]);

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    const duration = Math.max(20, Math.round(60 * diffCfg.timerMul));
    setIsFinishing(false);
    if (!startedAt) return;
    const getRemaining = () => Math.max(0, duration - Math.floor((Date.now() - startedAt) / 1000));
    const timer = window.setInterval(() => {
      const remaining = getRemaining();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        setIsFinishing(true);
        onFinishRef.current({
          tempDelta: diffCfg.strictCompliance ? 16 : 10,
          csatDelta: -0.7,
          ahtDelta: 0.5,
          complianceDelta: diffCfg.strictCompliance ? -8 : -3,
          fcr: false,
          escalated: true,
          reason: "Время ответа истекло",
          stressDelta: 12,
          reputationDelta: -2,
        });
      }
    }, 1000);
    setTimeRemaining(getRemaining());
    return () => window.clearInterval(timer);
  }, [caseItem.id, startedAt, diffCfg.timerMul, diffCfg.strictCompliance]);

  useEffect(() => {
    setLlmAssessment(null);
    setLlmError(false);
    setAiTurns([]);
  }, [caseItem.id]);

  useEffect(() => {
    setVisibleQueueCount((count) => Math.max(count, Math.min(queueOrder.length, Math.max(2, caseIndex + 1))));
    const interval = window.setInterval(() => setVisibleQueueCount((count) => {
      // Иногда очередь резко пополняется сразу двумя чатами.
      const incomingCount = count > 1 && count % 3 === 0 ? 2 : 1;
      return Math.min(queueOrder.length, count + incomingCount);
    }), 9000);
    return () => window.clearInterval(interval);
  }, [caseIndex, queueOrder.length]);

  async function evaluateWithLocalLlm(selectedReply: string) {
    if (difficulty !== "peak") return;
    setLlmLoading(true);
    setLlmError(false);
    try {
      const result = await assessTurn({
        clientName: caseItem.name,
        clientIssue: caseItem.intro,
        clientTemperature: liveTemperature,
        selectedReply,
        crmFlags: caseItem.crm.flags,
        history: chatHistory,
        trust,
        traits: profile.traits,
      });
      setLlmAssessment(result);
      setAiTurns((turns) => [...turns, result]);
      changeTemperature(result.temperatureDelta);
      if (result.temperatureDelta > 0) playTemperatureAlert();
      changeTrust(result.score >= 4 ? 5 : result.score <= 1 ? -12 : 0);
    } catch {
      setLlmError(true);
    } finally {
      setLlmLoading(false);
    }
  }

  async function sendFreeMessage() {
    const text = freeMessage.trim();
    if (!text || llmLoading || isFinishing) return;
    setFreeMessage("");
     commitChatHistory([...chatHistory, { id: `free-agent-${Date.now()}`, speaker: "agent", text }]);
    setLlmLoading(true);
    setLlmError(false);
    try {
      const result = await assessTurn({
        clientName: caseItem.name,
        clientIssue: caseItem.intro,
        clientTemperature: liveTemperature,
        selectedReply: text,
        crmFlags: caseItem.crm.flags,
        history: [...chatHistory, { speaker: "agent", text }],
        trust,
        traits: profile.traits,
      });
      setLlmAssessment(result);
      setAiTurns((turns) => [...turns, result]);
      changeTemperature(result.temperatureDelta);
      if (result.temperatureDelta > 0) playTemperatureAlert();
      changeTrust(result.score >= 4 ? 5 : result.score <= 1 ? -12 : 0);
      commitChatHistory([...chatHistory, { id: `free-agent-${Date.now()}`, speaker: "agent", text }, { id: `free-client-${Date.now()}`, speaker: "client", text: result.clientReply }]);
    } catch {
      setLlmError(true);
    } finally {
      setLlmLoading(false);
    }
  }

  function finishFreeCase() {
    if (!llmAssessment || isFinishing) return;
    setIsFinishing(true);
    onFinish({
      tempDelta: aiTurns.reduce((sum, turn) => sum + turn.temperatureDelta, 0),
      finalTemperature: liveTemperature,
      finalTrust: trust,
      csatDelta: (aiTurns.reduce((sum, turn) => sum + turn.score, 0) / Math.max(1, aiTurns.length) - 3) * 0.45,
      ahtDelta: 1,
      complianceDelta: llmAssessment.score >= 4 ? 2 : -2,
      fcr: aiTurns.some((turn) => turn.resolved),
      escalated: false,
      stressDelta: aiTurns.some((turn) => turn.score <= 1) ? 8 : -2,
      reputationDelta: aiTurns.every((turn) => turn.score >= 4) ? 3 : -2,
    });
  }

  function choose(option: DialogueOption) {
    if (isFinishing) return;
    setIsFinishing(true);
    const toolBonus = activeTool ? (activeTool === "check" ? -5 : -2) : 0;
    const res = {
      tempDelta: option.effects.tempDelta + toolBonus,
      csatDelta: option.effects.csatDelta,
      ahtDelta: option.effects.ahtDelta,
      complianceDelta: diffCfg.strictCompliance
        ? Math.min(option.effects.complianceDelta, option.effects.complianceDelta < 0 ? option.effects.complianceDelta * 1.5 : option.effects.complianceDelta)
        : option.effects.complianceDelta,
      fcr: option.effects.fcr ?? false,
      escalated: option.effects.escalate ?? false,
      reason: option.effects.escalateReason,
      stressDelta: option.effects.tempDelta > 8 ? 6 : activeTool ? -3 : 0,
      reputationDelta: option.effects.complianceDelta < 0 ? -2 : activeTool ? 2 : 0,
    };

    const nextNode = option.nextNodeId ? caseItem.nodes.find((n) => n.id === option.nextNodeId) : undefined;
    const agentText = getAgentReply(option.text);
    const agentMessage: DialogueNode = {
      id: `agent-${option.id}`,
      speaker: "agent",
      text: agentText,
    };
    const trustDelta = option.tone === "empathy" ? 6 : option.tone === "fact" ? 3 : option.tone === "push" ? -8 : 1;
    const finalTemperature = Math.max(0, Math.min(100, liveTemperature + res.tempDelta));
    const finalTrust = Math.max(0, Math.min(100, trust + trustDelta));
    changeTrust(trustDelta);
    changeTemperature(res.tempDelta);
    void evaluateWithLocalLlm(option.text);

    const appendMessages = (messages: DialogueNode[]) => {
      const nextHistory = (() => {
        const known = new Set(chatHistory.map((message) => message.id));
        return [...chatHistory, ...messages.filter((message) => !known.has(message.id))];
      })();
      commitChatHistory(nextHistory);
    };

    if (option.nextNodeId && nextNode) {
      const hasNextOptions = nextNode.options && nextNode.options.length > 0;

      if (nextNode.speaker === "agent") {
        // Текст следующего agent-узла — это контекст для следующих вариантов,
        // а не ещё одна реплика. Иначе первый ответ отображается дважды.
        appendMessages([agentMessage]);
      } else {
        appendMessages([agentMessage, nextNode]);
      }

      if (hasNextOptions) {
        setNodeId(option.nextNodeId);
        setIsFinishing(false);
        return;
      }

      setNodeId(option.nextNodeId);
      onFinish({ ...res, finalTemperature, finalTrust });
      return;
    }

    appendMessages([agentMessage]);
    onFinish({ ...res, finalTemperature, finalTrust });
  }

  function doEscalate() {
    setShowEscalate(false);
    onFinish({
      tempDelta: -6,
      csatDelta: 0.2,
      ahtDelta: 0.5,
      complianceDelta: 6,
      fcr: false,
      escalated: true,
      reason: escalateReason || "Эскалация по решению оператора",
      stressDelta: -2,
      reputationDelta: 3,
    });
  }

    return (
      <div className={`${styles.screen} ${difficulty === "peak" ? styles.peakScreen : ""}`}>
      <Hud nickname={nickname} difficulty={difficulty} kpi={kpi} queueIndex={caseIndex} queueTotal={queueOrder.length} temperature={liveTemperature} timeRemaining={timeRemaining} stress={stress} trust={trust} />
      <main className={styles.layout}>
        <aside className={styles.queue}>
          <header>
            <h2>Очередь</h2>
          </header>
          <ul>
            {visibleQueue.map((id) => {
              const idx = queueOrder.indexOf(id);
              const client = crmCards[id];
              const closed = casesDone[id] === "done" || casesDone[id] === "escalated";
              return (
                <li key={id} className={`${idx === caseIndex ? styles.active : ""} ${closed ? styles.done : ""}`}>
                  <button className={styles.clientItem} disabled={closed} onClick={() => onSelectClient(idx)} aria-label={`Открыть обращение ${client.name}`}>
                    <span className={`${styles.avatarWrap} ${liveTemperature >= 70 && id === caseItem.id ? styles.avatarHot : liveTemperature >= 40 && id === caseItem.id ? styles.avatarWarm : ""}`}>
                      <img className={styles.avatar} src={clientAvatars[id]} alt="" />
                    </span>
                    <span className={styles.clientInfo}>
                      <strong>{client.name.split(",")[0]}</strong>
                      <span>{closed ? "Закрыто" : idx === caseIndex ? (caseItem.channel === "call" ? "Звонок" : "Чат") : "Ожидание"} {idx === caseIndex && liveTemperature >= 70 && <b className={styles.hotBadge}>HOT</b>}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {diffCfg.queueSpike && <div className={styles.spike}>Пик нагрузки — очередь растёт</div>}
          {diffCfg.queueSpike && nextIncomingId && (
            <div className={styles.incomingAlert}>
              <strong>Второй входящий</strong>
              <span>{crmCards[nextIncomingId].name} ждёт ответа</span>
              <button onClick={() => onSelectClient(queueOrder.indexOf(nextIncomingId))}>Взять обращение</button>
            </div>
          )}
          
          {/* 🆕 AI-Лена вместо Курилки */}
          <AILenna 
            clientId={caseItem.id as ClientId}
            difficulty={difficulty}
          />
        </aside>
        
        <section className={styles.channel}>
          <header className={styles.channelHeader}>
            <div>
              <span className={styles.tag}><img className={styles.channelIcon} src={caseItem.channel === "call" ? "/assets/icons/phone.svg" : "/assets/icons/chat.svg"} alt="" />Канал: {caseItem.channel === "call" ? "ЗВОНОК" : "ЧАТ"}</span>
              <h1>{caseItem.name}</h1>
              <p>{caseItem.intro}</p>
            </div>
            <button className={styles.escalateBtn} onClick={() => setShowEscalate(true)}>
              Эскалировать
            </button>
          </header>
          
          <div className={styles.dialogue}>
            {chatHistory.map((msg, index) => (
              <div 
                key={`${msg.id}-${index}`} 
                className={`${styles.message} ${msg.speaker === "client" ? styles.client : styles.agent}`}
              >
                <span className={styles.speaker}>
                  {msg.speaker === "client" ? caseItem.name : msg.speaker === "agent" ? "Вы" : msg.speaker}
                </span>
                <p className="serif">{msg.text}</p>
              </div>
            ))}
            {difficulty === "peak" && llmLoading && (
              <div className={`${styles.message} ${styles.client} ${styles.typingMessage}`}>
                <span className={styles.speaker}>{caseItem.name}</span>
                <p className={styles.typing}><span /><span /><span /></p>
              </div>
            )}
            <div ref={dialogueEndRef} />
          </div>

          {difficulty === "peak" && (
            <div className={styles.llmPanel}>
              <div className={styles.llmHeader}>
                <strong>Локальный клиент · оценка ИИ</strong>
                <span>{llmLoading ? "анализирует…" : "Ollama / локальная модель"}</span>
              </div>
              {llmAssessment && (
                <>
                  <div className={styles.llmMeta}>Последняя оценка: {llmAssessment.score}/5 · температура {llmAssessment.temperatureDelta > 0 ? "+" : ""}{llmAssessment.temperatureDelta}</div>
                  <small>{llmAssessment.feedback}</small>
                </>
              )}
              {!llmAssessment && !llmLoading && !llmError && <small>Выберите ответ — модель сыграет реакцию клиента.</small>}
              {llmError && <small>Локальная модель недоступна. Используется сценарная ветка игры.</small>}
            </div>
          )}

          <div className={styles.options}>
            {difficulty === "peak" ? (
              <>
                <h2>Ваш ответ клиенту</h2>
                <div className={styles.composer}>
                  <textarea
                    value={freeMessage}
                    onChange={(event) => setFreeMessage(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendFreeMessage(); } }}
                    placeholder="Напишите клиенту своими словами…"
                    disabled={llmLoading || isFinishing}
                    rows={3}
                  />
                  <div className={styles.composerActions}>
                    <small>Enter — отправить · Shift+Enter — новая строка</small>
                    <button className={styles.cta} disabled={!freeMessage.trim() || llmLoading || isFinishing} onClick={() => void sendFreeMessage()}>Отправить</button>
                  </div>
                  {promiseWarning && <small className={styles.promiseWarning}>Осторожно: это обещание может нарушать полномочия L1.</small>}
                </div>
                <button className={styles.finishCase} disabled={!llmAssessment || isFinishing} onClick={finishFreeCase}>Завершить обращение</button>
              </>
            ) : (
              <>
                <h2>Выберите ответ</h2>
                <div className={styles.optionGrid}>
                  {node.options?.map((opt) => (
                    <button key={opt.id} className={styles.option} disabled={isFinishing} onClick={() => choose(opt)}>
                      <span className={styles.optionTone}>{opt.tone}</span>
                      <p>{opt.text}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className={styles.tools}>
          <div className={styles.tabs}>
            <button className={tab === "crm" ? styles.activeTab : ""} onClick={() => { setTab("crm"); setActiveTool("crm"); }}><img src="/assets/icons/crm.svg" alt="" />CRM</button>
            <button className={tab === "kb" ? styles.activeTab : ""} onClick={() => { setTab("kb"); setActiveTool("knowledge"); }}><img src="/assets/icons/knowledge-base.svg" alt="" />База знаний</button>
            <button className={tab === "script" ? styles.activeTab : ""} onClick={() => { setTab("script"); setActiveTool("check"); }}><img src="/assets/icons/shield.svg" alt="" />Скрипт</button>
          </div>
          {tab === "crm" && (
            <div className={styles.panel}>
              <header>
                <h2>{crm.name}</h2>
                <span className="mono">{crm.type === "business" ? "Юрлицо" : "Физлицо"} · {crm.status}</span>
              </header>
              <section>
                <h3>Продукты</h3>
                <ul>{crm.products.map((p) => <li key={p}>{p}</li>)}</ul>
              </section>
              <section>
                <h3>Последние операции</h3>
                <ul>{crm.lastOps.map((p) => <li key={p}>{p}</li>)}</ul>
              </section>
              <section>
                <h3>Флаги</h3>
                <div className={styles.flags}>{crm.flags.map((p) => <span key={p}>{p}</span>)}</div>
              </section>
              <section>
                <h3>Заметки</h3>
                <p>{crm.notes.join(" ")}</p>
              </section>
              <section className={styles.dossierSection}>
                <h3>История обращений</h3>
                {clientHistory.length > 0 ? <ul>{clientHistory.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Предыдущих обращений в этой смене нет.</p>}
              </section>
              <section className={`${styles.dossierSection} ${styles.contradiction}`}>
                <h3>Проверка фактов</h3>
                <p>{profile.contradiction}</p>
              </section>
              <section className={styles.dossierSection}>
                <h3>Досье клиента</h3>
                <div className={styles.traitList}>{profile.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
                <p><strong>Терпение:</strong> {profile.patience}% · <strong>Срочность:</strong> {profile.urgency}%</p>
                <p><strong>Противоречие:</strong> {profile.contradiction}</p>
              </section>
            </div>
          )}
          {tab === "kb" && (
            <div className={styles.panel}>
              {selectedArticleId ? (() => {
                const article = knowledgeArticles.find((item) => item.id === selectedArticleId);
                if (!article) return null;
                return (
                  <div className={styles.articleView}>
                    <button className={styles.backButton} onClick={() => setSelectedArticleId(null)}>← К списку статей</button>
                    <div className={styles.articleHeading}>
                      <span className={styles.articleNumber}>СТАТЬЯ БАЗЫ ЗНАНИЙ</span>
                      <h2>{article.title}</h2>
                      <div className={styles.articleTags}>{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    </div>
                    <p className={styles.articleBody}>{article.body}</p>
                    <section className={styles.articleRule}>
                      <h3>Можно</h3>
                      <ul>{article.can.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <section className={`${styles.articleRule} ${styles.articleDanger}`}>
                      <h3>Нельзя</h3>
                      <ul>{article.cannot.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <section className={styles.articleTemplate}>
                      <h3>Фраза-ориентир</h3>
                      <p>{article.template}</p>
                    </section>
                    <button className={styles.markArticle} onClick={() => onOpenKnowledge(article.id)}>
                      {openedKnowledge.includes(article.id) ? "✓ Статья изучена" : "Отметить как изученную"}
                    </button>
                  </div>
                );
              })() : (
                <>
                  <header>
                    <h2>База знаний</h2>
                    <input value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Поиск: комиссии, фрод..." />
                  </header>
                  <div className={styles.articleList}>
                    {articles.map((a) => (
                      <button key={a.id} className={`${styles.article} ${openedKnowledge.includes(a.id) ? styles.articleOpened : ""}`} onClick={() => { setSelectedArticleId(a.id); if (!openedKnowledge.includes(a.id)) onOpenKnowledge(a.id); }}>
                        <strong>{a.title}</strong>
                        <span>{a.tags.join(", ")}</span>
                        {openedKnowledge.includes(a.id) && <span className={styles.openedBadge}>✓ Изучена</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {tab === "script" && (
            <div className={styles.panel}>
              <header><h2>Скрипт линии</h2></header>
              <ol className={styles.script}>
                <li>Идентификация по регламенту</li>
                <li>Уточнение проблемы и фактов</li>
                <li>Проверка в CRM/БЗ</li>
                <li>Решение в рамках полномочий или эскалация</li>
                <li>Мягкое закрытие диалога</li>
              </ol>
              <div className={styles.tip}>
                <strong>Совет Лены</strong>
                <p>Признай эмоцию до факта. Конкретика следующего шага снижает температуру.</p>
              </div>
            </div>
          )}
        </aside>
      </main>
      {showEscalate && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <header>
              <h2>Эскалировать обращение</h2>
              <p>Выберите причину. Эскалация — корректное действие, если вне полномочий.</p>
            </header>
            <div className={styles.modalBody}>
              {["Платёжный стол", "Служба безопасности (фрод)", "Контроль качества/жалоба", "Другое подразделение"].map((r) => (
                <button key={r} className={escalateReason === r ? styles.modalActive : ""} onClick={() => setEscalateReason(r)}>
                  {r}
                </button>
              ))}
              <input value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Своя причина" />
            </div>
            <footer>
              <button className={styles.ghost} onClick={() => setShowEscalate(false)}>Отмена</button>
              <button className={styles.cta} onClick={doEscalate} disabled={!escalateReason}>Эскалировать</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
