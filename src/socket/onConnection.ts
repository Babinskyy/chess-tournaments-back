import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";
import { userReconnect } from "./userReconnect";
import { v4 } from "uuid";
import { startGame } from "./startGame";
import { addPoints } from "./addPoints";
import { finishGame } from "./finishGame";
import { getUsersArray } from "../utils/getUsersArray";
import {
  Game,
  PlayerStatus,
  TemporaryPlayer,
  Tournament,
  User,
} from "../types/types.types";
import { startCountdown } from "./startCountdown";
import { INITIAL_FEN, INITIAL_MINUTES } from "../constansts/constants";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findGameBySpectator } from "../utils/findGameBySpectator";
import { getUserBySocket } from "../utils/getUserBySocket";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { SocketEvent } from "../types/types.types";
import { startStatusChecking } from "./startStatusChecking";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";

export const activeTournaments: Set<Tournament> = new Set();
export const activeUsers: Set<User> = new Set();
export const allUsers: Set<User> = new Set();
export const activeGames: Map<string, Game> = new Map();
export const finishedGames: Map<string, Game> = new Map();
export const disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  socket.emit(SocketEvent.USER_ID, socket.id);

  socket.on(
    SocketEvent.USER_LOGIN,
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
        callback({ success: false, message: "Username taken" });
      } else {
        const newUser = {
          id: newPlayerId,
          username: username,
          points: 0,
          status: PlayerStatus.NOT_STARTED,
          isAdmin: activeUsers.size === 0,
          isDeleted: false,
        };

        activeUsers.add(newUser);

        const newUserCopy = structuredClone(newUser);
        allUsers.add(newUserCopy);

        const tournament = Array.from(activeTournaments).find(
          (tournament) => tournament.id === tournamentId
        );

        if (tournament) {
          tournament.playersUsernames = [
            ...tournament?.playersUsernames,
            username,
          ];
        }

        callback({
          success: true,
          message: `User added successfully`,
          user: newUser,
        });
      }
    }
  );

  socket.on(SocketEvent.USER_ENTERED_LOBBY, () => {
    io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
  });

  socket.on(SocketEvent.USER_RECONNECT, (username) => {
    userReconnect(username, socket.id, activeGames, socket, io);
    io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
  });

  socket.on(
    SocketEvent.USER_LOGOUT,
    ({ username, isPlayerWhite, room }): void => {
      const existingUser = Array.from(activeUsers).find(
        (user) => user.username === username
      );

      if (existingUser) {
        existingUser.isDeleted = true;
      }

      const finishedGame = activeGames.get(room);

      if (finishedGame) {
        const winner = isPlayerWhite
          ? finishedGame.playersUsernames[1]
          : finishedGame.playersUsernames[0];

        activeUsers.forEach((user) => {
          if (
            user.username === finishedGame.playersUsernames[0] ||
            user.username === finishedGame.playersUsernames[1] ||
            finishedGame.spectators.includes(user.username)
          ) {
            user.status = PlayerStatus.NOT_STARTED;
          }
        });

        addPoints(activeUsers, winner, room, activeGames);
        socket.leave(room);
        finishGame(
          room,
          !isPlayerWhite ? "white" : "black",
          "opponent disconnect"
        );
        activeGames.delete(room);
      }

      io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
    }
  );

  socket.on(SocketEvent.DISCONNECT, (reason): void => {
    const existingUser = Array.from(activeUsers).find(
      (user) => user.id === socket.id
    );

    let tournament = undefined;

    if (existingUser) {
      tournament = findTournamentByUsername(
        existingUser?.username,
        activeTournaments
      );

      const spectatorGame = findGameBySpectator(
        existingUser.username,
        activeGames
      );

      if (spectatorGame) {
        if (activeGames.has(spectatorGame)) {
          const activeGame = activeGames.get(spectatorGame)!;
          activeGame.spectators = activeGame.spectators.filter(
            (spectator) => spectator !== existingUser.username
          );
          activeUsers.forEach((user) => {
            if (user.username === existingUser.username) {
              user.status = PlayerStatus.NOT_STARTED;
            }
          });
          socket.leave(spectatorGame);
          io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
        } else {
          console.error(`Game with ID ${spectatorGame} not found.`);
        }
      }

      allUsers.add({
        id: TemporaryPlayer.ID,
        username: existingUser.username,
        status: existingUser.status,
        points: 0,
        isAdmin: false,
        isDeleted: false,
      });

      activeUsers.forEach((player) => {
        if (player.username === existingUser.username) {
          player.status = PlayerStatus.DISCONNECTED;
        }
      });

      startStatusChecking(existingUser.username);
    }

    if (tournament) {
      if (!tournament.playersUsernames) {
        activeTournaments.delete(tournament);
      }
    }

    io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
  });

  socket.on(SocketEvent.MOVE, (move, game) => {
    if (!game) {
      socket.broadcast.emit("player-move", move);
    } else {
      socket.to(game).emit("player-move", move);
    }
  });

  socket.on(SocketEvent.JOIN_GAME, (player: string) => {
    let game: string | undefined;
    let playersUsernames: string[] | undefined;

    for (const [gameId, gameData] of activeGames) {
      if (gameData.playersUsernames.length < 2) {
        game = gameId;
        socket.emit(SocketEvent.SET_GAME, game);
        playersUsernames = gameData.playersUsernames;

        break;
      }
    }

    if (!game) {
      game = v4();
      socket.emit(SocketEvent.SET_GAME, game);
      playersUsernames = [];
      activeGames.set(game, {
        fen: INITIAL_FEN,
        playersUsernames: playersUsernames,
        clocks: [INITIAL_MINUTES * 60, INITIAL_MINUTES * 60],
        spectators: [],
      });
      activeUsers.forEach((user) => {
        if (user.username === player) {
          user.status = PlayerStatus.WAITING;
        }
      });
    }

    if (playersUsernames) {
      playersUsernames.push(player);
      socket.join(game!);
      if (playersUsernames.length === 2) {
        activeUsers.forEach((user) => {
          if (user.username === playersUsernames![0]) {
            user.status = PlayerStatus.IN_GAME;
          }
          if (user.username === playersUsernames![1]) {
            user.status = PlayerStatus.IN_GAME;
          }
        });
        startCountdown(game, activeGames);
      }
      io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
      io.to(game!).emit(SocketEvent.PLAYER_JOIN, playersUsernames);
    }
  });

  socket.on(
    SocketEvent.UPDATE_GAME,
    ({ room, currentPosition }: { room: string; currentPosition: string }) => {
      if (activeGames.has(room)) {
        const activeGame = activeGames.get(room)!;
        activeGame.fen = currentPosition;
      } else {
        console.error(`Game with ID ${room} not found.`);
      }
    }
  );

  socket.on(SocketEvent.GAME_STARTED, (gameId) => {
    startGame(gameId, activeGames);
  });

  socket.on(SocketEvent.GAME_END, ({ result, reason, room }) => {
    const finishedGame = activeGames.get(room);

    if (finishedGame) {
      const winner =
        result === "white"
          ? finishedGame.playersUsernames[0]
          : result === "black"
          ? finishedGame.playersUsernames[1]
          : result === ""
          ? ""
          : "draw";

      activeUsers.forEach((user) => {
        if (
          user.username === finishedGame.playersUsernames[0] ||
          user.username === finishedGame.playersUsernames[1] ||
          finishedGame.spectators.includes(user.username)
        ) {
          user.status = PlayerStatus.NOT_STARTED;
        }
      });

      addPoints(activeUsers, winner, room, activeGames);
      finishGame(room, result, reason);
      activeGames.delete(room);
    }
  });

  socket.on(SocketEvent.CREATE_TOURNAMENT, (tournament: Tournament) => {
    activeTournaments.add({
      id: tournament.id,
      name: tournament.name,
      playersUsernames: [],
    });
  });

  socket.on(
    SocketEvent.ENTER_TOURNAMENT,
    (tournamentId: string, callback: Function) => {
      const tournamentName = Array.from(activeTournaments).find(
        (t) => t.id === tournamentId
      )?.name;

      if (tournamentName) {
        callback({ tournamentName: tournamentName, isTournamentActive: true });
      } else {
        callback({
          tournamentName: "",
          isTournamentActive: false,
        });
      }
    }
  );

  socket.on(SocketEvent.START_TOURNAMENT, (tournamentId: string) => {
    io.emit("tournament-started", tournamentId);
  });

  socket.on(
    SocketEvent.SPECTATOR_JOIN,
    ({ selectedPlayer, selectingPlayer }, callback: Function) => {
      const game = findGameByUsername(selectedPlayer, activeGames);

      let activeGame;

      if (game) {
        if (activeGames.has(game)) {
          activeGame = activeGames.get(game)!;
          activeGame?.spectators.push(selectingPlayer);
          socket.emit(SocketEvent.SET_GAME, game);
          socket.join(game);
          const { fen, clocks } = activeGame;
          socket.emit("recover-game", { fen, activeGameId: game, clocks });
        } else {
          console.error(`Game with ID ${game} not found.`);
        }
      }

      activeUsers.forEach((user) => {
        if (user.username === selectingPlayer) {
          user.status = PlayerStatus.SPECTATOR;
        }
      });

      io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
      callback(activeGame?.playersUsernames);
    }
  );

  socket.on(SocketEvent.STOP_SPECTATING, (player: string) => {
    const game = findGameBySpectator(player, activeGames);

    let activeGame;

    if (game) {
      if (activeGames.has(game)) {
        activeGame = activeGames.get(game)!;
        activeGame.spectators = activeGame?.spectators.filter(
          (spectator) => spectator !== player
        );
        activeUsers.forEach((user) => {
          if (user.username === player) {
            user.status = PlayerStatus.NOT_STARTED;
          }
        });
        socket.leave(game);
        io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
      } else {
        console.error(`Game with ID ${game} not found.`);
      }
    }
  });

  socket.on(SocketEvent.CANCEL_GAME_SEARCH, (room: string) => {
    activeGames.delete(room);
    const player = getUserBySocket(socket.id, activeUsers);

    if (player) {
      player.status = PlayerStatus.NOT_STARTED;
    }
    io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
  });

  socket.on(
    SocketEvent.CHECK_PLAYER,
    (username: string, callback: Function) => {
      const player = findPlayerByUsername(username, allUsers);

      if (!player?.isDeleted) {
        callback(true);
      } else {
        callback(false);
      }
    }
  );
};
