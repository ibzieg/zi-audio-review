export interface TagColors {
  bg: string;
  border: string;
  text: string;
}

export function tagColor(name: string): TagColors {
  // djb2-style hash → stable hue per tag name
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) & 0xffff;
  }
  const hue = h % 360;
  return {
    bg: `hsl(${hue}, 45%, 16%)`,
    border: `hsl(${hue}, 45%, 28%)`,
    text: `hsl(${hue}, 70%, 68%)`,
  };
}
