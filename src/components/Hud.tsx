import { Difficulty, Kpi } from "../types";
import styles from "./Hud.module.css";

type Props = {
  nickname: string;
  difficulty: Difficulty;
  kpi: Kpi;
  queueIndex: number;
  queueTotal: number;
  temperature: number;
  timeRemaining: number;
  stress: number;
};

function avgCsat(k: Kpi) {
  if (k.csatCount === 0) return "—";
  return (k.csatSum / k.csatCount).toFixed(2);
}

function avgAht(k: Kpi) {
  if (k.ahtCount === 0) return "—";
  const m = Math.floor(k.ahtSum / k.ahtCount);
  const s = Math.round(((k.ahtSum / k.ahtCount) % 1) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function tempClass(t: number) {
  if (t >= 86) return styles.hot;
  if (t >= 61) return styles.warm;
  if (t >= 31) return styles.mild;
  return styles.cold;
}

export function Hud({ nickname, difficulty, kpi, queueIndex, queueTotal, temperature, timeRemaining, stress }: Props) {
  return (
    <header className={styles.hud}>
      <div className={styles.group}>
        <span className={styles.brand}>СМЕНА</span>
        <span className={styles.divider} />
        <span>{nickname}</span>
        <span className={styles.pill}>
          {difficulty === "trainee" ? "Стажёр" : difficulty === "peak" ? "Пик" : "Смена"}
        </span>
      </div>
      <div className={styles.group}>
        <div className={styles.stat}>
          <span>CSAT</span>
          <strong>{avgCsat(kpi)}</strong>
        </div>
        <div className={styles.stat}>
          <span>AHT</span>
          <strong>{avgAht(kpi)}</strong>
        </div>
        <div className={styles.stat}>
          <span>FCR</span>
          <strong>
            {kpi.fcrTotal === 0 ? "—" : `${Math.round((kpi.fcrResolved / kpi.fcrTotal) * 100)}%`}
          </strong>
        </div>
        <div className={styles.stat}>
          <span>Compliance</span>
          <strong>{kpi.compliance}%</strong>
        </div>
        <div className={styles.stat}>
          <span>Очередь</span>
          <strong>
            {queueIndex + 1}/{queueTotal}
          </strong>
        </div>
        <div className={styles.temp}>
          <span>Температура клиента</span>
          <div className={styles.bar}>
            <div className={`${styles.fill} ${tempClass(temperature)}`} style={{ width: `${temperature}%` }} />
          </div>
          <strong className={tempClass(temperature)}>{Math.round(temperature)}</strong>
        </div>
        <div className={styles.stat}>
          <span>Ответ</span>
          <strong className={timeRemaining <= 10 ? styles.hot : ""}>{timeRemaining}s</strong>
        </div>
        <div className={styles.stat}>
          <span>Стресс</span>
          <strong className={stress >= 70 ? styles.hot : ""}>{stress}%</strong>
        </div>
      </div>
    </header>
  );
}
