import { useState } from "react";
import { Difficulty } from "../types";
import styles from "./TitleScreen.module.css";

type Props = {
  hasSave: boolean;
  onStart: (nickname: string, difficulty: Difficulty) => void;
  onContinue: () => void;
};

const diffs: Difficulty[] = ["trainee", "shift", "peak"];

const labels: Record<Difficulty, string> = {
  trainee: "Стажёр",
  shift: "Смена",
  peak: "Пик нагрузки",
};

export function TitleScreen({ hasSave, onStart, onContinue }: Props) {
  const [nickname, setNickname] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("shift");

  return (
    <div className={styles.screen}>
      <div className={styles.bgGrid} />
      <main className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>Браузерная narrative-sim</span>
          <h1 className={styles.title}>СМЕНА</h1>
          <p className={styles.subtitle}>Первая смена оператора контакт-центра банка «Южный Резерв»</p>
        </header>
        <section className={styles.section}>
          <label className={styles.label}>
            Никнейм (опционально)
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Стажёр"
              className={styles.input}
              maxLength={16}
            />
          </label>
          <div className={styles.label}>
            Сложность
            <div className={styles.diffGrid}>
              {diffs.map((d) => (
                <button
                  key={d}
                  className={`${styles.diffBtn} ${difficulty === d ? styles.active : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  <strong>{labels[d]}</strong>
                  <span>
                    {d === "trainee" && "Мягкий темп, больше подсказок"}
                    {d === "shift" && "Классика прототипа"}
                    {d === "peak" && "Жёстче, давление очереди"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <footer className={styles.footer}>
          <button className={styles.cta} onClick={() => onStart(nickname, difficulty)}>
            Начать смену
          </button>
          {hasSave && (
            <button className={styles.ghost} onClick={onContinue}>
              Продолжить смену
            </button>
          )}
          <p className={styles.note}>Без регистрации • Сохранение в localStorage • 12–18 минут</p>
        </footer>
      </main>
    </div>
  );
}
