import { Difficulty } from "../types";
import styles from "./BriefingScreen.module.css";

type Props = {
  nickname: string;
  difficulty: Difficulty;
  onStart: () => void;
};

const goals = [
  "Закрыть минимум 5 обращений",
  "Удержать средний CSAT ≥ 3.5 / 5",
  "Не допустить 2+ критических ошибок compliance",
];

export function BriefingScreen({ nickname, difficulty, onStart }: Props) {
  return (
    <div className={styles.screen}>
      <main className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>Акт 1 — Брифинг</span>
          <h1 className={styles.title}>Добро пожаловать, {nickname || "Стажёр"}</h1>
          <p className={styles.subtitle}>Наставник Лена встречает тебя перед первой сменой</p>
        </header>
        <section className={styles.body}>
          <div className={styles.dialogue}>
            <div className={styles.avatar}>Л</div>
            <div className={styles.bubble}>
              <p>«Сегодня ты не один. Я на линии. Не геройствуй: если не уверен — эскалируй.</p>
              <p>Главное не скорость любой ценой, а чтобы человек ушёл спокойнее, чем пришёл.»</p>
            </div>
          </div>
          <div className={styles.goals}>
            <h2>Цели смены</h2>
            <ul>
              {goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <p className={styles.hint}>
              Режим: <strong>{difficulty === "trainee" ? "Стажёр" : difficulty === "peak" ? "Пик нагрузки" : "Смена"}</strong>. 
              Слева — очередь, в центре — диалог, справа — CRM, База знаний, Скрипт.
            </p>
          </div>
        </section>
        <footer className={styles.footer}>
          <button className={styles.cta} onClick={onStart}>
            Приступить к смене
          </button>
        </footer>
      </main>
    </div>
  );
}
