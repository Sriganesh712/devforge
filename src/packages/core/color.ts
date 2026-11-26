export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  gray: '#808080',
  grey: '#808080',
  orange: '#ffa500',
  yellow: '#ffff00',
  purple: '#800080',
  pink: '#ffc0cb',
  teal: '#008080',
  navy: '#000080',
  transparent: '#00000000',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hueToRgb(p: number, q: number, t: number): number {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number, a = 1): RGBA {
  const hue = ((h % 360) + 360) % 360 / 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return { r: value, g: value, b: value, a: clamp(a, 0, 1) };
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
    a: clamp(a, 0, 1),
  };
}

export function rgbToHsl({ r, g, b, a }: RGBA): { h: number; s: number; l: number; a: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness, a };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: hue * 60, s: saturation, l: lightness, a };
}

export function parseColor(input: string): RGBA | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  if (NAMED[value]) value = NAMED[value];
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (!/^[0-9a-f]+$/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const [main, alphaText] = rgb[1].split('/');
    const parts = main.includes(',') ? main.split(',').map((part) => part.trim()) : main.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const channel = (part: string) =>
      part.endsWith('%') ? Math.round((parseFloat(part) / 100) * 255) : parseFloat(part);
    const r = channel(parts[0]);
    const g = channel(parts[1]);
    const b = channel(parts[2]);
    if ([r, g, b].some((entry) => !Number.isFinite(entry))) return null;
    let alpha = 1;
    const alphaPart = alphaText ?? (parts[3] ?? '');
    if (alphaPart) {
      alpha = alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
    }
    return {
      r: Math.round(clamp(r, 0, 255)),
      g: Math.round(clamp(g, 0, 255)),
      b: Math.round(clamp(b, 0, 255)),
      a: clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1),
    };
  }
  const hsl = /^hsla?\(([^)]+)\)$/.exec(value);
  if (hsl) {
    const [main, alphaText] = hsl[1].split('/');
    const parts = main.includes(',') ? main.split(',').map((part) => part.trim()) : main.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if (![h, s, l].every(Number.isFinite)) return null;
    const alphaPart = alphaText ?? (parts[3] ?? '');
    const alpha = alphaPart ? (alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart)) : 1;
    return hslToRgb(h, s, l, Number.isFinite(alpha) ? alpha : 1);
  }
  return null;
}

function channelHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

export function toHex(color: RGBA): string {
  const base = `#${channelHex(color.r)}${channelHex(color.g)}${channelHex(color.b)}`;
  return color.a < 1 ? `${base}${channelHex(color.a * 255)}` : base;
}

export function toRgbString(color: RGBA): string {
  return color.a < 1
    ? `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`
    : `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function toHslString(color: RGBA): string {
  const { h, s, l, a } = rgbToHsl(color);
  const hue = Math.round(h);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);
  return a < 1
    ? `hsla(${hue}, ${saturation}%, ${lightness}%, ${Number(a.toFixed(3))})`
    : `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: RGBA): number {
  return 0.2126 * linearChannel(color.r) + 0.7152 * linearChannel(color.g) + 0.0722 * linearChannel(color.b);
}

function compositeOverWhite(color: RGBA): RGBA {
  if (color.a >= 1) return color;
  return {
    r: Math.round(color.r * color.a + 255 * (1 - color.a)),
    g: Math.round(color.g * color.a + 255 * (1 - color.a)),
    b: Math.round(color.b * color.a + 255 * (1 - color.a)),
    a: 1,
  };
}

export function contrastRatio(foreground: RGBA, background: RGBA): number {
  const light = relativeLuminance(compositeOverWhite(foreground));
  const dark = relativeLuminance(compositeOverWhite(background));
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

export interface ContrastResult {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

export function contrastResult(foreground: RGBA, background: RGBA): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}
