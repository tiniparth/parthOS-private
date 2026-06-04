/* Shared types. Kept separate so brain/ and memory.ts don't import each other
   in a cycle. */

export type Action =
  | { type: "create_task"; title: string; due_date?: string | null; priority?: string | null }
  | { type: "journal"; content: string; mood?: string | null }
  | { type: "remember_fact"; category?: string | null; fact: string }
  | { type: "log_expense"; amount: number; item?: string | null; category?: string | null; spent_on?: string | null }
  | { type: "log_habit"; habit: string; done_on?: string | null }
  | { type: "create_event"; summary: string; when: string; duration_min?: number | null; attendees?: string[] | null }
  | { type: "log_milestone"; kind?: string | null; area?: string | null; title: string; detail?: string | null; impact?: string | null; happened_on?: string | null };

export interface BrainResult {
  reply: string;
  transcript?: string;
  actions: Action[];
}

export interface BrainInput {
  text?: string;
  audio?: { base64: string; mime: string };
}
