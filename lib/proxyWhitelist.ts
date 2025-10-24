// lib/proxyWhitelist.ts
export const ALLOWED_TABLES = {
  projects: ["select", "insert", "update"] as const,
  project_members: ["select", "insert"] as const,
  notes: ["select", "insert", "update"] as const,
  events: ["select", "insert", "update", "delete"] as const,
  event_attendees: ["select", "insert", "delete"] as const,
  files: ["select", "insert"] as const,
  chat_channels: ["select", "insert"] as const,
  chat_messages: ["select", "insert"] as const,
} as const;

export type AllowedTable = keyof typeof ALLOWED_TABLES;
export type AllowedAction = (typeof ALLOWED_TABLES[AllowedTable])[number];
