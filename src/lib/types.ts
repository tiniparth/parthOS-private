/* Shared types. Kept separate so brain/ and memory.ts don't import each other
   in a cycle. */

export type Action =
  | { type: "create_task"; title: string; due_date?: string | null; priority?: string | null }
  | { type: "create_note"; content: string; tags?: string[] | null }
  | { type: "remember_fact"; category?: string | null; fact: string };

export interface BrainResult {
  reply: string;
  transcript?: string;
  actions: Action[];
}

export interface BrainInput {
  text?: string;
  audio?: { base64: string; mime: string };
}
