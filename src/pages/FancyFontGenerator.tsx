import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Type, RotateCcw, Sparkles, Wand2, Search } from 'lucide-react';

const charMap = (text: string, map: Record<string, string>) => {
  return text.split('').map(char => map[char] || char).join('');
};

const unicodeMap = (text: string, startUpper: number, startLower: number, startDigit?: number) => {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(startUpper + (code - 65));
    }
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(startLower + (code - 97));
    }
    if (startDigit !== undefined && code >= 48 && code <= 57) {
      return String.fromCodePoint(startDigit + (code - 48));
    }
    return char;
  }).join('');
};

const FONT_STYLES = [
  { name: 'Serif Bold', transform: (t: string) => unicodeMap(t, 0x1D400, 0x1D41A, 0x1D7CE) },
  { name: 'Serif Italic', transform: (t: string) => unicodeMap(t, 0x1D434, 0x1D44E) },
  { name: 'Serif Bold Italic', transform: (t: string) => unicodeMap(t, 0x1D468, 0x1D482) },
  { name: 'Sans Bold', transform: (t: string) => unicodeMap(t, 0x1D5D4, 0x1D5EE, 0x1D7EC) },
  { name: 'Sans Italic', transform: (t: string) => unicodeMap(t, 0x1D608, 0x1D622) },
  { name: 'Sans Bold Italic', transform: (t: string) => unicodeMap(t, 0x1D63C, 0x1D656) },
  { name: 'Script', transform: (t: string) => unicodeMap(t, 0x1D49C, 0x1D4B6) },
  { name: 'Bold Script', transform: (t: string) => unicodeMap(t, 0x1D4D0, 0x1D4EA) },
  { name: 'Fraktur', transform: (t: string) => unicodeMap(t, 0x1D504, 0x1D51E) },
  { name: 'Bold Fraktur', transform: (t: string) => unicodeMap(t, 0x1D56C, 0x1D586) },
  { name: 'Double Struck', transform: (t: string) => unicodeMap(t, 0x1D538, 0x1D552, 0x1D7D8) },
  { name: 'Monospace', transform: (t: string) => unicodeMap(t, 0x1D670, 0x1D68A, 0x1D7F6) },
  { 
    name: 'Circled', 
    transform: (t: string) => {
      const upper = 0x24B6;
      const lower = 0x24D0;
      const digit = 0x2460;
      return t.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(upper + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCodePoint(lower + (code - 97));
        if (code >= 49 && code <= 57) return String.fromCodePoint(digit + (code - 49));
        if (code === 48) return '⓪';
        return char;
      }).join('');
    }
  },
  { 
    name: 'Squared', 
    transform: (t: string) => {
      const upper = 0x1F130;
      return t.split('').map(char => {
        const code = char.toUpperCase().charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(upper + (code - 65));
        return char;
      }).join('');
    }
  },
  { 
    name: 'Negative Squared', 
    transform: (t: string) => {
      const upper = 0x1F170;
      return t.split('').map(char => {
        const code = char.toUpperCase().charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(upper + (code - 65));
        return char;
      }).join('');
    }
  },
  { 
    name: 'Small Caps', 
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Upside Down',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
        A: '∀', B: 'ᗺ', C: 'Ɔ', D: 'ᗡ', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ', K: '⋊', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ', S: 'S', T: '⊥', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
        '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
        '.': '˙', ',': "'", "'": ',', '"': '„', '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋', '_': '‾'
      };
      return t.split('').reverse().map(char => map[char] || char).join('');
    }
  },
  {
    name: 'Bubble',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ⓐ', b: 'ⓑ', c: 'ⓒ', d: 'ⓓ', e: 'ⓔ', f: 'ⓕ', g: 'ⓖ', h: 'ⓗ', i: 'ⓘ', j: 'ⓙ', k: 'ⓚ', l: 'ⓛ', m: 'ⓜ', n: 'ⓝ', o: 'ⓞ', p: 'ⓟ', q: 'ⓠ', r: 'ⓡ', s: 'ⓢ', t: 'ⓣ', u: 'ⓤ', v: 'ⓥ', w: 'ⓦ', x: 'ⓧ', y: 'ⓨ', z: 'ⓩ',
        A: 'Ⓐ', B: 'Ⓑ', C: 'Ⓒ', D: 'Ⓓ', E: 'Ⓔ', F: 'Ⓕ', G: 'Ⓖ', H: 'Ⓗ', I: 'Ⓘ', J: 'Ⓙ', K: 'Ⓚ', L: 'Ⓛ', M: 'Ⓜ', N: 'Ⓝ', O: 'Ⓞ', P: 'Ⓟ', Q: 'Ⓠ', R: 'Ⓡ', S: 'Ⓢ', T: 'Ⓣ', U: 'Ⓤ', V: 'Ⓥ', W: 'Ⓦ', X: 'Ⓧ', Y: 'Ⓨ', Z: 'Ⓩ',
        '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨'
      };
      return charMap(t, map);
    }
  },
  { name: 'Strikethrough', transform: (t: string) => t.split('').map(c => c + '\u0336').join('') },
  { name: 'Underline', transform: (t: string) => t.split('').map(c => c + '\u0332').join('') },
  { name: 'Double Underline', transform: (t: string) => t.split('').map(c => c + '\u0333').join('') },
  { name: 'Slash', transform: (t: string) => t.split('').map(c => c + '\u0337').join('') },
  { name: 'Sparkle', transform: (t: string) => t.split('').map(c => '✨' + c).join('') + '✨' },
  { name: 'Heart', transform: (t: string) => t.split('').map(c => '♥' + c).join('') + '♥' },
  { name: 'Star', transform: (t: string) => t.split('').map(c => '★' + c).join('') + '★' },
  { name: 'Glitch', transform: (t: string) => t.split('').map(c => c + '\u030D\u030E\u0304\u0305\u033F\u0311\u0306\u0310\u0352\u0357\u0351\u0307\u0308\u030A\u0342\u0343\u0344\u034A\u034B\u034C\u0303\u0331\u0332\u0333\u0339\u033A\u033B\u033C\u0345\u0347\u0348\u0349\u034D\u034E\u0353\u0354\u0355\u0356\u0359\u035A\u0323\u0324\u0325\u0326\u0327\u0328\u032D\u032E\u0332\u0333\u0331\u0339\u033A\u033B\u033C\u0345\u0347\u0348\u0349\u034D\u034E\u0353\u0354\u0355\u0356\u0359\u035A\u0323\u0324\u0325\u0326\u0327\u0328\u032D\u032E'.split('').sort(() => Math.random() - 0.5).slice(0, 5).join('')).join('') },
  { 
    name: 'Vaporwave', 
    transform: (t: string) => {
      return t.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 33 && code <= 126) return String.fromCodePoint(code + 0xFEE0);
        return char;
      }).join('');
    }
  },
  {
    name: 'Cursive',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: '𝓪', b: '𝓫', c: '𝓬', d: '𝓭', e: '𝓮', f: '𝓯', g: '𝓰', h: '𝓱', i: '𝓲', j: '𝓳', k: '𝓴', l: '𝓵', m: '𝓶', n: '𝓷', o: '𝓸', p: '𝓹', q: '𝓺', r: '𝓻', s: '𝓼', t: '𝓽', u: '𝓾', v: '𝓿', w: '𝔀', x: '𝔁', y: '𝔂', z: '𝔃',
        A: '𝓐', B: '𝓑', C: '𝓒', D: '𝓓', E: '𝓔', F: '𝓕', G: '𝓖', H: '𝓗', I: '𝓘', J: '𝓙', K: '𝓚', L: '𝓛', M: '𝓜', N: '𝓝', O: '𝓞', P: '𝓟', Q: '𝓠', R: '𝓡', S: '𝓢', T: '𝓣', U: '𝓤', V: '𝓥', W: '𝓦', X: '𝓧', Y: '𝓨', Z: '𝓩'
      };
      return charMap(t, map);
    }
  },
  {
    name: 'Gothic',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: '𝔞', b: '𝔟', c: '𝔠', d: '𝔡', e: '𝔢', f: '𝔣', g: '𝔤', h: '𝔥', i: '𝔦', j: '𝔧', k: '𝔨', l: '𝔩', m: '𝔪', n: '𝔫', o: '𝔬', p: '𝔭', q: '𝔮', r: '𝔯', s: '𝔰', t: '𝔱', u: '𝔲', v: '𝔳', w: '𝔴', x: '𝔵', y: '𝔶', z: '𝔷',
        A: '𝔄', B: '𝔅', C: 'ℭ', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: 'ℌ', I: 'ℑ', J: '𝔍', K: '𝔎', L: '𝔏', M: '𝔐', N: '𝔑', O: '𝔒', P: '𝔓', Q: '𝔔', R: 'ℜ', S: '𝔖', T: '𝔗', U: '𝔘', V: '𝔙', W: '𝔚', X: '𝔛', Y: '𝔜', Z: 'ℨ'
      };
      return charMap(t, map);
    }
  },
  {
    name: 'Ancient',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'α', b: 'в', c: '¢', d: '∂', e: 'є', f: 'ƒ', g: 'g', h: 'н', i: 'ι', j: 'נ', k: 'к', l: 'ℓ', m: 'м', n: 'η', o: 'σ', p: 'ρ', q: 'q', r: 'я', s: 'ѕ', t: 'т', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'у', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 1',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'α', b: 'в', c: '¢', d: '∂', e: 'є', f: 'ƒ', g: 'g', h: 'н', i: 'ι', j: 'נ', k: 'к', l: 'ℓ', m: 'м', n: 'η', o: 'σ', p: 'ρ', q: 'q', r: 'я', s: 'ѕ', t: 'т', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'у', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 2',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'å', b: 'ß', c: 'ç', d: 'Ð', e: 'ê', f: 'ƒ', g: 'g', h: 'h', i: 'ï', j: 'j', k: 'k', l: 'l', m: 'm', n: 'ñ', o: 'ô', p: 'þ', q: 'q', r: 'r', s: '§', t: '†', u: 'µ', v: 'v', w: 'w', x: 'x', y: 'ÿ', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 3',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ค', b: '๒', c: 'ς', d: '๔', e: 'є', f: 'Ŧ', g: 'g', h: 'ђ', i: 'เ', j: 'ן', k: 'к', l: 'l', m: '๓', n: 'ภ', o: '๏', p: 'ק', q: 'ợ', r: 'г', s: 'ร', t: 't', u: 'ย', v: 'ש', w: 'ฬ', x: 'ץ', y: 'ץ', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 4',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ﾑ', b: '乃', c: 'c', d: 'd', e: '乇', f: 'ｷ', g: 'g', h: 'ん', i: 'ﾉ', j: 'ﾌ', k: 'ズ', l: 'ﾚ', m: 'ʍ', n: '刀', o: 'o', p: 'ｱ', q: 'q', r: '尺', s: '丂', t: 'ｲ', u: 'u', v: 'v', w: 'w', x: 'x', y: 'ﾘ', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 5',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'λ', b: 'β', c: 'ς', d: 'δ', e: 'ε', f: 'φ', g: 'γ', h: 'η', i: 'ι', j: 'յ', k: 'κ', l: 'ℓ', m: 'μ', n: 'ν', o: 'σ', p: 'π', q: 'φ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'ν', w: 'ω', x: 'ξ', y: 'ψ', z: 'ζ'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 6',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ค', b: '๒', c: 'ς', d: '๔', e: 'є', f: 'Ŧ', g: 'g', h: 'ђ', i: 'เ', j: 'ן', k: 'к', l: 'l', m: '๓', n: 'ภ', o: '๏', p: 'ק', q: 'ợ', r: 'г', s: 'ร', t: 't', u: 'ย', v: 'ש', w: 'ฬ', x: 'ץ', y: 'ץ', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 7',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'α', b: 'в', c: '¢', d: '∂', e: 'є', f: 'ƒ', g: 'g', h: 'н', i: 'ι', j: 'נ', k: 'к', l: 'ℓ', m: 'м', n: 'η', o: 'σ', p: 'ρ', q: 'q', r: 'я', s: 'ѕ', t: 'т', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'у', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 8',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: '卂', b: '乃', c: '匚', d: 'ᗪ', e: '乇', f: '千', g: 'Ꮆ', h: '卄', i: '丨', j: 'ﾌ', k: 'Ҝ', l: 'ㄥ', m: '爪', n: '几', o: 'ㄖ', p: '卩', q: 'ҩ', r: '尺', s: '丂', t: 'ㄒ', u: 'ㄩ', v: 'ᐯ', w: '山', x: '乂', y: 'ㄚ', z: '乙'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 9',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'ﾑ', b: '乃', c: 'c', d: 'd', e: '乇', f: 'ｷ', g: 'g', h: 'ん', i: 'ﾉ', j: 'ﾌ', k: 'ズ', l: 'ﾚ', m: 'ʍ', n: '刀', o: 'o', p: 'ｱ', q: 'q', r: '尺', s: '丂', t: 'ｲ', u: 'u', v: 'v', w: 'w', x: 'x', y: 'ﾘ', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  {
    name: 'Fancy 10',
    transform: (t: string) => {
      const map: Record<string, string> = {
        a: 'α', b: 'в', c: 'c', d: 'd', e: 'є', f: 'f', g: 'g', h: 'h', i: 'í', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'σ', p: 'p', q: 'q', r: 'r', s: 'ѕ', t: 't', u: 'u', v: 'v', w: 'w', x: 'x', y: 'y', z: 'z'
      };
      return charMap(t.toLowerCase(), map);
    }
  },
  { name: 'Wide', transform: (t: string) => t.split('').join('  ') },
  { name: 'Dotty', transform: (t: string) => t.split('').join('.') },
  { name: 'Arrow', transform: (t: string) => t.split('').map(c => '➵' + c).join('') + '➵' },
  { name: 'Diamond', transform: (t: string) => t.split('').map(c => '◇' + c).join('') + '◇' },
  { name: 'Flower', transform: (t: string) => t.split('').map(c => '✿' + c).join('') + '✿' },
  { name: 'Music', transform: (t: string) => t.split('').map(c => '♪' + c).join('') + '♪' },
  { name: 'Cross', transform: (t: string) => t.split('').map(c => '†' + c).join('') + '†' },
  { name: 'Skull', transform: (t: string) => t.split('').map(c => '☠' + c).join('') + '☠' },
  { name: 'Ghost', transform: (t: string) => t.split('').map(c => '👻' + c).join('') + '👻' },
  { name: 'Fire', transform: (t: string) => t.split('').map(c => '🔥' + c).join('') + '🔥' },
  { name: 'Cloud', transform: (t: string) => t.split('').map(c => '☁' + c).join('') + '☁' },
  { name: 'Sun', transform: (t: string) => t.split('').map(c => '☀' + c).join('') + '☀' },
  { name: 'Moon', transform: (t: string) => t.split('').map(c => '🌙' + c).join('') + '🌙' },
  { name: 'Lightning', transform: (t: string) => t.split('').map(c => '⚡' + c).join('') + '⚡' },
  { name: 'Snow', transform: (t: string) => t.split('').map(c => '❄' + c).join('') + '❄' },
  { name: 'Leaf', transform: (t: string) => t.split('').map(c => '🍃' + c).join('') + '🍃' },
  { name: 'Coffee', transform: (t: string) => t.split('').map(c => '☕' + c).join('') + '☕' },
  { name: 'Pizza', transform: (t: string) => t.split('').map(c => '🍕' + c).join('') + '🍕' },
  { name: 'Rocket', transform: (t: string) => t.split('').map(c => '🚀' + c).join('') + '🚀' },
  { name: 'Alien', transform: (t: string) => t.split('').map(c => '👽' + c).join('') + '👽' },
  { name: 'Robot', transform: (t: string) => t.split('').map(c => '🤖' + c).join('') + '🤖' },
  { name: 'Crown', transform: (t: string) => t.split('').map(c => '👑' + c).join('') + '👑' },
  { name: 'Gem', transform: (t: string) => t.split('').map(c => '💎' + c).join('') + '💎' },
  { name: 'Gift', transform: (t: string) => t.split('').map(c => '🎁' + c).join('') + '🎁' },
  { name: 'Balloon', transform: (t: string) => t.split('').map(c => '🎈' + c).join('') + '🎈' },
  { name: 'Party', transform: (t: string) => t.split('').map(c => '🎉' + c).join('') + '🎉' },
  { name: 'Confetti', transform: (t: string) => t.split('').map(c => '🎊' + c).join('') + '🎊' },
  { name: 'Trophy', transform: (t: string) => t.split('').map(c => '🏆' + c).join('') + '🏆' },
  { name: 'Medal', transform: (t: string) => t.split('').map(c => '🏅' + c).join('') + '🏅' },
  { name: 'Checkered', transform: (t: string) => t.split('').map(c => '🏁' + c).join('') + '🏁' },
  { name: 'Rainbow', transform: (t: string) => t.split('').map(c => '🌈' + c).join('') + '🌈' },
  { name: 'Ocean', transform: (t: string) => t.split('').map(c => '🌊' + c).join('') + '🌊' },
  { name: 'Mountain', transform: (t: string) => t.split('').map(c => '🏔' + c).join('') + '🏔' },
  { name: 'Desert', transform: (t: string) => t.split('').map(c => '🌵' + c).join('') + '🌵' },
  { name: 'Forest', transform: (t: string) => t.split('').map(c => '🌲' + c).join('') + '🌲' },
  { name: 'City', transform: (t: string) => t.split('').map(c => '🏙' + c).join('') + '🏙' },
  { name: 'House', transform: (t: string) => t.split('').map(c => '🏠' + c).join('') + '🏠' },
  { name: 'Car', transform: (t: string) => t.split('').map(c => '🚗' + c).join('') + '🚗' },
  { name: 'Plane', transform: (t: string) => t.split('').map(c => '✈' + c).join('') + '✈' },
  { name: 'Ship', transform: (t: string) => t.split('').map(c => '🚢' + c).join('') + '🚢' },
  { name: 'Train', transform: (t: string) => t.split('').map(c => '🚆' + c).join('') + '🚆' },
  { name: 'Bicycle', transform: (t: string) => t.split('').map(c => '🚲' + c).join('') + '🚲' },
  { name: 'Camera', transform: (t: string) => t.split('').map(c => '📷' + c).join('') + '📷' },
  { name: 'Phone', transform: (t: string) => t.split('').map(c => '📱' + c).join('') + '📱' },
  { name: 'Laptop', transform: (t: string) => t.split('').map(c => '💻' + c).join('') + '💻' },
  { name: 'Watch', transform: (t: string) => t.split('').map(c => '⌚' + c).join('') + '⌚' },
  { name: 'Book', transform: (t: string) => t.split('').map(c => '📖' + c).join('') + '📖' },
  { name: 'Pen', transform: (t: string) => t.split('').map(c => '🖋' + c).join('') + '🖋' },
  { name: 'Pencil', transform: (t: string) => t.split('').map(c => '✏' + c).join('') + '✏' },
  { name: 'Brush', transform: (t: string) => t.split('').map(c => '🖌' + c).join('') + '🖌' },
  { name: 'Palette', transform: (t: string) => t.split('').map(c => '🎨' + c).join('') + '🎨' },
  { name: 'Music Note', transform: (t: string) => t.split('').map(c => '🎵' + c).join('') + '🎵' },
  { name: 'Speaker', transform: (t: string) => t.split('').map(c => '🔊' + c).join('') + '🔊' },
  { name: 'Microphone', transform: (t: string) => t.split('').map(c => '🎤' + c).join('') + '🎤' },
  { name: 'Headphones', transform: (t: string) => t.split('').map(c => '🎧' + c).join('') + '🎧' },
  { name: 'Guitar', transform: (t: string) => t.split('').map(c => '🎸' + c).join('') + '🎸' },
  { name: 'Piano', transform: (t: string) => t.split('').map(c => '🎹' + c).join('') + '🎹' },
  { name: 'Trumpet', transform: (t: string) => t.split('').map(c => '🎺' + c).join('') + '🎺' },
  { name: 'Violin', transform: (t: string) => t.split('').map(c => '🎻' + c).join('') + '🎻' },
  { name: 'Drum', transform: (t: string) => t.split('').map(c => '🥁' + c).join('') + '🥁' },
  { name: 'Bell', transform: (t: string) => t.split('').map(c => '🔔' + c).join('') + '🔔' },
  { name: 'Hammer', transform: (t: string) => t.split('').map(c => '🔨' + c).join('') + '🔨' },
  { name: 'Wrench', transform: (t: string) => t.split('').map(c => '🔧' + c).join('') + '🔧' },
  { name: 'Gear', transform: (t: string) => t.split('').map(c => '⚙' + c).join('') + '⚙' },
  { name: 'Key', transform: (t: string) => t.split('').map(c => '🔑' + c).join('') + '🔑' },
  { name: 'Lock', transform: (t: string) => t.split('').map(c => '🔒' + c).join('') + '🔒' },
  { name: 'Shield', transform: (t: string) => t.split('').map(c => '🛡' + c).join('') + '🛡' },
  { name: 'Sword', transform: (t: string) => t.split('').map(c => '⚔' + c).join('') + '⚔' },
  { name: 'Bow', transform: (t: string) => t.split('').map(c => '🏹' + c).join('') + '🏹' },
  { name: 'Bomb', transform: (t: string) => t.split('').map(c => '💣' + c).join('') + '💣' },
  { name: 'Crystal Ball', transform: (t: string) => t.split('').map(c => '🔮' + c).join('') + '🔮' },
  { name: 'Magic Wand', transform: (t: string) => t.split('').map(c => '🪄' + c).join('') + '🪄' },
  { name: 'Microscope', transform: (t: string) => t.split('').map(c => '🔬' + c).join('') + '🔬' },
  { name: 'Telescope', transform: (t: string) => t.split('').map(c => '🔭' + c).join('') + '🔭' },
  { name: 'DNA', transform: (t: string) => t.split('').map(c => '🧬' + c).join('') + '🧬' },
  { name: 'Brain', transform: (t: string) => t.split('').map(c => '🧠' + c).join('') + '🧠' },
  { name: 'Anatomy', transform: (t: string) => t.split('').map(c => '🦴' + c).join('') + '🦴' },
  { name: 'Tooth', transform: (t: string) => t.split('').map(c => '🦷' + c).join('') + '🦷' },
  { name: 'Eye', transform: (t: string) => t.split('').map(c => '👁' + c).join('') + '👁' },
  { name: 'Ear', transform: (t: string) => t.split('').map(c => '👂' + c).join('') + '👂' },
  { name: 'Nose', transform: (t: string) => t.split('').map(c => '👃' + c).join('') + '👃' },
  { name: 'Mouth', transform: (t: string) => t.split('').map(c => '👄' + c).join('') + '👄' },
  { name: 'Tongue', transform: (t: string) => t.split('').map(c => '👅' + c).join('') + '👅' },
  { name: 'Hand', transform: (t: string) => t.split('').map(c => '✋' + c).join('') + '✋' },
  { name: 'Foot', transform: (t: string) => t.split('').map(c => '👣' + c).join('') + '👣' },
  { name: 'Heartbeat', transform: (t: string) => t.split('').map(c => '💓' + c).join('') + '💓' },
  { name: 'Broken Heart', transform: (t: string) => t.split('').map(c => '💔' + c).join('') + '💔' },
  { name: 'Love Letter', transform: (t: string) => t.split('').map(c => '💌' + c).join('') + '💌' },
  { name: 'Kiss', transform: (t: string) => t.split('').map(c => '💋' + c).join('') + '💋' },
  { name: 'Ring', transform: (t: string) => t.split('').map(c => '💍' + c).join('') + '💍' },
  { name: 'Money Bag', transform: (t: string) => t.split('').map(c => '💰' + c).join('') + '💰' },
  { name: 'Credit Card', transform: (t: string) => t.split('').map(c => '💳' + c).join('') + '💳' },
  { name: 'Chart', transform: (t: string) => t.split('').map(c => '📈' + c).join('') + '📈' },
  { name: 'Briefcase', transform: (t: string) => t.split('').map(c => '💼' + c).join('') + '💼' },
  { name: 'Folder', transform: (t: string) => t.split('').map(c => '📁' + c).join('') + '📁' },
  { name: 'Calendar', transform: (t: string) => t.split('').map(c => '📅' + c).join('') + '📅' },
  { name: 'Clock', transform: (t: string) => t.split('').map(c => '🕒' + c).join('') + '🕒' },
  { name: 'Hourglass', transform: (t: string) => t.split('').map(c => '⏳' + c).join('') + '⏳' },
  { name: 'Anchor', transform: (t: string) => t.split('').map(c => '⚓' + c).join('') + '⚓' },
  { name: 'Compass', transform: (t: string) => t.split('').map(c => '🧭' + c).join('') + '🧭' },
  { name: 'Map', transform: (t: string) => t.split('').map(c => '🗺' + c).join('') + '🗺' },
  { name: 'Globe', transform: (t: string) => t.split('').map(c => '🌐' + c).join('') + '🌐' },
  { name: 'Satellite', transform: (t: string) => t.split('').map(c => '🛰' + c).join('') + '🛰' },
  { name: 'Test Tube', transform: (t: string) => t.split('').map(c => '🧪' + c).join('') + '🧪' },
  { name: 'Petri Dish', transform: (t: string) => t.split('').map(c => '🧫' + c).join('') + '🧫' },
  { name: 'Syringe', transform: (t: string) => t.split('').map(c => '💉' + c).join('') + '💉' },
  { name: 'Pill', transform: (t: string) => t.split('').map(c => '💊' + c).join('') + '💊' },
  { name: 'Stethoscope', transform: (t: string) => t.split('').map(c => '🩺' + c).join('') + '🩺' },
  { name: 'Adhesive Bandage', transform: (t: string) => t.split('').map(c => '🩹' + c).join('') + '🩹' },
  { name: 'Crutch', transform: (t: string) => t.split('').map(c => '🩼' + c).join('') + '🩼' },
  { name: 'Wheelchair', transform: (t: string) => t.split('').map(c => '♿' + c).join('') + '♿' },
  { name: 'Safe Bold', transform: (t: string) => t.toUpperCase() },
  { name: 'Safe Spaced', transform: (t: string) => t.split('').join(' ') },
  { name: 'Safe Bracket', transform: (t: string) => `[ ${t} ]` },
  { name: 'Safe Curly', transform: (t: string) => `{ ${t} }` },
  { name: 'Safe Angle', transform: (t: string) => `< ${t} >` },
  { name: 'Safe Hash', transform: (t: string) => `#${t}#` },
  { name: 'Safe Star', transform: (t: string) => `*${t}*` },
  { name: 'Safe Underscore', transform: (t: string) => `_${t}_` },
  { name: 'Safe Plus', transform: (t: string) => `+${t}+` },
  { name: 'Safe Equal', transform: (t: string) => `=${t}=` },
  { name: 'Safe Tilde', transform: (t: string) => `~${t}~` },
  { name: 'Safe Pipe', transform: (t: string) => `|${t}|` },
  { name: 'Safe Slash', transform: (t: string) => `/${t}/` },
  { name: 'Safe Backslash', transform: (t: string) => `\\${t}\\` },
  { name: 'Safe Colon', transform: (t: string) => `:${t}:` },
  { name: 'Safe Semicolon', transform: (t: string) => `;${t};` },
  { name: 'Safe At', transform: (t: string) => `@${t}@` },
  { name: 'Safe Percent', transform: (t: string) => `%${t}%` },
  { name: 'Safe Dollar', transform: (t: string) => `$${t}$` },
  { name: 'Safe Euro', transform: (t: string) => `€${t}€` },
  { name: 'Safe Pound', transform: (t: string) => `£${t}£` },
  { name: 'Safe Yen', transform: (t: string) => `¥${t}¥` },
  { name: 'Safe Cent', transform: (t: string) => `¢${t}¢` },
  { name: 'Safe Bullet', transform: (t: string) => `•${t}•` },
  { name: 'Safe Arrow Right', transform: (t: string) => `${t} →` },
  { name: 'Safe Arrow Left', transform: (t: string) => `← ${t}` },
  { name: 'Safe Double Arrow', transform: (t: string) => `« ${t} »` },
  { name: 'Safe Single Arrow', transform: (t: string) => `‹ ${t} ›` },
  { name: 'Safe Check', transform: (t: string) => `✓ ${t}` },
  { name: 'Safe Cross', transform: (t: string) => `✗ ${t}` },
  { name: 'Safe Copyright', transform: (t: string) => `© ${t}` },
  { name: 'Safe Registered', transform: (t: string) => `® ${t}` },
  { name: 'Safe Trademark', transform: (t: string) => `${t} ™` },
  { name: 'Safe Degree', transform: (t: string) => `${t} °` },
  { name: 'Safe Plus Minus', transform: (t: string) => `± ${t}` },
  { name: 'Safe Infinity', transform: (t: string) => `∞ ${t}` },
  { name: 'Safe Paragraph', transform: (t: string) => `§ ${t}` },
  { name: 'Safe Section', transform: (t: string) => `¶ ${t}` },
  { name: 'Safe Micro', transform: (t: string) => `µ ${t}` },
  { name: 'Safe Delta', transform: (t: string) => `∆ ${t}` },
  { name: 'Safe Sigma', transform: (t: string) => `∑ ${t}` },
  { name: 'Safe Pi', transform: (t: string) => `π ${t}` },
  { name: 'Safe Root', transform: (t: string) => `√ ${t}` },
  { name: 'Safe Approx', transform: (t: string) => `≈ ${t}` },
  { name: 'Safe Not Equal', transform: (t: string) => `≠ ${t}` },
  { name: 'Safe Less Equal', transform: (t: string) => `≤ ${t}` },
  { name: 'Safe Greater Equal', transform: (t: string) => `≥ ${t}` },
  { name: 'Aesthetic Spaced', transform: (t: string) => t.split('').join(' ') },
  { name: 'Aesthetic Dotted', transform: (t: string) => t.split('').join('.') },
  { name: 'Aesthetic Dashed', transform: (t: string) => t.split('').join('-') },
  { name: 'Aesthetic Pipe', transform: (t: string) => t.split('').join('|') },
  { name: 'Aesthetic Slash', transform: (t: string) => t.split('').join('/') },
  { name: 'Aesthetic Star', transform: (t: string) => t.split('').join('*') },
  { name: 'Aesthetic Plus', transform: (t: string) => t.split('').join('+') },
  { name: 'Aesthetic Tilde', transform: (t: string) => t.split('').join('~') },
  { name: 'Aesthetic Underscore', transform: (t: string) => t.split('').join('_') },
  { name: 'Bracketed Round', transform: (t: string) => t.split('').map(c => `(${c})`).join('') },
  { name: 'Bracketed Square', transform: (t: string) => t.split('').map(c => `[${c}]`).join('') },
  { name: 'Bracketed Curly', transform: (t: string) => t.split('').map(c => `{${c}}`).join('') },
  { name: 'Bracketed Angle', transform: (t: string) => t.split('').map(c => `<${c}>`).join('') },
  { name: 'Decorated Fancy 1', transform: (t: string) => `꧁ ${t} ꧂` },
  { name: 'Decorated Fancy 2', transform: (t: string) => `╰ ${t} ╯` },
  { name: 'Decorated Fancy 3', transform: (t: string) => `╭ ${t} ╮` },
  { name: 'Decorated Fancy 4', transform: (t: string) => `『 ${t} 』` },
  { name: 'Decorated Fancy 5', transform: (t: string) => `「 ${t} 」` },
  { name: 'Decorated Fancy 6', transform: (t: string) => `【 ${t} 】` },
  { name: 'Decorated Fancy 7', transform: (t: string) => `〔 ${t} 〕` },
  { name: 'Decorated Fancy 8', transform: (t: string) => `〈 ${t} 〉` },
  { name: 'Decorated Fancy 9', transform: (t: string) => `《 ${t} 》` },
  { name: 'Decorated Fancy 10', transform: (t: string) => `〖 ${t} 〗` },
  { name: 'Decorated Fancy 11', transform: (t: string) => `〚 ${t} 〛` },
  { name: 'Decorated Fancy 12', transform: (t: string) => `〝 ${t} 〞` },
  { name: 'Decorated Fancy 13', transform: (t: string) => `⸢ ${t} ⸣` },
  { name: 'Decorated Fancy 14', transform: (t: string) => `⸤ ${t} ⸥` },
  { name: 'Decorated Fancy 15', transform: (t: string) => `⸦ ${t} ⸧` },
  { name: 'Decorated Fancy 16', transform: (t: string) => `⸨ ${t} ⸩` },
  { name: 'Decorated Fancy 17', transform: (t: string) => `⦗ ${t} ⦘` },
  { name: 'Decorated Fancy 18', transform: (t: string) => `⧼ ${t} ⧽` },
  { name: 'Decorated Fancy 19', transform: (t: string) => `⟪ ${t} ⟫` },
  { name: 'Decorated Fancy 20', transform: (t: string) => `⟦ ${t} ⟧` },
];

export function FancyFontGenerator() {
  const [inputText, setInputText] = useState('Type something here...');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredStyles = useMemo(() => {
    return FONT_STYLES.filter(style => 
      style.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setInputText('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-4"
          >
            <Type className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Fancy <span className="text-indigo-600">Fonts</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Transform your text into stylish unicode fonts for social media, bios, and more.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 max-w-2xl mx-auto text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-left">
              <strong>Note:</strong> Some fonts use special Unicode characters. If you see boxes (☐), it means your device's system font doesn't support those characters. Try the "Safe" styles for maximum compatibility.
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your text here..."
              className="relative w-full min-h-[120px] p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xl sm:text-2xl font-medium text-slate-900 dark:text-white resize-none"
            />
            {inputText && (
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Clear text"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search font styles..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{filteredStyles.length} Styles Available</span>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredStyles.map((style, idx) => {
              const transformed = inputText ? style.transform(inputText) : style.transform('Preview Text');
              const isCopied = copiedId === style.name;

              return (
                <motion.div
                  key={style.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/50 dark:text-indigo-400/50">
                      {style.name}
                    </span>
                    <p className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white break-all">
                      {transformed}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(transformed, style.name)}
                    className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
                      isCopied
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredStyles.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
              <Wand2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No font styles found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try a different search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
