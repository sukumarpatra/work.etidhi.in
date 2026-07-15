export const STATUSES = [
  { value: "Not Started", color: "#797e93" },
  { value: "Working on it", color: "#fdab3d" },
  { value: "Stuck", color: "#df2f4a" },
  { value: "In Review", color: "#a25ddc" },
  { value: "Done", color: "#00c875" },
] as const;

export const PRIORITIES = [
  { value: "Critical", color: "#333333" },
  { value: "High", color: "#401694" },
  { value: "Medium", color: "#5559df" },
  { value: "Low", color: "#579bfc" },
  { value: "None", color: "#c4c4c4" },
] as const;

export const GROUP_COLORS = [
  "#579bfc",
  "#00c875",
  "#a25ddc",
  "#fdab3d",
  "#df2f4a",
  "#66ccff",
  "#ff642e",
  "#00d2d2",
];

export const BOARD_COLORS = [
  "#6161ff",
  "#00c875",
  "#fdab3d",
  "#df2f4a",
  "#a25ddc",
  "#00d2d2",
  "#ff642e",
  "#579bfc",
];

export const AVATAR_COLORS = [
  "#ff642e",
  "#00c875",
  "#a25ddc",
  "#579bfc",
  "#fdab3d",
  "#df2f4a",
  "#00d2d2",
  "#6161ff",
];

export function statusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color ?? "#797e93";
}

export function priorityColor(priority: string) {
  return PRIORITIES.find((p) => p.value === priority)?.color ?? "#c4c4c4";
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
