import { ClientId, Difficulty, Kpi } from "../types";
import styles from "./DebriefScreen.module.css";

type Props = {
  nickname: string;
  difficulty: Difficulty;
  kpi: Kpi;
  casesDone: Record<ClientId, "pending" | "active" | "done" | "escalated">;
  notes: string[];
  stress: number;
  reputation: number;
  achievements: string[];
  caseTotal: number;
  onRestart: () => void;
};

function avgCsat(k: Kpi) {
  if (k.csatCount === 0) return 0;
  return k.csatSum / k.csatCount;
}

function avgAht(k: Kpi) {
  if (k.ahtCount === 0) return 0;
  return k.ahtSum / k.ahtCount;
}

const achievementLabels: Record<string, string> = {
  "fraud-sensor": "Поймал фрод",
  "safe-shift": "Безопасная смена",
  "clean-escalation": "Эскалировал по делу",
};

export function DebriefScreen({ nickname, difficulty, kpi, casesDone, notes, stress, reputation, achievements, caseTotal, onRestart }: Props) {
  const csat = avgCsat(kpi);
  const aht = avgAht(kpi);
  const fcr = kpi.fcrTotal === 0 ? 0 : Math.round((kpi.fcrResolved / kpi.fcrTotal) * 100);
  const doneCount = Object.values(casesDone).filter((v) => v === "done" || v === "escalated").length;

  function exportProfile() {
    const profileCard = {
      operator: nickname || "Стажёр",
      difficulty,
      profile,
      metrics: { csat: Number(csat.toFixed(2)), aht: Number(aht.toFixed(1)), fcr, compliance: kpi.compliance, handled: `${doneCount}/${caseTotal}` },
      stress,
      reputation,
      achievements,
      notes,
    };
    const blob = new Blob([JSON.stringify(profileCard, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smena-${(nickname || "operator").replace(/[^a-zа-яё0-9_-]/gi, "-")}-profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  let profile = "Сбалансированный";
  if (csat >= 4.2 && fcr >= 70) profile = "Заботливый и компетентный";
  if (aht <= 1.6 && fcr >= 60) profile = "Скоростной";
  if (kpi.compliance >= 98) profile = "Осторожный, безопасный";

  return (
    <div className={styles.screen}>
      <main className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>Акт 3 — Дебрифинг</span>
          <h1 className={styles.title}>Смена завершена</h1>
          <p className={styles.subtitle}>
            {nickname || "Стажёр"} · {difficulty === "trainee" ? "Стажёр" : difficulty === "peak" ? "Пик нагрузки" : "Смена"}
          </p>
        </header>
        <section className={styles.grid}>
          <div className={styles.panel}>
            <h2>Показатели</h2>
            <div className={styles.stats}>
              <div>
                <span>Средний CSAT</span>
                <strong>{csat.toFixed(2)} / 5</strong>
              </div>
              <div>
                <span>Средний AHT</span>
                <strong>{aht.toFixed(1)} мин</strong>
              </div>
              <div>
                <span>FCR (решено без эскалации)</span>
                <strong>{fcr}%</strong>
              </div>
              <div>
                <span>Compliance</span>
                <strong>{kpi.compliance}%</strong>
              </div>
              <div>
                <span>Обработано обращений</span>
                <strong>{doneCount} / {caseTotal}</strong>
              </div>
            </div>
            <div className={styles.profile}>
              <span>Профиль оператора</span>
              <strong>{profile}</strong>
            </div>
            <div className={styles.profile}>
              <span>Состояние и репутация</span>
              <strong>Стресс {stress}% · Репутация {reputation >= 0 ? "+" : ""}{reputation}</strong>
            </div>
          </div>
          <div className={styles.panel}>
            <h2>Разбор</h2>
            <ul className={styles.lessons}>
              <li>Слушай и структурируй проблему до поиска решения.</li>
              <li>Проверяй факты в CRM/БЗ — догадки дорого обходятся.</li>
              <li>Безопасность важнее скорости: не запрашивай коды.</li>
              <li>Эскалация — корректная работа, не поражение.</li>
              <li>Признай эмоцию клиента, держи границы полномочий.</li>
            </ul>
            {notes.length > 0 && (
              <>
                <h3>Заметки по кейсам</h3>
                <ul className={styles.notes}>
                  {notes.slice(-5).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </>
            )}
            <h3>Достижения</h3>
            <ul className={styles.notes}>
              {achievements.length > 0 ? achievements.map((a) => <li key={a}>{achievementLabels[a] ?? a}</li>) : <li>Смена ещё формирует твой профиль.</li>}
            </ul>
          </div>
        </section>
        <footer className={styles.footer}>
          <button className={styles.secondary} onClick={exportProfile}>Скачать профиль</button>
          <button className={styles.cta} onClick={onRestart}>
            В главное меню
          </button>
        </footer>
      </main>
    </div>
  );
}
