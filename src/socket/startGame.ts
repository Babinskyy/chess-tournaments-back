import { io } from '../..';
import { SocketEvent } from '../types/types';
import { getTurnColorFromFEN } from '../utils/getTurnColorFromFEN';

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
      io.to(gameId).emit(SocketEvent.UPDATE_CLOCK, clocks);
    }
  }, 1000);
};
