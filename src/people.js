// Per-person look config. Likeness taken from the real portraits (hair / skin / clothes / gender).
export const BRAND = {
  bg: '#07150F',      // linfan-ent.com / Threads card background (deep green-black)
  gold: '#B9A372',    // brand gold (linfan-ent.com --token b9a377 / #B9A372)
  goldLight: '#D6C18E',
  cream: '#F2EFE6',
  panel: '#13251C',
  mute: '#A7AEA8',
};

export const ORDER = ['scarlett', 'tatum', 'luke', 'jaylen', 'jennifer'];

export const PEOPLE = {
  scarlett: {
    name: 'Scarlett', role: 'A&R', female: true,
    skin: '#b8877f', accent: '#D6C18E',
    top: '#27365e', topStyle: 'blazer', inner: '#f0efe9', pants: '#1f2840', shoe: '#0c0c10',
    hair: { type: 'updo', color: '#14100f' }, smile: 0.6, eyeS: 0.95,
    shoulder: 0.205, torsoW: 0.37, hipW: 0.33,
  },
  tatum: {
    name: 'Tatum', role: 'Marketing', female: false,
    skin: '#c19887', accent: '#6fe3b4',
    top: '#2a3b66', topStyle: 'polo', inner: '#17223d', pants: '#2c3039', shoe: '#e8e6df',
    hair: { type: 'short', color: '#100e0e' }, smile: 0.95,
    shoulder: 0.235, torsoW: 0.42, hipW: 0.34,
  },
  luke: {
    name: 'Luke', role: 'Originals', female: false,
    skin: '#d2b19d', accent: '#e0a15f',
    top: '#1f2d52', topStyle: 'shirt', inner: '#121a33', pants: '#262a33', shoe: '#101012',
    hair: { type: 'messy', color: '#0b0a0c' }, brow: 1.3, smile: 0.6, eyeS: 0.88,
    shoulder: 0.24, torsoW: 0.42, hipW: 0.34,
  },
  jaylen: {
    name: 'Jaylen', role: 'Music Production', female: false,
    skin: '#9a6a4e', accent: '#8fd3ff',
    top: '#202226', topStyle: 'hoodie', inner: '#0b0b0d', pants: '#22252b', shoe: '#0b0b0c',
    hair: { type: 'beanie', color: '#0d0d0f' }, brow: 1.6,
    shoulder: 0.26, torsoW: 0.46, hipW: 0.36,
  },
  jennifer: {
    name: 'Jennifer', role: 'Operations', female: true,
    skin: '#cda594', accent: '#f08a9a',
    top: '#2b3d6e', topStyle: 'sweater', inner: '#18264a', pants: '#2a3350', shoe: '#e8e6df',
    hair: { type: 'wavy', color: '#1a1210' }, smile: 0.9,
    shoulder: 0.2, torsoW: 0.36, hipW: 0.33,
  },
};
