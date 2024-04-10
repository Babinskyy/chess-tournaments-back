import { io } from '../..';
import { finishGame } from './finishGame';

const INITIAL_SECONDS_TO_START = 15;

export const startCountdown = (gameId: string, activeGames: Map<any, any>) => {
  let seconds = INITIAL_SECONDS_TO_START;

  const interval = setInterval(() => {
    const game = activeGames.get(gameId);

    if (!game) {
      clearInterval(interval);
      return;
    }

    if (seconds <= 0) {
      clearInterval(interval);
    } else {
      seconds--;
      io.to(gameId).emit('update-countdown', seconds);
    }
  }, 1000);
};
