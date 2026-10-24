import { useState, useEffect } from "react";
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

const descriptions: Record<Difficulty, string> = {
  trainee: "Мягкий темп, наставник Лена рядом. Идеально для первого знакомства.",
  shift: "Классическая смена. 7 клиентов, стандартная очередь.",
  peak: "Понедельник, 9:15. Очередь растёт, клиенты злые. Только для опытных.",
};

const icons: Record<Difficulty, string> = {
  trainee: "🌱",
  shift: "☕",
  peak: "🔥",
};

export function TitleScreen({ hasSave, onStart, onContinue }: Props) {
  const [nickname, setNickname] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("shift");
  const [currentTime, setCurrentTime] = useState("");

  // 🆕 Показываем "время начала смены"
  useEffect(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    setCurrentTime(`${hours}:${mins}`);
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.bgGrid} />
      <main className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>📞 Браузерная narrative-sim</span>
          <h1 className={styles.title}>СМЕНА</h1>
          <p className={styles.subtitle}>
            Первая смена оператора контакт-центра банка «Южный Резерв»
          </p>
          {/* 🆕 Атмосферная строка */}
          <p className={styles.lore}>
            Понедельник, {currentTime}. Ваш пропуск активирован. Наденьте гарнитуру — очередь уже ждёт.
          </p>
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
                  <strong>
                    <span className={styles.diffIcon}>{icons[d]}</span>
                    {labels[d]}
                  </strong>
                  <span>{descriptions[d]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <button
            className={styles.cta}
            onClick={() => onStart(nickname, difficulty)}
          >
            ▶ Начать смену
          </button>
          {hasSave && (
            <button className={styles.ghost} onClick={onContinue}>
              ↻ Продолжить сохранённую смену
            </button>
          )}
          <p className={styles.note}>
            Без регистрации • Сохранение в localStorage • 12–18 минут
          </p>
        </footer>
      </main>
    </div>
  );
}