import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io } from '../..';
import { userReconnect } from './userReconnect';
import { v4 } from 'uuid';
import { startGame } from './startGame';
import { addPoints } from './addPoints';
import { finishGame } from './finishGame';
import { getUsersArray } from '../utils/getUsersArray';
import { PlayerStatus, Tournament, User } from '../types/types.types';
import { startCountdown } from './startCountdown';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const INITIAL_MINUTES = 3;

export const activeTournaments: Set<Tournament> = new Set();
export const activeUsers: Set<User> = new Set();
export const allUsers: Set<User> = new Set();
export const activeGames = new Map();
export const finishedGames = new Map();

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  socket.emit('user-id', socket.id);
  io.emit('socket-id', socket.id);

  socket.on(
    'user-login',
    (
      {
        username,
        id: newPlayerId,
        tournamentId,
      }: { username: string; id: string; tournamentId: string },
      callback: Function
    ) => {
      const isUsernameTaken = Array.from(allUsers).some(
        (existingUser) =>
          existingUser.username.toLowerCase() === username.toLowerCase()
      );

      if (isUsernameTaken) {
        callback({ success: false, message: 'Username taken' });
      } else {
        const newUser = {
          id: newPlayerId,
          username: username,
          points: 0,
          status: PlayerStatus.NOT_STARTED,
          isAdmin: activeUsers.size === 0,
        };

        activeUsers.add(newUser);
        allUsers.add(newUser);

        const tournament = Array.from(activeTournaments).find(
          (tournament) => tournament.id === tournamentId
        );

        if (tournament) {
          tournament.playersUsernames = [...tournament?.playersUsernames, username];
        }

        callback({
          success: true,
          message: `User added successfully`,
          user: newUser,
        });
      }
    }
  );

  socket.on('user-entered-lobby', () => {
    io.emit('users-list-update', getUsersArray(activeUsers));
  });

  socket.on('user-reconnect', (username) => {
    userReconnect(username, socket.id, activeGames, socket, io);
    io.emit('users-list-update', getUsersArray(activeUsers));
  });

  socket.on('user-logout', ({ username, isPlayerWhite, room }): void => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.username === username
    );

    if (existingUser) {
      activeUsers.delete(existingUser);
      allUsers.delete(existingUser);
    }

    finishGame(room, !isPlayerWhite ? 'white' : 'black', 'opponent disconnect');

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
        fen: INITIAL_FEN,
        players: players,
        clocks: [INITIAL_MINUTES * 60, INITIAL_MINUTES * 60],
      });
      activeUsers.forEach((user) => {
        if (user.username === player) {
          user.status = PlayerStatus.WAITING;
        }
      });
    }

    if (players) {
      players.push(player);
      socket.join(game!);
      if (players.length === 2) {
        activeUsers.forEach((user) => {
          if (user.username === players![0]) {
            user.status = PlayerStatus.IN_GAME;
          }
          if (user.username === players![1]) {
            user.status = PlayerStatus.IN_GAME;
          }
        });
        startCountdown(game, activeGames);
      }
      io.emit('users-list-update', getUsersArray(activeUsers));
      io.to(game!).emit('player-join', players);
    }
  });

  socket.on(
    'update-game',
    ({ room, currentPosition }: { room: string; currentPosition: string }) => {
      if (activeGames.has(room)) {
        const activeGame = activeGames.get(room);
        activeGame.fen = currentPosition;
      } else {
        console.error(`Game with ID ${room} not found.`);
      }
    }
  );

  socket.on('game-started', (gameId) => {
    startGame(gameId, activeGames);
  });

  socket.on('game-end', ({ result, reason, room }) => {
    const finishedGame = activeGames.get(room);

    if (finishedGame) {
      const winner =
        result === 'white'
          ? finishedGame.players[0]
          : result === 'black'
          ? finishedGame.players[1]
          : result === ''
          ? ''
          : 'draw';

      activeUsers.forEach((user) => {
        if (
          user.username === finishedGame.players[0] ||
          user.username === finishedGame.players[1]
        ) {
          user.status = PlayerStatus.NOT_STARTED;
        }
      });

      addPoints(activeUsers, winner, room, activeGames);
      finishGame(room, result, reason);
      activeGames.delete(room);
    }
  });

  socket.on('create-tournament', (tournament: Tournament) => {
    activeTournaments.add({
      id: tournament.id,
      name: tournament.name,
      playersUsernames: [],
    });
  });

  socket.on('enter-tournament', (tournamentId: string, callback: Function) => {
    const tournamentName = Array.from(activeTournaments).find(
      (t) => t.id === tournamentId
    )?.name;

    if (tournamentName) {
      callback({ tournamentName: tournamentName, isTournamentActive: true });
    } else {
      callback({
        tournamentName: '',
        isTournamentActive: false,
      });
    }
  });

  socket.on('start-tournament', (tournamentId: string) => {
    io.emit('tournament-started', tournamentId);
  });
};
