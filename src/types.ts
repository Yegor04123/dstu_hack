export type Channel = "call" | "chat";

export type Difficulty = "trainee" | "shift" | "peak";

export type ClientId = "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7" | "c8";

export type CaseStatus = "pending" | "active" | "done" | "escalated";

export type Kpi = {
  csatSum: number;
  csatCount: number;
  ahtSum: number;
  ahtCount: number;
  fcrResolved: number;
  fcrTotal: number;
  compliance: number;
};

export type SaveState = {
  version: number;
  nickname: string;
  difficulty: Difficulty;
  caseIndex: number;
  queueOrder: ClientId[];
  kpi: Kpi;
  cases: Record<ClientId, CaseStatus>;
  temperature: Record<ClientId, number>;
  openedKnowledge: string[];
  notes: string[];
  stress: number;
  reputation: number;
  achievements: string[];
  chatHistories?: Partial<Record<ClientId, DialogueNode[]>>;
};

export type CaseStatuses = Record<ClientId, CaseStatus>;

export type KnowledgeArticle = {
  id: string;
  title: string;
  tags: string[];
  can: string[];
  cannot: string[];
  template: string;
  body: string;
};

export type CrmCard = {
  clientId: ClientId;
  name: string;
  type: "individual" | "business";
  status: string;
  products: string[];
  lastOps: string[];
  flags: string[];
  notes: string[];
};

export type DialogueOption = {
  id: string;
  text: string;
  tone: "empathy" | "fact" | "script" | "push" | "escalate";
  effects: {
    tempDelta: number;
    csatDelta: number;
    ahtDelta: number;
    complianceDelta: number;
    fcr?: boolean;
    escalate?: boolean;
    escalateReason?: string;
    requiresKnowledgeId?: string;
    knowledgeBoost?: number;
  };
  nextNodeId?: string;
  requires?: {
    knowledge?: string[];
  };
};

export type DialogueNode = {
  id: string;
  speaker: "client" | "agent" | "lenna" | "system";
  text: string;
  options?: DialogueOption[];
};

export type Case = {
  id: ClientId;
  name: string;
  channel: Channel;
  intro: string;
  startTemp: number;
  priority: number;
  tags: string[];
  crm: CrmCard;
  nodes: DialogueNode[];
  startNodeId: string;
};
