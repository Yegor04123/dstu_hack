import { useMemo, useState } from "react";
import { Case, ClientId, Difficulty, Kpi } from "../types";
import { Hud } from "../components/Hud";
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
  kpi: Kpi;
  openedKnowledge: string[];
  onOpenKnowledge: (id: string) => void;
  onFinish: (result: {
    tempDelta: number;
    csatDelta: number;
    ahtDelta: number;
    complianceDelta: number;
    fcr: boolean;
    escalated: boolean;
    reason?: string;
  }) => void;
};

export function DeskScreen({
  nickname,
  difficulty,
  diffCfg,
  caseItem,
  queueOrder,
  caseIndex,
  temperature,
  kpi,
  openedKnowledge,
  onOpenKnowledge,
  onFinish,
}: Props) {
  const [nodeId, setNodeId] = useState(caseItem.startNodeId);
  const [tab, setTab] = useState<"crm" | "kb" | "script">("crm");
  const [kbQuery, setKbQuery] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  const node = useMemo(() => caseItem.nodes.find((n) => n.id === nodeId) ?? caseItem.nodes[0], [caseItem, nodeId]);
  const crm = crmCards[caseItem.id];
  const articles = useMemo(() => {
    const q = kbQuery.toLowerCase();
    if (!q) return knowledgeArticles;
    return knowledgeArticles.filter((a) => a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)));
  }, [kbQuery]);

  function choose(option: any) {
    const res = {
      tempDelta: option.effects.tempDelta + (diffCfg.tempStartDelta > 0 ? 2 : 0),
      csatDelta: option.effects.csatDelta,
      ahtDelta: option.effects.ahtDelta,
      complianceDelta: option.effects.complianceDelta,
      fcr: option.effects.fcr ?? false,
      escalated: option.effects.escalate ?? false,
      reason: option.effects.escalateReason,
    };
    if (option.nextNodeId) {
      setNodeId(option.nextNodeId);
      // don't finish, continue dialogue
      return;
    }
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
    });
  }

  return (
    <div className={styles.screen}>
      <Hud nickname={nickname} difficulty={difficulty} kpi={kpi} queueIndex={caseIndex} queueTotal={queueOrder.length} temperature={temperature} />
      <main className={styles.layout}>
        <aside className={styles.queue}>
          <header>
            <h2>Очередь</h2>
          </header>
          <ul>
            {queueOrder.map((id, idx) => (
              <li key={id} className={idx === caseIndex ? styles.active : idx < caseIndex ? styles.done : ""}>
                <span className={styles.dot} />
                <div>
                  <strong>{caseItem.id === id ? caseItem.name : crmCards[id].name.split(",")[0]}</strong>
                  <span>{caseItem.id === id ? caseItem.channel === "call" ? "Звонок" : "Чат" : "Ожидание"}</span>
                </div>
              </li>
            ))}
          </ul>
          {diffCfg.queueSpike && <div className={styles.spike}>Пик нагрузки — очередь растёт</div>}
          <footer>
            <h3>Курилка</h3>
            <p>Лена: «Если не уверен — эскалируй. Дыши.»</p>
            <p>Марк: «Успею!»</p>
            <p>Юля: «Главное — без ошибок по безопасности.»</p>
          </footer>
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
            <div className={`${styles.message} ${node.speaker === "client" ? styles.client : styles.agent}`}>
              <span className={styles.speaker}>{node.speaker === "client" ? caseItem.name : "Вы"}</span>
              <p className="serif">{node.text}</p>
            </div>
          </div>
          <div className={styles.options}>
            <h2>Выберите ответ</h2>
            <div className={styles.optionGrid}>
              {node.options?.map((opt) => (
                <button key={opt.id} className={styles.option} onClick={() => choose(opt)}>
                  <span className={styles.optionTone}>{opt.tone}</span>
                  <p>{opt.text}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
        <aside className={styles.tools}>
          <div className={styles.tabs}>
            <button className={tab === "crm" ? styles.activeTab : ""} onClick={() => setTab("crm")}>
              CRM
            </button>
            <button className={tab === "kb" ? styles.activeTab : ""} onClick={() => setTab("kb")}>
              База знаний
            </button>
            <button className={tab === "script" ? styles.activeTab : ""} onClick={() => setTab("script")}>
              Скрипт
            </button>
          </div>
          {tab === "crm" && (
            <div className={styles.panel}>
              <header>
                <h2>{crm.name}</h2>
                <span className="mono">{crm.type === "business" ? "Юрлицо" : "Физлицо"} · {crm.status}</span>
              </header>
              <section>
                <h3>Продукты</h3>
                <ul>
                  {crm.products.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Последние операции</h3>
                <ul>
                  {crm.lastOps.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Флаги</h3>
                <div className={styles.flags}>
                  {crm.flags.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
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
                {articles.map((a) => (
                  <button key={a.id} className={styles.article} onClick={() => onOpenKnowledge(a.id)}>
                    <strong>{a.title}</strong>
                    <span>{a.tags.join(", ")}</span>
                    {openedKnowledge.includes(a.id) && <em>Открыта</em>}
                  </button>
                ))}
              </div>
              {openedKnowledge.length > 0 && (
                <div className={styles.articleDetail}>
                  <h3>{knowledgeArticles.find((a) => openedKnowledge.includes(a.id))?.title}</h3>
                  <p className={styles.template}>
                    {knowledgeArticles.find((a) => openedKnowledge.includes(a.id))?.template}
                  </p>
                </div>
              )}
            </div>
          )}
          {tab === "script" && (
            <div className={styles.panel}>
              <header>
                <h2>Скрипт линии</h2>
              </header>
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
              <button className={styles.ghost} onClick={() => setShowEscalate(false)}>
                Отмена
              </button>
              <button className={styles.cta} onClick={doEscalate} disabled={!escalateReason}>
                Эскалировать
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
