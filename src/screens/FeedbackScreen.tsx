import styles from "./FeedbackScreen.module.css";

type Props = {
  clientName: string;
  temperature: number;
  csatDelta: number;
  escalated: boolean;
  reason?: string;
  onContinue: () => void;
};

export function FeedbackScreen({ clientName, temperature, csatDelta, escalated, reason, onContinue }: Props) {
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
        <button className={styles.cta} onClick={onContinue}>Следующий входящий</button>
      </main>
    </div>
  );
}
