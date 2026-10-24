import { LennaCharacter } from "../components/LennaCharacter";
import styles from "./BriefingScreen.module.css";

type Props = {
  nickname: string;
  difficulty: string;
  onStart: () => void;
};

export function BriefingScreen({ nickname, difficulty, onStart }: Props) {
  const displayName = nickname || "Стажёр";

  const lennaMessages = [
    `Привет, ${displayName}! Я Лена, твой наставник.`,
    "Сегодня твоя первая смена в контакт-центре банка «Южный Резерв».",
    "Не волнуйся — я буду рядом и помогу.",
    "Главное правило: слушай клиента и не бойся задавать вопросы.",
    "Если не уверена в ответе — используй базу знаний или эскалируй вопрос.",
    "Удачи! Ты справишься! 💪",
  ];

  const diffLabel =
    difficulty === "trainee"
      ? "Стажёр"
      : difficulty === "shift"
      ? "Смена"
      : "Пик нагрузки";

  const modeText = difficulty === "trainee"
    ? "Короткие ситуации и готовые варианты реплик помогут освоить базовый алгоритм."
    : difficulty === "shift"
      ? "В очереди фрод, юрлицо и жалоба: придётся проверять факты, выбирать маршрут и отвечать за последствия."
      : "Заготовок не будет: пиши клиенту сам, а локальная модель ответит и оценит диалог.";

  return (
    <div className={styles.screen}>
      <div className={styles.bgGrid} />
      <main className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>Брифинг перед сменой</span>
          <h1 className={styles.title}>Добро пожаловать, {displayName}!</h1>
          <p className={styles.subtitle}>
            Сложность: <strong>{diffLabel}</strong>
          </p>
        </header>

        <div className={styles.lennaSection}>
          <LennaCharacter
            messages={lennaMessages}
            autoPlay={true}
            messageDelay={3500}
          />
        </div>

        <footer className={styles.footer}>
          <button className={styles.cta} onClick={onStart}>
            Начать смену
          </button>
          <p className={styles.note}>
            {modeText} Слушай Лену и не торопись.
          </p>
        </footer>
      </main>
    </div>
  );
}
