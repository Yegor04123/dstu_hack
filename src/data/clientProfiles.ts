import { ClientId } from "../types";

export type ClientProfile = {
  patience: number;
  urgency: number;
  anxiety: number;
  trust: number;
  traits: string[];
  contradiction?: string;
};

export const clientProfiles: Record<ClientId, ClientProfile> = {
  c1: { patience: 42, urgency: 55, anxiety: 35, trust: 48, traits: ["раздражённый", "помнит прошлые обращения"], contradiction: "Говорит, что комиссию не объясняли, но в заметках есть консультация по тарифу." },
  c2: { patience: 28, urgency: 88, anxiety: 30, trust: 55, traits: ["торопится", "молодой клиент"], contradiction: "Клиент говорит о сбое, CRM показывает превышение лимита." },
  c3: { patience: 60, urgency: 70, anxiety: 92, trust: 22, traits: ["тревожный", "нуждается в простых объяснениях"], contradiction: "Звонок был не из банка, хотя собеседник называл детали операции." },
  c4: { patience: 45, urgency: 62, anxiety: 40, trust: 38, traits: ["настойчивая", "не любит удержание"], contradiction: "Хочет закрыть карту, но активных спорных операций нет." },
  c5: { patience: 35, urgency: 96, anxiety: 55, trust: 44, traits: ["юрлицо", "давление сроками"], contradiction: "Контрагент не получил платёж, но статус в CRM — «в обработке»." },
  c6: { patience: 18, urgency: 75, anxiety: 72, trust: 12, traits: ["горячий", "жалобщик"], contradiction: "Клиент требует наказать сотрудника, но оператор может только зафиксировать факты." },
  c7: { patience: 65, urgency: 35, anxiety: 20, trust: 60, traits: ["вопрос вне зоны L1", "спокойный"], contradiction: "Продукт не относится к розничной линии." },
  c8: { patience: 30, urgency: 90, anxiety: 68, trust: 40, traits: ["попала в массовый сбой", "сравнивает себя с другими"], contradiction: "Проблема затрагивает многих клиентов — индивидуальный обход не поможет." },
};
