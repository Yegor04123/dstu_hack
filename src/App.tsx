import { useEffect, useMemo, useState } from "react";
import { TitleScreen } from "./screens/TitleScreen";
import { BriefingScreen } from "./screens/BriefingScreen";
import { DeskScreen } from "./screens/DeskScreen";
import { DebriefScreen } from "./screens/DebriefScreen";
import { caseOrder, cases } from "./data/cases";
import { difficultyConfig } from "./data/difficulty";
import { ClientId, Difficulty, Kpi, SaveState } from "./types";
import { loadSave, saveState } from "./utils/save";

type Phase = "title" | "briefing" | "desk" | "debrief";

const emptyKpi = (): Kpi => ({
  csatSum: 0,
  csatCount: 0,
  ahtSum: 0,
  ahtCount: 0,
  fcrResolved: 0,
  fcrTotal: 0,
  compliance: 100,
});

function App() {
  const [phase, setPhase] = useState<Phase>("title");
  const [nickname, setNickname] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("shift");
  const [queueOrder, setQueueOrder] = useState<ClientId[]>(caseOrder);
  const [caseIndex, setCaseIndex] = useState(0);
  const [kpi, setKpi] = useState<Kpi>(emptyKpi());
  const [casesDone, setCasesDone] = useState<Record<ClientId, "pending" | "active" | "done" | "escalated">>({
    c1: "pending",
    c2: "pending",
    c3: "pending",
    c4: "pending",
    c5: "pending",
    c6: "pending",
    c7: "pending",
  });
  const [temperature, setTemperature] = useState<Record<ClientId, number>>({
    c1: 45,
    c2: 20,
    c3: 55,
    c4: 35,
    c5: 50,
    c6: 70,
    c7: 10,
  });
  const [openedKnowledge, setOpenedKnowledge] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const s = loadSave();
    if (s) setHasSave(true);
  }, []);

  const currentClientId = queueOrder[caseIndex];
  const currentCase = currentClientId ? cases[currentClientId] : null;
  const diffCfg = useMemo(() => difficultyConfig[difficulty], [difficulty]);

  function startNew(nick: string, diff: Difficulty) {
    const q = [...caseOrder];
    const cfg = difficultyConfig[diff];
    
    setNickname(nick || "Стажёр");
    setDifficulty(diff);
    setQueueOrder(q);
    setCaseIndex(0);
    setKpi(emptyKpi());
    setCasesDone({
      c1: "pending",
      c2: "pending",
      c3: "pending",
      c4: "pending",
      c5: "pending",
      c6: "pending",
      c7: "pending",
    });
    setTemperature({
      c1: 45 + cfg.tempStartDelta,
      c2: 20 + cfg.tempStartDelta,
      c3: 55 + cfg.tempStartDelta,
      c4: 35 + cfg.tempStartDelta,
      c5: 50 + cfg.tempStartDelta,
      c6: 70 + cfg.tempStartDelta,
      c7: 10 + cfg.tempStartDelta,
    });
    setOpenedKnowledge([]);
    setNotes([]);
    setPhase("briefing");
  }

  function continueSave() {
    const s = loadSave();
    if (!s) return;
    setNickname(s.nickname);
    setDifficulty(s.difficulty);
    setQueueOrder(s.queueOrder);
    setCaseIndex(s.caseIndex);
    setKpi(s.kpi);
    setCasesDone(s.cases as any);
    setTemperature(s.temperature);
    setOpenedKnowledge(s.openedKnowledge);
    setNotes(s.notes);
    setPhase("desk");
  }

  function persist(next: Partial<SaveState>) {
    const state: SaveState = {
      version: 1,
      nickname,
      difficulty,
      caseIndex,
      queueOrder,
      kpi,
      cases: casesDone,
      temperature,
      openedKnowledge,
      notes,
      ...next,
    } as SaveState;
    saveState(state);
    setHasSave(true);
  }

  function finishCase(result: {
    tempDelta: number;
    csatDelta: number;
    ahtDelta: number;
    complianceDelta: number;
    fcr: boolean;
    escalated: boolean;
    reason?: string;
  }) {
    if (!currentClientId) return;
    const newKpi: Kpi = {
      csatSum: kpi.csatSum + Math.max(1, 3 + result.csatDelta),
      csatCount: kpi.csatCount + 1,
      ahtSum: kpi.ahtSum + Math.max(0.8, 1.8 + result.ahtDelta),
      ahtCount: kpi.ahtCount + 1,
      fcrResolved: kpi.fcrResolved + (result.fcr ? 1 : 0),
      fcrTotal: kpi.fcrTotal + 1,
      compliance: Math.max(0, Math.min(100, kpi.compliance + result.complianceDelta)),
    };
    const newTemp = {
      ...temperature,
      [currentClientId]: Math.max(0, Math.min(100, temperature[currentClientId] + result.tempDelta)),
    };
    setTemperature(newTemp);
    setKpi(newKpi);
    const newDone = { ...casesDone, [currentClientId]: result.escalated ? "escalated" : "done" };
    setCasesDone(newDone);
    const newNotes = [...notes];
    if (result.reason) newNotes.push(`${cases[currentClientId].name}: ${result.reason}`);
    setNotes(newNotes);
    const nextIdx = caseIndex + 1;
    setCaseIndex(nextIdx);
    persist({
      kpi: newKpi,
      temperature: newTemp,
      cases: newDone,
      notes: newNotes,
      caseIndex: nextIdx,
    });
    if (nextIdx >= queueOrder.length) {
      setTimeout(() => setPhase("debrief"), 600);
    }
  }

  function openKnowledge(id: string) {
    const next = openedKnowledge.includes(id)
      ? openedKnowledge.filter((i) => i !== id)
      : [...openedKnowledge, id];
    setOpenedKnowledge(next);
    persist({ openedKnowledge: next });
  }

  if (phase === "title") {
    return <TitleScreen hasSave={hasSave} onStart={startNew} onContinue={continueSave} />;
  }
  if (phase === "briefing") {
    return <BriefingScreen nickname={nickname} difficulty={difficulty} onStart={() => setPhase("desk")} />;
  }
  if (phase === "desk") {
    if (!currentCase) {
      return (
        <DebriefScreen
          nickname={nickname}
          difficulty={difficulty}
          kpi={kpi}
          casesDone={casesDone}
          notes={notes}
          onRestart={() => setPhase("title")}
        />
      );
    }
    return (
      <DeskScreen
        nickname={nickname}
        difficulty={difficulty}
        diffCfg={diffCfg}
        caseItem={currentCase}
        queueOrder={queueOrder}
        caseIndex={caseIndex}
        temperature={temperature[currentClientId] ?? currentCase.startTemp}
        kpi={kpi}
        openedKnowledge={openedKnowledge}
        onOpenKnowledge={openKnowledge}
        onFinish={finishCase}
      />
    );
  }
  return (
    <DebriefScreen
      nickname={nickname}
      difficulty={difficulty}
      kpi={kpi}
      casesDone={casesDone}
      notes={notes}
      onRestart={() => {
        localStorage.removeItem("smena_save_v1");
        setHasSave(false);
        setPhase("title");
      }}
    />
  );
}

export default App;