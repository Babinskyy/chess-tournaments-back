import { getTurnColorFromFEN } from './getTurnColorFromFEN';

export const startGame = (gameId: string, activeGames: Map<any, any>) => {
  let interval = setInterval(() => {
    const game = activeGames.get(gameId);
    const turn = getTurnColorFromFEN(activeGames.get(gameId).fen);
    const clockIndex = turn === 'w' ? 0 : 1;

    if (game.clocks[clockIndex] > 0) {
      game.clocks[clockIndex]--;
    } else {
      clearInterval(interval);
      console.log('Game Over');
    }
  }, 1000);
};
