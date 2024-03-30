import { getUsersArray } from '../utils/getUsersArray';
import { io } from '../..';
import { activeUsers } from './onConnection';

export const finishGame = (
  game: string,
  result: string,
  reason: string,
) => {
  io.to(game).emit('finish-game', { result, reason });
  io.emit('users-list-update', getUsersArray(activeUsers));
};
