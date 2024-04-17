import { Server, Socket } from 'socket.io';
import { activeUsers, allUsers } from './onConnection';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { findGameByUsername } from '../utils/findGameByUsername';
import { findPlayerByUsername } from '../utils/findPlayerByUsername';

export const userReconnect = (
  username: string,
  socketid: string,
  activeGames: Map<any, any>,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const existingUser = findPlayerByUsername(username, allUsers)

  if (existingUser) {
    const updatedUsers = new Set(
      Array.from(activeUsers).map((user) =>
        user.username === username ? existingUser : user
      )
    );
    updatedUsers.delete(existingUser);
    updatedUsers.add({
      id: socketid,
      username: username,
      points: existingUser.points,
      status: existingUser.status,
      isAdmin: existingUser.isAdmin,
    });

    activeUsers.clear();
    allUsers.clear();
    updatedUsers.forEach((user) => activeUsers.add(user));
    updatedUsers.forEach((user) => allUsers.add(user));
  }

  const activeGameId = findGameByUsername(username, activeGames);
  const playerInfo = findPlayerByUsername(username, allUsers)

  if (activeGameId) {
    socket.join(activeGameId);
    io.to(activeGameId).emit(
      'player-join',
      activeGames.get(activeGameId).players
    );
    const fen = activeGames.get(activeGameId).fen;
    const clocks = activeGames.get(activeGameId).clocks;
    io.to(activeGameId).emit('recover-game', { fen, activeGameId, clocks });
  } else {
    socket.emit('recover-player', playerInfo)
  }
};
