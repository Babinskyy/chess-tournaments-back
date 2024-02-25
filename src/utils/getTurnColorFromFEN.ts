export const getTurnColorFromFEN = (fen: string) => {
  const parts = fen.split(' ');
  const turnColor = parts[1];
  return turnColor;
};
