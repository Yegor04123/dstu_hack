import { useMemo } from "react";
import { ClientId, Difficulty } from "../types";
import { shouldShowTip } from "../data/lennaTips";
import styles from "./AILenna.module.css";

type Props = {
  clientId: ClientId;
  difficulty: Difficulty;
};

export function AILenna({ clientId, difficulty }: Props) {
  const tip = useMemo(() => {
    return shouldShowTip(difficulty, clientId);
  }, [clientId, difficulty]);

  // Если подсказки нет — показываем Лену молчащей
  const statusLabel =
    difficulty === "trainee"
      ? "🌱 Стажёр — Лена помогает"
      : difficulty === "shift"
      ? "☕ Смена — Лена наблюдает"
      : "🔥 Пик — Лена занята";
  const avatar = difficulty === "peak"
    ? "/assets/lenna/lenna-stressed.svg"
    : difficulty === "trainee"
      ? "/assets/lenna/lenna-help.svg"
      : "/assets/lenna/lenna-neutral.svg";

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>
        <img src={avatar} alt="Лена" />
        <span className={styles.indicator}></span>
      </div>
      <div className={styles.info}>
        <div className={styles.name}>Лена</div>
        <div className={styles.status}>{statusLabel}</div>
        {tip && (
          <div className={styles.tip}>
            <div className={styles.tipTail}></div>
            <p>{tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
