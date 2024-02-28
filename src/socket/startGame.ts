import { getTurnColorFromFEN } from '../utils/getTurnColorFromFEN';

export const startGame = (gameId: string, activeGames: Map<any, any>) => {
  const turn = getTurnColorFromFEN(activeGames.get(gameId).fen);
  const clockIndex = turn === 'w' ? 0 : 1;
  let interval = setInterval(() => {
    const game = activeGames.get(gameId);
    if (game) {
      if (game.clocks[clockIndex] > 0) {
        game.clocks[clockIndex]--;
      } else {
        clearInterval(interval);
      }
    } else {
      clearInterval(interval);
    }
  }, 1000);
};
