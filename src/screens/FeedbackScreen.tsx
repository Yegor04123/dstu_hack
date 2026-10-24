import { useState } from "react";
import styles from "./FeedbackScreen.module.css";

type Props = {
  clientName: string;
  temperature: number;
  csatDelta: number;
  escalated: boolean;
  reason?: string;
  onContinue: (note: string) => void;
};

export function FeedbackScreen({ clientName, temperature, csatDelta, escalated, reason, onContinue }: Props) {
  const [category, setCategory] = useState("Консультация");
  const [risk, setRisk] = useState("Нет");
  const [note, setNote] = useState("");
  const positive = csatDelta >= 0;
  return (
    <div className={styles.screen}>
      <main className={styles.card}>
        <span className={styles.tag}>Разбор обращения</span>
        <h1>{clientName}</h1>
        <p className={styles.result}>{positive ? "Клиент ушёл спокойнее" : "Клиент остался напряжён"}</p>
        <div className={styles.grid}>
          <div><span>Температура</span><strong>{Math.round(temperature)}</strong></div>
          <div><span>CSAT</span><strong className={positive ? styles.good : styles.bad}>{positive ? "+" : ""}{csatDelta.toFixed(1)}</strong></div>
          <div><span>Маршрут</span><strong>{escalated ? "Эскалация" : "L1"}</strong></div>
        </div>
        <p className={styles.lesson}>{reason || (positive ? "Эмпатия и конкретный следующий шаг сработали." : "Проверь CRM и признай эмоцию до объяснения фактов.")}</p>
        <section className={styles.afterCall}>
          <h2>Оформить обращение</h2>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>Консультация</option><option>Претензия</option><option>Фрод</option><option>Платёж</option><option>Технический сбой</option>
          </select>
          <select value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option>Нет</option><option>Нужна проверка безопасности</option><option>Риск эскалации</option><option>Нарушение полномочий</option>
          </select>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Короткая заметка для следующего оператора" rows={3} />
        </section>
        <button className={styles.cta} onClick={() => onContinue(`${category}; риск: ${risk}; заметка: ${note || "без дополнительной заметки"}`)}>Следующий входящий</button>
      </main>
    </div>
  );
}
