import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { getTurnColorFromFEN } from './getTurnColorFromFEN';

export const startGame = (
  gameId: string,
  activeGames: Map<any, any>
) => {
  setInterval(() => {
    const game = activeGames.get(gameId);
    const turn = getTurnColorFromFEN(activeGames.get(gameId).fen);
    const clockIndex = turn === 'w' ? 0 : 1;

    if (game.clocks[clockIndex] > 0) {
      game.clocks[clockIndex]--;
    } else {
      clearInterval(game.interval);
      console.log('Game Over');
    }
  }, 1000);
};
