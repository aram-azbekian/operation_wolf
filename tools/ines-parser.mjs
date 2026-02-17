export const parseINes = (rom) => {
  if (rom.length < 16) {
    throw new Error("ROM too small");
  }

  if (rom[0] !== 0x4e || rom[1] !== 0x45 || rom[2] !== 0x53 || rom[3] !== 0x1a) {
    throw new Error("Invalid iNES header");
  }

  const prgBanks = rom[4];
  const chrBanks = rom[5];
  const flags6 = rom[6];
  const flags7 = rom[7];

  const hasTrainer = (flags6 & 0x04) !== 0;
  const mapper = (flags7 & 0xf0) | (flags6 >> 4);
  const mirroring = (flags6 & 0x01) === 1 ? "vertical" : "horizontal";

  const prgOffset = 16 + (hasTrainer ? 512 : 0);
  const chrOffset = prgOffset + prgBanks * 16384;
  const chrSize = chrBanks * 8192;

  if (rom.length < chrOffset + chrSize) {
    throw new Error("ROM does not contain complete PRG/CHR data");
  }

  return {
    prgBanks,
    chrBanks,
    mapper,
    mirroring,
    hasTrainer,
    prgOffset,
    chrOffset,
    chrSize
  };
};

export const decodeChrToRgba = (chr, columns = 16) => {
  const tileCount = Math.floor(chr.length / 16);
  const rows = Math.ceil(tileCount / columns);
  const width = columns * 8;
  const height = rows * 8;
  const rgba = new Uint8Array(width * height * 4);

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    const tileX = (tileIndex % columns) * 8;
    const tileY = Math.floor(tileIndex / columns) * 8;
    const tileOffset = tileIndex * 16;

    for (let y = 0; y < 8; y += 1) {
      const plane0 = chr[tileOffset + y];
      const plane1 = chr[tileOffset + y + 8];

      for (let x = 0; x < 8; x += 1) {
        const bit = 7 - x;
        const p0 = (plane0 >> bit) & 1;
        const p1 = (plane1 >> bit) & 1;
        const value = (p1 << 1) | p0;
        const shade = value === 0 ? 0x00 : value === 1 ? 0x66 : value === 2 ? 0xbb : 0xff;

        const px = tileX + x;
        const py = tileY + y;
        const idx = (py * width + px) * 4;

        rgba[idx] = shade;
        rgba[idx + 1] = shade;
        rgba[idx + 2] = shade;
        rgba[idx + 3] = 0xff;
      }
    }
  }

  return { width, height, rgba };
};
