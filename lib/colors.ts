export interface TopicColor {
  hue: number;
  bg: string;
  border: string;
  text: string;
  dot: string;
  gradient: string;
}

function hslColor(
  hue: number,
  saturation: number,
  lightness: number,
  alpha = 1
): string {
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function buildColor(hue: number): TopicColor {
  return {
    hue,
    bg: hslColor(hue, 70, 50, 0.18),
    border: hslColor(hue, 70, 55, 0.55),
    text: hslColor(hue, 85, 78, 1),
    dot: hslColor(hue, 75, 60, 1),
    gradient: `linear-gradient(135deg, ${hslColor(
      hue,
      70,
      55,
      0.4
    )}, ${hslColor(hue, 70, 55, 0.1)})`,
  };
}

export function assignTopicColors(
  topicNames: string[]
): Map<string, TopicColor> {
  const sorted = [...new Set(topicNames)].sort();
  const n = Math.max(sorted.length, 1);
  const map = new Map<string, TopicColor>();
  sorted.forEach((name, i) => {
    const hue = Math.round((360 / n) * i);
    map.set(name, buildColor(hue));
  });
  return map;
}

export const FALLBACK_COLOR: TopicColor = buildColor(210);
