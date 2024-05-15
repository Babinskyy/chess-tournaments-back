import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";
import { userReconnect } from "./userReconnect";
import { v4 } from "uuid";
import { startGame } from "./startGame";
import { addPoints } from "./addPoints";
import { finishGame } from "./finishGame";
import { getUsersArray } from "../utils/getUsersArray";
import { Game, PlayerStatus, Tournament, User } from "../types/types.types";
import { startCountdown } from "./startCountdown";
import { INITIAL_FEN, INITIAL_MINUTES } from "../constansts/constants";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findGameBySpectator } from "../utils/findGameBySpectator";
import { getUserBySocket } from "../utils/getUserBySocket";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { SocketEvent } from "../types/types.types";

export const activeTournaments: Set<Tournament> = new Set();
export const activeUsers: Set<User> = new Set();
export const allUsers: Set<User> = new Set();
export const activeGames: Map<string, Game> = new Map();
export const finishedGames: Map<string, Game> = new Map();

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  socket.emit("user-id", socket.id);
  io.emit("socket-id", socket.id);

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
        };

        activeUsers.add(newUser);
        allUsers.add(newUser);

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
    io.emit("users-list-update", getUsersArray(activeUsers));
  });

  socket.on(SocketEvent.USER_RECONNECT, (username) => {
    userReconnect(username, socket.id, activeGames, socket, io);
    io.emit("users-list-update", getUsersArray(activeUsers));
  });

  socket.on(
    SocketEvent.USER_LOGOUT,
    ({ username, isPlayerWhite, room }): void => {
      const existingUser = Array.from(activeUsers).find(
        (user) => user.username === username
      );

      if (existingUser) {
        activeUsers.delete(existingUser);
        allUsers.delete(existingUser);
        const tournament = findTournamentByUsername(
          existingUser?.username,
          activeTournaments
        );
        if (tournament) {
          tournament.playersUsernames = tournament.playersUsernames.filter(
            (player) => player !== existingUser?.username
          );
        }
      }

      socket.leave(room);
      finishGame(
        room,
        !isPlayerWhite ? "white" : "black",
        "opponent disconnect"
      );

      io.emit("users-list-update", getUsersArray(activeUsers));
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

      const game = findGameBySpectator(existingUser.username, activeGames);

      if (game) {
        if (activeGames.has(game)) {
          const activeGame = activeGames.get(game)!;
          activeGame.spectators = activeGame.spectators.filter(
            (spectator) => spectator !== existingUser.username
          );
          activeUsers.forEach((user) => {
            if (user.username === existingUser.username) {
              user.status = PlayerStatus.NOT_STARTED;
            }
          });
          socket.leave(game);
          io.emit("users-list-update", getUsersArray(activeUsers));
        } else {
          console.error(`Game with ID ${game} not found.`);
        }
      }
      activeUsers.delete(existingUser);
    }

    if (tournament) {
      if (!tournament.playersUsernames) {
        activeTournaments.delete(tournament);
      }
    }

    io.emit("users-list-update", getUsersArray(activeUsers));
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
        socket.emit("set-game", game);
        playersUsernames = gameData.playersUsernames;

        break;
      }
    }

    if (!game) {
      game = v4();
      socket.emit("set-game", game);
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
      io.emit("users-list-update", getUsersArray(activeUsers));
      io.to(game!).emit("player-join", playersUsernames);
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
          socket.emit("set-game", game);
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

      io.emit("users-list-update", getUsersArray(activeUsers));
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
        io.emit("users-list-update", getUsersArray(activeUsers));
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
    io.emit("users-list-update", getUsersArray(activeUsers));
  });
};
