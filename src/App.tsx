import { useEffect, useMemo, useState } from "react";
import { TitleScreen } from "./screens/TitleScreen";
import { BriefingScreen } from "./screens/BriefingScreen";
import { DeskScreen } from "./screens/DeskScreen";
import { DebriefScreen } from "./screens/DebriefScreen";
import { FeedbackScreen } from "./screens/FeedbackScreen";
import { caseOrder, caseOrderByDifficulty, cases } from "./data/cases";
import { difficultyConfig } from "./data/difficulty";
import { ClientId, Difficulty, Kpi, SaveState } from "./types";
import { DialogueNode } from "./types";
import { clearSave, loadSave, saveState } from "./utils/save";

type Phase = "title" | "briefing" | "desk" | "feedback" | "debrief";

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
    c8: "pending",
  });
  const [temperature, setTemperature] = useState<Record<ClientId, number>>({
    c1: 45,
    c2: 20,
    c3: 55,
    c4: 35,
    c5: 50,
    c6: 70,
    c7: 10,
    c8: 62,
  });
  const [openedKnowledge, setOpenedKnowledge] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [stress, setStress] = useState(18);
  const [reputation, setReputation] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [chatHistories, setChatHistories] = useState<Partial<Record<ClientId, DialogueNode[]>>>({});
  const [caseStartedAt, setCaseStartedAt] = useState<Partial<Record<ClientId, number>>>({});
  const [hasSave, setHasSave] = useState(false);
  const [feedback, setFeedback] = useState<{ clientName: string; temperature: number; csatDelta: number; escalated: boolean; reason?: string } | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (s) setHasSave(true);
  }, []);

  const currentClientId = queueOrder[caseIndex];
  const currentCase = currentClientId ? cases[currentClientId] : null;
  const diffCfg = useMemo(() => difficultyConfig[difficulty], [difficulty]);

  function startNew(nick: string, diff: Difficulty) {
    const q = [...caseOrderByDifficulty[diff]];
    const cfg = difficultyConfig[diff];
    const initialNickname = nick.trim() || "Стажёр";
    const initialTemperature = {
      c1: 45 + cfg.tempStartDelta,
      c2: 20 + cfg.tempStartDelta,
      c3: 55 + cfg.tempStartDelta,
      c4: 35 + cfg.tempStartDelta,
      c5: 50 + cfg.tempStartDelta,
      c6: 70 + cfg.tempStartDelta,
      c7: 10 + cfg.tempStartDelta,
      c8: 62 + cfg.tempStartDelta,
    };
    const initialCases = {
      c1: "pending" as const,
      c2: "pending" as const,
      c3: "pending" as const,
      c4: "pending" as const,
      c5: "pending" as const,
      c6: "pending" as const,
      c7: "pending" as const,
      c8: "pending" as const,
    };
    const initialKpi = emptyKpi();

    clearSave();

    setNickname(initialNickname);
    setDifficulty(diff);
    setQueueOrder(q);
    setCaseIndex(0);
    setKpi(initialKpi);
    setCasesDone(initialCases);
    setTemperature(initialTemperature);
    setOpenedKnowledge([]);
    setNotes([]);
    setStress(18);
    setReputation(0);
    setAchievements([]);
    setChatHistories({});
    setCaseStartedAt({});
    saveState({
      version: 1,
      nickname: initialNickname,
      difficulty: diff,
      caseIndex: 0,
      queueOrder: q,
      kpi: initialKpi,
      cases: initialCases,
      temperature: initialTemperature,
      openedKnowledge: [],
      notes: [],
      stress: 18,
      reputation: 0,
      achievements: [],
      chatHistories: {},
      caseStartedAt: {},
    });
    setHasSave(true);
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
    setCasesDone(s.cases);
    setTemperature(s.temperature);
    setOpenedKnowledge(s.openedKnowledge);
    setNotes(s.notes);
    setStress(s.stress ?? 18);
    setReputation(s.reputation ?? 0);
    setAchievements(s.achievements ?? []);
    setChatHistories(s.chatHistories ?? {});
    const loadedStartedAt = { ...(s.caseStartedAt ?? {}) };
    const loadedClientId = s.queueOrder[s.caseIndex];
    if (loadedClientId && !loadedStartedAt[loadedClientId]) loadedStartedAt[loadedClientId] = Date.now();
    setCaseStartedAt(loadedStartedAt);
    saveState({ ...s, caseStartedAt: loadedStartedAt });
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
      stress,
      reputation,
      achievements,
      chatHistories,
      caseStartedAt,
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
    stressDelta?: number;
    reputationDelta?: number;
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
    const newStress = Math.max(0, Math.min(100, stress + (result.stressDelta ?? (result.escalated ? 3 : -1))));
    const newReputation = Math.max(-100, Math.min(100, reputation + (result.reputationDelta ?? (result.escalated ? 1 : 2))));
    const newAchievements = [...achievements];
    if (result.complianceDelta >= 10 && !newAchievements.includes("fraud-sensor")) newAchievements.push("fraud-sensor");
    if (newKpi.compliance === 100 && !newAchievements.includes("safe-shift")) newAchievements.push("safe-shift");
    if (result.escalated && result.reputationDelta && result.reputationDelta > 0 && !newAchievements.includes("clean-escalation")) newAchievements.push("clean-escalation");
    setStress(newStress);
    setReputation(newReputation);
    setAchievements(newAchievements);
    const nextIdx = queueOrder.findIndex((id, index) => index > caseIndex && newDone[id] === "pending");
    const wrappedNextIdx = nextIdx >= 0 ? nextIdx : queueOrder.findIndex((id) => newDone[id] === "pending");
    const savedCaseIndex = wrappedNextIdx >= 0 ? wrappedNextIdx : queueOrder.length;
    setCaseIndex(savedCaseIndex);
    persist({
      kpi: newKpi,
      temperature: newTemp,
      cases: newDone,
      notes: newNotes,
      caseIndex: savedCaseIndex,
      stress: newStress,
      reputation: newReputation,
      achievements: newAchievements,
    });
    if (savedCaseIndex >= queueOrder.length) {
      setFeedback({ clientName: cases[currentClientId].name, temperature: newTemp[currentClientId], csatDelta: result.csatDelta, escalated: result.escalated, reason: result.reason });
      setPhase("feedback");
    } else {
      setFeedback({ clientName: cases[currentClientId].name, temperature: newTemp[currentClientId], csatDelta: result.csatDelta, escalated: result.escalated, reason: result.reason });
      setPhase("feedback");
    }
  }

  function openKnowledge(id: string) {
    // Toggle: если уже открыта — убираем, иначе добавляем
    const next = openedKnowledge.includes(id)
      ? openedKnowledge.filter((i) => i !== id)
      : [...openedKnowledge, id];
    setOpenedKnowledge(next);
    persist({ openedKnowledge: next });
  }

  function updateChatHistory(clientId: ClientId, history: DialogueNode[]) {
    const next = { ...chatHistories, [clientId]: history };
    setChatHistories(next);
    persist({ chatHistories: next });
  }

  function openChat(index: number) {
    const id = queueOrder[index];
    if (!id || casesDone[id] === "done" || casesDone[id] === "escalated") return;
    setCaseIndex(index);
    if (!caseStartedAt[id]) {
      const next = { ...caseStartedAt, [id]: Date.now() };
      setCaseStartedAt(next);
      persist({ caseIndex: index, caseStartedAt: next });
    } else {
      persist({ caseIndex: index });
    }
    setPhase("desk");
  }

  if (phase === "title") {
    return <TitleScreen hasSave={hasSave} onStart={startNew} onContinue={continueSave} />;
  }
  if (phase === "briefing") {
    return <BriefingScreen nickname={nickname} difficulty={difficulty} onStart={() => openChat(caseIndex)} />;
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
          stress={stress}
          reputation={reputation}
          achievements={achievements}
          caseTotal={queueOrder.length}
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
        startedAt={currentClientId ? caseStartedAt[currentClientId] : undefined}
        stress={stress}
        kpi={kpi}
        openedKnowledge={openedKnowledge}
        onOpenKnowledge={openKnowledge}
        casesDone={casesDone}
        onSelectClient={openChat}
        notes={notes}
        chatHistory={chatHistories[currentClientId] ?? []}
        onChatHistoryChange={updateChatHistory}
        onFinish={finishCase}
      />
    );
  }
  if (phase === "feedback" && feedback) {
    return (
      <FeedbackScreen
        {...feedback}
        onContinue={(note) => {
          const nextNotes = [...notes, `${feedback.clientName}: ${note}`];
          setNotes(nextNotes);
          persist({ notes: nextNotes });
          setPhase(caseIndex >= queueOrder.length ? "debrief" : "desk");
        }}
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
      stress={stress}
      reputation={reputation}
      achievements={achievements}
      caseTotal={queueOrder.length}
      onRestart={() => {
        localStorage.removeItem("smena_save_v1");
        setHasSave(false);
        setPhase("title");
      }}
    />
  );
}

export default App;
