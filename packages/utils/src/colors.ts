export const colors = [
  "#FF6900", // Orange
  "#FCB900", // Yellow
  "#00D084", // Emerald
  "#8ED1FC", // Sky Blue
  "#0693E3", // Blue
  "#ABB8C3", // Gray
  "#EB144C", // Red
  "#F78DA7", // Pink
  "#9900EF", // Purple
  "#0079BF", // Dark Blue
  "#B6BBBF", // Light Gray
  "#FF5A5F", // Coral
  "#F7C59F", // Peach
  "#8492A6", // Slate
  "#4D5055", // Charcoal
  "#AF5A50", // Terracotta
  "#F9D6E7", // Pale Pink
  "#B5EAEA", // Pale Cyan
  "#B388EB", // Lavender
  "#B04632", // Rust
  "#FF78CB", // Pink
  "#4E5A65", // Gray
  "#01FF70", // Lime
  "#85144b", // Pink
  "#F012BE", // Purple
  "#7FDBFF", // Sky Blue
  "#3D9970", // Olive
  "#AAAAAA", // Silver
  "#111111", // Black
  "#0074D9", // Blue
  "#39CCCC", // Teal
  "#001f3f", // Navy
  "#FF9F1C", // Orange
  "#5E6A71", // Ash
  "#75D701", // Neon Green
  "#B6C8A9", // Lichen
  "#00A9FE", // Electric Blue
  "#EAE8E1", // Bone
  "#CD346C", // Raspberry
  "#FF6FA4", // Pink Sherbet
  "#D667FB", // Purple Mountain Majesty
  "#0080FF", // Azure
  "#656D78", // Dim Gray
  "#F8842C", // Tangerine
  "#FF8CFF", // Carnation Pink
  "#647F6A", // Feldgrau
  "#5E574E", // Field Drab
  "#EF5466", // KU Crimson
  "#B0E0E6", // Powder Blue
  "#EB5E7C", // Rose Pink
  "#8A2BE2", // Blue Violet
  "#6B7C85", // Slate Gray
  "#8C92AC", // Lavender Blue
  "#6C587A", // Eminence
  "#52A1FF", // Azureish White
  "#32CD32", // Lime Green
  "#E04F9F", // Orchid Pink
  "#915C83", // Lilac Bush
  "#4C6B88", // Air Force Blue
  "#587376", // Cadet Blue
  "#C46210", // Buff
  "#65B0D0", // Columbia Blue
  "#2F4F4F", // Dark Slate Gray
  "#528B8B", // Dark Cyan
  "#8B4513", // Saddle Brown
  "#4682B4", // Steel Blue
  "#CD853F", // Peru
  "#FFA07A", // Light Salmon
  "#CD5C5C", // Indian Red
  "#483D8B", // Dark Slate Blue
  "#696969", // Dim Gray
];
export const colorsObject = {
  orange: "#FF6900",
  yellow: "#FCB900",
  emerald: "#00D084",
  sky: "#8ED1FC",
  blue: "#0693E3",
  gray: "#ABB8C3",
  red: "#EB144C",
  pink: "#F78DA7",
  purple: "#9900EF",
  darkBlue: "#0079BF",
  lightGray: "#B6BBBF",
  coral: "#FF5A5F",
  peach: "#F7C59F",
  slate: "#8492A6",
  charcoal: "#4D5055",
  terracotta: "#AF5A50",
  palePink: "#F9D6E7",
  paleCyan: "#B5EAEA",
  lavender: "#B388EB",
  rust: "#B04632",
  hotPink: "#FF78CB",
  ashGray: "#4E5A65",
  lime: "#01FF70",
  maroon: "#85144b",
  magenta: "#F012BE",
  skyBlue: "#7FDBFF",
  olive: "#3D9970",
  silver: "#AAAAAA",
  black: "#111111",
  altBlue: "#0074D9",
  teal: "#39CCCC",
  navy: "#001f3f",
  orangeAlt: "#FF9F1C",
  ash: "#5E6A71",
  neonGreen: "#75D701",
  lichen: "#B6C8A9",
  electricBlue: "#00A9FE",
  bone: "#EAE8E1",
  raspberry: "#CD346C",
  pinkSherbet: "#FF6FA4",
  purpleMajesty: "#D667FB",
  azure: "#0080FF",
  dimGray: "#656D78",
  tangerine: "#F8842C",
  carnationPink: "#FF8CFF",
  feldgrau: "#647F6A",
  fieldDrab: "#5E574E",
  kuCrimson: "#EF5466",
  powderBlue: "#B0E0E6",
  rosePink: "#EB5E7C",
  blueViolet: "#8A2BE2",
  slateGray: "#6B7C85",
  lavenderBlue: "#8C92AC",
  eminence: "#6C587A",
  azureishWhite: "#52A1FF",
  limeGreen: "#32CD32",
  orchidPink: "#E04F9F",
  lilacBush: "#915C83",
  airForceBlue: "#4C6B88",
  cadetBlue: "#587376",
  buff: "#C46210",
  columbiaBlue: "#65B0D0",
  darkSlateGray: "#2F4F4F",
  darkCyan: "#528B8B",
  saddleBrown: "#8B4513",
  steelBlue: "#4682B4",
  peru: "#CD853F",
  lightSalmon: "#FFA07A",
  indianRed: "#CD5C5C",
  darkSlateBlue: "#483D8B",
  darkGray: "#696969",
  default: null,
} as const;
export type Colors = keyof typeof colorsObject;
export function customHash(value: string) {
  let hash = 0;

  for (let i = 0; i < value?.length; i++) {
    hash = (hash << 5) + value?.charCodeAt(i);
    hash = hash & hash;
  }

  return Math.abs(hash);
}

export function getColor(value: string, arrayLength: number) {
  const hashValue = customHash(value);
  const index = hashValue % arrayLength;
  return index;
}

export function getColorFromName(value: string) {
  const index = getColor(value, colors.length);

  return colors[index];
}

export function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}
export function hexToRgba(hex: string, opacity: number): string {
  if (!hex) return "";
  const parsed = hex?.replace("#", "");
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
