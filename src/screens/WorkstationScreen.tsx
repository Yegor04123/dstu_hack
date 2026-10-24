import { Difficulty } from "../types";
import styles from "./WorkstationScreen.module.css";

type Props = {
  nickname: string;
  difficulty: Difficulty;
  message: string;
  onOpenLaptop: () => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
};

const labels: Record<Difficulty, string> = {
  trainee: "Стажёр",
  shift: "Смена",
  peak: "Пик нагрузки",
};

export function WorkstationScreen({ nickname, difficulty, message, onOpenLaptop, onChangeDifficulty }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.windowGlow} />
      <main className={styles.room}>
        <header className={styles.topbar}>
          <div><strong>Банк «Южный Резерв»</strong><span> · операторская 04</span></div>
          <label className={styles.difficulty}>
            Сложность
            <select value={difficulty} onChange={(event) => onChangeDifficulty(event.target.value as Difficulty)}>
              <option value="trainee">{labels.trainee}</option>
              <option value="shift">{labels.shift}</option>
              <option value="peak">{labels.peak}</option>
            </select>
          </label>
        </header>

        <section className={styles.scene}>
          <div className={styles.pinboard}>
            <span>ПЕРВАЯ СМЕНА</span>
            <i>не обещать невозможного</i>
            <i>проверять факты</i>
          </div>
          <div className={styles.lamp} />
          <div className={styles.desk}>
            <div className={styles.laptopWrap}>
              <button className={styles.laptop} onClick={onOpenLaptop} aria-label="Открыть ноутбук и CRM">
                <span className={styles.laptopScreen}>
                  <b>СМЕНА</b>
                  <small>Нажмите, чтобы открыть CRM</small>
                </span>
                <span className={styles.laptopBase} />
              </button>
              <span className={styles.laptopHint}>ОТКРЫТЬ CRM</span>
            </div>
            <div className={styles.cup}>☕</div>
            <div className={styles.phone}>☎</div>
          </div>

          <div className={styles.lenna}>
            <img src="/assets/lenna/lenna-help.svg" alt="Лена, куратор" />
            <div className={styles.bubble}>
              <strong>Лена · куратор</strong>
              <p>{message}</p>
              <button onClick={onOpenLaptop}>Понял, открыть ноутбук →</button>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>{nickname || "Стажёр"}</span>
          <span>Смена начинается с одного клика</span>
        </footer>
      </main>
    </div>
  );
}
