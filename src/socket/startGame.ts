import { io } from '../..';
import { getTurnColorFromFEN } from '../utils/getTurnColorFromFEN';
import { finishGame } from './finishGame';

export const startGame = (gameId: string, activeGames: Map<any, any>) => {
  const interval = setInterval(() => {
    const game = activeGames.get(gameId);

    if (!game) {
      clearInterval(interval);
      return;
    }

    const { fen, clocks } = game;
    const turn = getTurnColorFromFEN(fen);
    const isPlayerWhite = turn === 'w';
    const clockIndex = isPlayerWhite ? 0 : 1;

    if (clocks.some((clock: number) => clock <= 0)) {
      clearInterval(interval);
    } else {
      clocks[clockIndex]--;
      io.to(gameId).emit('update-clock', clocks);
    }
  }, 1000);
};
