import { useMemo, useState, useEffect, useRef } from "react";
import { Case, CaseStatus, ClientId, Difficulty, Kpi, DialogueNode, DialogueOption } from "../types";
import { Hud } from "../components/Hud";
import { AILenna } from "../components/AILenna";
import { knowledgeArticles } from "../data/knowledge";
import { crmCards } from "../data/crm";
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
  stress: number;
  kpi: Kpi;
  openedKnowledge: string[];
  onOpenKnowledge: (id: string) => void;
  casesDone: Record<ClientId, CaseStatus>;
  onSelectClient: (index: number) => void;
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
  stress,
  kpi,
  openedKnowledge,
  onOpenKnowledge,
  casesDone,
  onSelectClient,
  onFinish,
}: Props) {
  const [nodeId, setNodeId] = useState(caseItem.startNodeId);
  const [tab, setTab] = useState<"crm" | "kb" | "script">("crm");
  const [kbQuery, setKbQuery] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isFinishing, setIsFinishing] = useState(false);
  const [activeTool, setActiveTool] = useState<"crm" | "knowledge" | "check" | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [chatHistory, setChatHistory] = useState<DialogueNode[]>([]);
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
    setChatHistory([startNode]);
    setNodeId(caseItem.startNodeId);
  }, [caseItem]);

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    const duration = Math.max(20, Math.round(60 * diffCfg.timerMul));
    setTimeRemaining(duration);
    setIsFinishing(false);
    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
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
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [caseItem.id, nodeId, diffCfg.timerMul, diffCfg.strictCompliance]);

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

    const appendMessages = (messages: DialogueNode[]) => {
      setChatHistory((prev) => {
        const known = new Set(prev.map((message) => message.id));
        return [...prev, ...messages.filter((message) => !known.has(message.id))];
      });
    };

    if (option.nextNodeId && nextNode) {
      const hasNextOptions = nextNode.options && nextNode.options.length > 0;

      if (nextNode.speaker === "agent") {
        const nextAgentText = cleanAgentText(nextNode.text);
        const nextAgentMessage: DialogueNode = {
          ...nextNode,
          text: nextAgentText,
        };
          appendMessages([agentMessage, nextAgentMessage]);
        } else {
          appendMessages([agentMessage, nextNode]);
      }

      if (hasNextOptions) {
        setNodeId(option.nextNodeId);
        setIsFinishing(false);
        return;
      }

      setNodeId(option.nextNodeId);
      onFinish(res);
      return;
    }

    appendMessages([agentMessage]);
    onFinish(res);
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
      <div className={styles.screen}>
      <Hud nickname={nickname} difficulty={difficulty} kpi={kpi} queueIndex={caseIndex} queueTotal={queueOrder.length} temperature={temperature} timeRemaining={timeRemaining} stress={stress} />
      <main className={styles.layout}>
        <aside className={styles.queue}>
          <header>
            <h2>Очередь</h2>
          </header>
          <ul>
            {queueOrder.map((id, idx) => {
              const client = crmCards[id];
              const closed = casesDone[id] === "done" || casesDone[id] === "escalated";
              const initials = client.name.replace(/[«»]/g, "").split(/[ .,]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
              return (
                <li key={id} className={`${idx === caseIndex ? styles.active : ""} ${closed ? styles.done : ""}`}>
                  <button className={styles.clientItem} disabled={closed} onClick={() => onSelectClient(idx)} aria-label={`Открыть обращение ${client.name}`}>
                    <span className={styles.avatar}>{initials}</span>
                    <span className={styles.clientInfo}>
                      <strong>{client.name.split(",")[0]}</strong>
                      <span>{closed ? "Закрыто" : idx === caseIndex ? (caseItem.channel === "call" ? "Звонок" : "Чат") : "Ожидание"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {diffCfg.queueSpike && <div className={styles.spike}>Пик нагрузки — очередь растёт</div>}
          
          {/* 🆕 AI-Лена вместо Курилки */}
          <AILenna 
            clientId={caseItem.id as ClientId}
            difficulty={difficulty}
          />
        </aside>
        
        <section className={styles.channel}>
          <header className={styles.channelHeader}>
            <div>
              <span className={styles.tag}>Канал: {caseItem.channel === "call" ? "ЗВОНОК" : "ЧАТ"}</span>
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
            <div ref={dialogueEndRef} />
          </div>

          <div className={styles.options}>
            <h2>Выберите ответ</h2>
            <div className={styles.optionGrid}>
              {node.options?.map((opt) => (
                <button key={opt.id} className={styles.option} disabled={isFinishing} onClick={() => choose(opt)}>
                  <span className={styles.optionTone}>{opt.tone}</span>
                  <p>{opt.text}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.tools}>
          <div className={styles.tabs}>
            <button className={tab === "crm" ? styles.activeTab : ""} onClick={() => { setTab("crm"); setActiveTool("crm"); }}>CRM</button>
            <button className={tab === "kb" ? styles.activeTab : ""} onClick={() => { setTab("kb"); setActiveTool("knowledge"); }}>База знаний</button>
            <button className={tab === "script" ? styles.activeTab : ""} onClick={() => { setTab("script"); setActiveTool("check"); }}>Скрипт</button>
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
            </div>
          )}
          {tab === "kb" && (
            <div className={styles.panel}>
              <header>
                <h2>База знаний</h2>
                <input value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Поиск: комиссии, фрод..." />
              </header>
              <div className={styles.articleList}>
                {articles.map((a) => {
                  const isOpened = openedKnowledge.includes(a.id);
                  return (
                    <button 
                      key={a.id} 
                      className={`${styles.article} ${isOpened ? styles.articleOpened : ""}`}
                      onClick={() => onOpenKnowledge(a.id)}
                    >
                      <strong>{a.title}</strong>
                      <span>{a.tags.join(", ")}</span>
                      {isOpened && <span className={styles.openedBadge}>✅ Открыта (нажмите для закрытия)</span>}
                    </button>
                  );
                })}
              </div>
              {openedKnowledge.length > 0 && (
                <div className={styles.articleDetail}>
                  {openedKnowledge.map((id) => {
                    const article = knowledgeArticles.find((a) => a.id === id);
                    if (!article) return null;
                    return (
                      <div key={id} className={styles.openedArticle}>
                        <h3>{article.title}</h3>
                        <p className={styles.template}>{article.template}</p>
                      </div>
                    );
                  })}
                </div>
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
