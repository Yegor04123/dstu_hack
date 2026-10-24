import { Difficulty } from "../types";

export const difficultyConfig: Record<Difficulty, {
  label: string;
  timerMul: number;
  tempStartDelta: number;
  hints: boolean;
  strictCompliance: boolean;
  queueSpike: boolean;
}> = {
  trainee: { label: "Стажёр", timerMul: 1.2, tempStartDelta: -10, hints: true, strictCompliance: false, queueSpike: false },
  shift: { label: "Смена", timerMul: 1.0, tempStartDelta: 0, hints: false, strictCompliance: false, queueSpike: false },
  peak: { label: "Пик нагрузки", timerMul: 0.8, tempStartDelta: 10, hints: false, strictCompliance: true, queueSpike: true },
};
