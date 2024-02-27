import { Server } from 'socket.io';
import { getUsersArray } from '../utils/getUsersArray';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { User } from './onConnection';

export const finishGame = (
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  game: string,
  result: string,
  reason: string,
  activeUsers: Set<User>
) => {
  io.to(game!).emit('finish-game', { result, reason });
  io.emit('users-list-update', getUsersArray(activeUsers));
};
