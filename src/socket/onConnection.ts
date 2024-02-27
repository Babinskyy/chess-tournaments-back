import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io } from '../..';
import { userReconnect } from './userReconnect';
import { v4 } from 'uuid';
import { startGame } from './startGame';
import { addPoints } from './addPoints';
import { finishGame } from './finishGame';
import { getUsersArray } from '../utils/getUsersArray';

export type User = {
  id: string;
  username: string;
  points: number;
};

export const activeUsers: Set<User> = new Set();
export const allUsers: Set<User> = new Set();
export const activeGames = new Map();
export const finishedGames = new Map();
const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  io.emit('socket-id', socket.id);
  socket.emit('user-id', socket.id);

  socket.on('user-login', (user: User, callback: Function) => {
    const isUsernameTaken = Array.from(allUsers).some(
      (existingUser) =>
        existingUser.username.toLowerCase() === user.username.toLowerCase()
    );

    if (isUsernameTaken) {
      callback({ success: false, message: 'Username taken' });
    } else {
      activeUsers.add({ id: user.id, username: user.username, points: 0 });
      allUsers.add({ id: user.id, username: user.username, points: 0 });
      callback({ success: true, message: 'User added successfully' });
    }
  });

  socket.on('user-entered-lobby', () => {
    io.emit('users-list-update', getUsersArray(activeUsers));
  });

  socket.on('user-reconnect', (username) => {
    userReconnect(username, socket.id, activeGames, socket, io);
  });

  socket.on('user-logout', (username) => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.username === username
    );

    if (existingUser) {
      activeUsers.delete(existingUser);
      allUsers.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray(activeUsers));
  });

  socket.on('disconnect', (reason): void => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.id === socket.id
    );

    if (existingUser) {
      activeUsers.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray(activeUsers));
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
      activeGames.set(game, {
        fen: initialFen,
        players: players,
        clocks: [3 * 60, 3 * 60],
        isWhiteTurn: true,
      });
    }

    if (players) {
      players.push(player);
      socket.join(game!);
      io.to(game!).emit('player-join', players);
    }
  });

  socket.on('update-game', ({ game, fen }: any) => {
    if (activeGames.has(game)) {
      const activeGame = activeGames.get(game);
      activeGame.fen = fen;
    } else {
      console.error(`Game with ID ${game} not found.`);
    }
  });

  socket.on('game-started', (gameId) => {
    startGame(gameId, activeGames);
  });

  socket.on('game-end', ({ result, reason, game }) => {
    const finishedGame = activeGames.get(game);

    if (finishedGame) {
      const winner =
        result === 'white'
          ? finishedGame.players[0]
          : result === 'black'
          ? finishedGame.players[1]
          : 'draw';
      addPoints(activeUsers, winner, game, activeGames);
      finishGame(io, game, result, reason, activeUsers);
      activeGames.delete(game);
    }
  });
};
