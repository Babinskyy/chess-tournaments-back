import { Server, Socket } from 'socket.io';
import { activeUsers, allUsers } from './onConnection';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

export const userReconnect = (
  username: string,
  socketid: string,
  activeGames: Map<any, any>,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const existingUser = Array.from(allUsers).find(
    (user) => user.username === username
  );

  if (existingUser) {
    const updatedUsers = new Set(
      Array.from(activeUsers).map((user) =>
        user.username === username ? existingUser : user
      )
    );
    updatedUsers.delete(existingUser);
    updatedUsers.add({ id: socketid, username: username });

    activeUsers.clear();
    updatedUsers.forEach((user) => activeUsers.add(user));
  }

  const findGameByUsername = (username: string): string | undefined => {
    for (const [game, gameData] of activeGames) {
      if (gameData?.players && gameData.players.includes(username)) {
        return game;
      }
    }

    return undefined;
  };

  const activeGameId = findGameByUsername(username);
  if (activeGameId) {
    socket.join(activeGameId);
    io.to(activeGameId).emit(
      'player-join',
      activeGames.get(activeGameId).players
    );
    const fen = activeGames.get(activeGameId).fen;
    const clocks = activeGames.get(activeGameId).clocks;
    io.to(activeGameId).emit('recover-game', {fen, activeGameId, clocks});
  }
};
