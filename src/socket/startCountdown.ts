import { Socket } from 'socket.io';
import { io } from '../..';
import { finishGame } from './finishGame';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

const INITIAL_SECONDS_TO_START = 15;

export const startCountdown = (
  gameId: string,
  activeGames: Map<any, any>,
) => {
  let seconds = INITIAL_SECONDS_TO_START;

  const interval = setInterval(() => {
    const game = activeGames.get(gameId);

    if (!game) {
      clearInterval(interval);
      return;
    }

    if (seconds <= 0) {
      finishGame(gameId, 'no-first-move', 'did not make the first move');
      clearInterval(interval);
    } else {
      seconds = seconds - 1;
      io.to(gameId).emit('update-countdown', seconds);
    }
  }, 1000);

};
