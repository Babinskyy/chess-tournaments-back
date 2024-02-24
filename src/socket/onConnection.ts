import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io } from '../..';
import { userReconnect } from './userReconnect';
import { v4 } from 'uuid';

export type User = {
  id: string;
  username: string;
};

export const activeUsers: Set<User> = new Set();
export const allUsers: Set<User> = new Set();
const activeGames = new Map();
const getUsersArray = () => Array.from(activeUsers);
const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  console.log(`Client is connected with id: ${socket.id}`);

  io.emit('socket-id', socket.id);
  socket.emit('user-id', socket.id);

  socket.on('user-login', (user: User, callback: Function) => {
    const isUsernameTaken = Array.from(allUsers).some(
      (existingUser) => existingUser.username === user.username
    );

    if (isUsernameTaken) {
      callback({ success: false, message: 'Username taken' });
    } else {
      activeUsers.add(user);
      allUsers.add(user);
      callback({ success: true, message: 'User added successfully' });
    }
  });

  socket.on('user-entered-lobby', () => {
    io.emit('users-list-update', getUsersArray());
  });

  socket.on('user-reconnect', (username) => {
    userReconnect(username, socket.id, activeGames, socket, io);
  });
  socket.on('user-logout', (username): void => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.username === username
    );

    if (existingUser) {
      activeUsers.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray());
  });

  socket.on('disconnect', (reason): void => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.id === socket.id
    );

    if (existingUser) {
      activeUsers.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray());
  });

  socket.on('move', (move, game) => {
    if (!game) {
      socket.broadcast.emit('player-move', move);
    } else {
      socket.to(game).emit('player-move', move);
    }
  });

  socket.on('join-game', (player: string) => {
    let game: string | undefined;
    let players: string[] | undefined;

    for (const [gameId, gameData] of activeGames) {
      if (gameData.players.length < 2) {
        game = gameId;
        socket.emit('gameId', game);
        players = gameData.players;
        break;
      }
    }

    if (!game) {
      game = v4();
      socket.emit('gameId', game);
      players = [];
      activeGames.set(game, { fen: initialFen, players: players });
    }

    if (players) {
      players.push(player);
      socket.join(game!);

      io.to(game!).emit('player-join', players);
    }
  });

  socket.on('update-game', ({ game, fen }: any) => {
    if (activeGames.has(game)) {
      const gamesmth = activeGames.get(game);
      gamesmth.fen = fen;
    } else {
      console.error(`Game with ID ${game} not found.`);
    }
  });
};
