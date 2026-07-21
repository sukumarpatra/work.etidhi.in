export const STATUSES = [
  { value: "Not Started", color: "#787774" },
  { value: "Working on it", color: "#d9730d" },
  { value: "Stuck", color: "#e03e3e" },
  { value: "In Review", color: "#9065b0" },
  { value: "Done", color: "#4dab9a" },
] as const;

export const PRIORITIES = [
  { value: "Critical", color: "#e03e3e" },
  { value: "High", color: "#d9730d" },
  { value: "Medium", color: "#cb912f" },
  { value: "Low", color: "#2383e2" },
  { value: "None", color: "#9b9a97" },
] as const;

export const GROUP_COLORS = [
  "#2383e2",
  "#4dab9a",
  "#9065b0",
  "#d9730d",
  "#e03e3e",
  "#6940a5",
  "#ad5700",
  "#0f7b6c",
];

export const BOARD_COLORS = [
  "#2383e2",
  "#4dab9a",
  "#d9730d",
  "#e03e3e",
  "#9065b0",
  "#0f7b6c",
  "#ad5700",
  "#6940a5",
];

export const AVATAR_COLORS = [
  "#d9730d",
  "#4dab9a",
  "#9065b0",
  "#2383e2",
  "#cb912f",
  "#e03e3e",
  "#0f7b6c",
  "#6940a5",
];

export function statusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color ?? "#787774";
}

export function priorityColor(priority: string) {
  return PRIORITIES.find((p) => p.value === priority)?.color ?? "#9b9a97";
}

export function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const ETIDHI_DOMAIN = "@etidhi.in";
