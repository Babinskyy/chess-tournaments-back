import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";
import { userReconnect } from "./userReconnect";
import { v4 } from "uuid";
import { startGame } from "./startGame";
import { addPoints } from "./addPoints";
import { finishGame } from "./finishGame";
import {
  Colors,
  Game,
  PlayerStatus,
  TemporaryPlayer,
  Tournament,
  Player,
  TournamentTypes,
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
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { deletePlayer } from "../utils/deleteUser";

export const activeTournaments: Set<Tournament> = new Set();
export const activePlayers: Set<Player> = new Set();
export const allPlayers: Set<Player> = new Set();
export const userSockets = new Map();
export const activeGames: Map<string, Game> = new Map();
export const finishedGames: Map<string, Game> = new Map();
export const disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
export let adminManager: string = "";

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  socket.emit(SocketEvent.USER_ID, socket.id, (isAdmin: boolean) => {
    if (isAdmin) {
      adminManager = socket.id;
    }
  });

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
      const tournament = findTournamentByTournamentId(tournamentId);

      if (!tournament) {
        callback({
          success: false,
          message: "Tournament does not exist",
          cause: "tournament",
        });
        return;
      }

      if (tournament && tournament.active) {
        callback({
          success: false,
          message: "Tournament already started.",
          cause: "started",
        });
        return;
      }

      const isUsernameTaken = Array.from(allPlayers).some(
        (existingUser) =>
          existingUser.username.toLowerCase() === username.toLowerCase()
      );

      if (isUsernameTaken) {
        callback({
          success: false,
          message: "Username taken",
          cause: "username",
        });
      } else {
        const tournament = findTournamentByTournamentId(tournamentId);
        const isAdmin = !tournament?.players.length;

        const newPlayer = {
          id: newPlayerId,
          username: username,
          points: 0,
          status: PlayerStatus.NOT_STARTED,
          isAdmin: isAdmin,
          isDeleted: false,
        };

        if (tournament) {
          tournament.players = [...tournament?.players, newPlayer];
        }

        activePlayers.add(newPlayer);
        socket.join(tournamentId);
        userSockets.set(newPlayerId, socket);

        const newUserCopy = structuredClone(newPlayer);
        allPlayers.add(newUserCopy);

        callback({
          success: true,
          message: `Player added successfully`,
          user: newPlayer,
        });
      }
      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
    }
  );

  socket.on(
    SocketEvent.USER_ENTERED_LOBBY,
    (tournamentId: string, callback: Function) => {
      const tournament = findTournamentByTournamentId(tournamentId);
      if (tournament) {
        if (tournament.active) {
          callback({
            isActive: true,
            tournamentName: tournament.name,
            tournamentType: tournament.type,
          });
        } else {
          callback({
            isActive: false,
            tournamentName: tournament.name,
            tournamentType: tournament.type,
          });
        }
      }

      io.to(tournamentId).emit(
        SocketEvent.USERS_LIST_UPDATE,
        getPlayersFromTournamentById(tournamentId)
      );
    }
  );

  socket.on(SocketEvent.USER_RECONNECT, (username) => {
    userReconnect(username, socket);
  });

  socket.on(
    SocketEvent.USER_LOGOUT,
    ({
      username,
      playerColor,
      room,
    }: {
      username: string;
      playerColor: Colors;
      room: string;
    }): void => {
      const existingUser = Array.from(activePlayers).find(
        (user) => user.username === username
      );

      if (existingUser) {
        deletePlayer(existingUser);
      }

      if (existingUser?.status !== PlayerStatus.SPECTATOR) {
        const finishedGame = activeGames.get(room);

        if (finishedGame) {
          const winner =
            playerColor === Colors.BLACK
              ? finishedGame.playersUsernames[0]
              : finishedGame.playersUsernames[1];

          const player0 = findPlayerByUsername(
            finishedGame.playersUsernames[0],
            activePlayers
          );
          const player1 = findPlayerByUsername(
            finishedGame.playersUsernames[1],
            activePlayers
          );

          if (player0 && player1) {
            updatePlayerStatus(player0, PlayerStatus.NOT_STARTED);
            updatePlayerStatus(player1, PlayerStatus.NOT_STARTED);
          }

          addPoints(activePlayers, winner, room, activeGames);
          socket.leave(room);

          const result =
            playerColor === Colors.WHITE ? Colors.BLACK : Colors.WHITE;

          finishGame(room, result, "opponent disconnect");
          activeGames.delete(room);
        }
      }

      const tournament = findTournamentByUsername(username);

      if (tournament?.id) {
        const playersInTournament = getPlayersFromTournamentById(
          tournament?.id
        );

        const isAnyPlayerActive = Array.from(playersInTournament).some(
          (player) => player.isDeleted === false
        );

        if (isAnyPlayerActive) {
          io.to(tournament?.id).emit(
            SocketEvent.USERS_LIST_UPDATE,
            playersInTournament
          );
        } else {
          const tournamentPlayersUsernames =
            getUsernamesFromTournament(tournament);

          activePlayers.forEach((player) => {
            if (tournamentPlayersUsernames.includes(player.username)) {
              activePlayers.delete(player);
            }
          });
          allPlayers.forEach((player) => {
            if (tournamentPlayersUsernames.includes(player.username)) {
              allPlayers.delete(player);
            }
          });
          activeTournaments.delete(tournament);
        }
      }
      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
    }
  );

  socket.on(SocketEvent.DISCONNECT, (reason): void => {
    const existingUser = Array.from(activePlayers).find(
      (user) => user.id === socket.id
    );

    let tournament = undefined;

    if (existingUser) {
      tournament = findTournamentByUsername(existingUser?.username);

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

          updatePlayerStatus(existingUser, PlayerStatus.NOT_STARTED);
          socket.leave(spectatorGame);
        } else {
          updatePlayerStatus(existingUser, PlayerStatus.NOT_STARTED);
          console.error(`Game with ID ${spectatorGame} not found.`);
        }
      }

      if (existingUser.status === PlayerStatus.WAITING) {
        const game = findGameByUsername(existingUser.username, activeGames);
        if (game) {
          activeGames.delete(game);
          const player = getUserBySocket(socket.id, activePlayers);

          if (player) {
            updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
          }
        }
      }

      allPlayers.add({
        id: TemporaryPlayer.ID,
        username: existingUser.username,
        status: existingUser.status,
        points: 0,
        isAdmin: false,
        isDeleted: false,
      });

      updatePlayerStatus(existingUser, PlayerStatus.DISCONNECTED);

      startStatusChecking(existingUser.username);
    }

    if (existingUser) {
      const tournamentId = findTournamentByUsername(existingUser.username)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
      }
    }

    io.to(adminManager).emit(
      SocketEvent.UPDATE_TOURNAMENTS,
      Array.from(activeTournaments)
    );
  });

  socket.on(SocketEvent.MOVE, (move, game) => {
    if (!game) {
      socket.broadcast.emit(SocketEvent.PLAYER_MOVE, move);
    } else {
      socket.to(game).emit(SocketEvent.PLAYER_MOVE, move);
    }
  });

  socket.on(SocketEvent.JOIN_GAME, (player: string) => {
    let game: string | undefined;
    let playersUsernames: string[] | undefined;

    const tournament1 = findTournamentByUsername(player);

    for (const [gameId, gameData] of activeGames) {
      if (gameData.playersUsernames.length < 2) {
        const tournament2 = findTournamentByUsername(
          gameData.playersUsernames[0]
        );

        if (tournament1?.id === tournament2?.id) {
          game = gameId;
          socket.emit(SocketEvent.SET_GAME, game);
          playersUsernames = gameData.playersUsernames;

          break;
        }
      }
    }

    if (!game && tournament1) {
      game = v4();
      socket.emit(SocketEvent.SET_GAME, game);
      playersUsernames = [];
      activeGames.set(game, {
        fen: INITIAL_FEN,
        playersUsernames: playersUsernames,
        clocks: [tournament1.time * 60, tournament1.time * 60],
        spectators: [],
      });

      const activePlayer = findPlayerByUsername(player, activePlayers);
      if (activePlayer) {
        updatePlayerStatus(activePlayer, PlayerStatus.WAITING);
      }
    }

    if (playersUsernames) {
      playersUsernames.push(player);
      socket.join(game!);
      if (playersUsernames.length === 2) {
        const player0 = findPlayerByUsername(
          playersUsernames[0],
          activePlayers
        );
        const player1 = findPlayerByUsername(
          playersUsernames[1],
          activePlayers
        );

        if (player0 && player1) {
          updatePlayerStatus(player0, PlayerStatus.IN_GAME);
          updatePlayerStatus(player1, PlayerStatus.IN_GAME);
        }
        if (game) {
          startCountdown(game, activeGames);
        }
      }

      const tournamentId = findTournamentByUsername(player)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
        io.to(game!).emit(SocketEvent.PLAYER_JOIN, playersUsernames);
      }
    }
    io.to(adminManager).emit(
      SocketEvent.UPDATE_TOURNAMENTS,
      Array.from(activeTournaments)
    );
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

      const player0 = findPlayerByUsername(
        finishedGame.playersUsernames[0],
        activePlayers
      );
      const player1 = findPlayerByUsername(
        finishedGame.playersUsernames[1],
        activePlayers
      );

      if (player0 && player1) {
        updatePlayerStatus(player0, PlayerStatus.IN_GAME);
        updatePlayerStatus(player1, PlayerStatus.IN_GAME);
      }

      addPoints(activePlayers, winner, room, activeGames);
      finishGame(room, result, reason);
      activeGames.delete(room);
    }
    io.to(adminManager).emit(
      SocketEvent.UPDATE_TOURNAMENTS,
      Array.from(activeTournaments)
    );
  });

  socket.on(
    SocketEvent.CREATE_TOURNAMENT,
    (
      {
        name,
        id,
        username,
        time,
        type,
        win,
      }: {
        name: string;
        id: string;
        username: string;
        time: string;
        type: TournamentTypes;
        win: string;
      },
      callback: Function
    ) => {
      const isTournamentNameTaken = Array.from(activeTournaments).some(
        (tournament) => tournament.name.toLowerCase() === name.toLowerCase()
      );

      const isUsernameTaken = Array.from(allPlayers).some(
        (existingUser) =>
          existingUser &&
          existingUser.username.toLowerCase() === username.toLowerCase()
      );

      if (isTournamentNameTaken) {
        callback({ username: false, tournamentName: true });
      } else if (isUsernameTaken) {
        callback({ username: true, tournamentName: false });
      } else {
        activeTournaments.add({
          id: id,
          name: name,
          players: [],
          active: false,
          type: type,
          time: Number(time),
          win: Number(win),
        });
        callback({ username: false, tournamentName: false });
      }

      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
    }
  );

  socket.on(
    SocketEvent.ENTER_TOURNAMENT,
    (tournamentId: string, callback: Function) => {
      const tournament = findTournamentByTournamentId(tournamentId);
      socket.join(tournamentId!);
      if (tournament) {
        callback({
          tournamentName: tournament.name,
          isTournamentActive: tournament.active,
          timeControl: tournament.time,
        });
      } else {
        callback({
          tournamentName: "",
          isTournamentActive: false,
        });
      }
      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
    }
  );

  socket.on(SocketEvent.START_TOURNAMENT, (tournamentId: string) => {
    const tournamentToBeStarted = findTournamentByTournamentId(tournamentId);
    if (tournamentToBeStarted) {
      tournamentToBeStarted.active = true;
    }
    io.to(tournamentId).emit(SocketEvent.TOURNAMENT_STARTED, tournamentId);
    io.to(adminManager).emit(
      SocketEvent.UPDATE_TOURNAMENTS,
      Array.from(activeTournaments)
    );
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
          socket.emit(SocketEvent.RECOVER_GAME, {
            fen,
            activeGameId: game,
            clocks,
          });
        } else {
          console.error(`Game with ID ${game} not found.`);
        }
      }

      const playerToChangeStatus = findPlayerByUsername(
        selectingPlayer,
        activePlayers
      );

      if (playerToChangeStatus) {
        updatePlayerStatus(playerToChangeStatus, PlayerStatus.SPECTATOR);
      }

      const tournamentId = findTournamentByUsername(selectingPlayer)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
      }
      callback(activeGame?.playersUsernames);
      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
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

        const playerToChangeStatus = findPlayerByUsername(
          player,
          activePlayers
        );

        if (playerToChangeStatus) {
          updatePlayerStatus(playerToChangeStatus, PlayerStatus.NOT_STARTED);
        }
        socket.leave(game);

        const tournamentId = findTournamentByUsername(player)?.id;
        if (tournamentId) {
          io.to(tournamentId).emit(
            SocketEvent.USERS_LIST_UPDATE,
            getPlayersFromTournamentById(tournamentId)
          );
          io.to(adminManager).emit(
            SocketEvent.UPDATE_TOURNAMENTS,
            Array.from(activeTournaments)
          );
        }
      } else {
        console.error(`Game with ID ${game} not found.`);
      }
    }
  });

  socket.on(SocketEvent.CANCEL_GAME_SEARCH, (room: string) => {
    activeGames.delete(room);
    const player = getUserBySocket(socket.id, activePlayers);

    if (player) {
      updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
      const tournamentId = findTournamentByUsername(player.username)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
      }
    }
  });

  socket.on(
    SocketEvent.CHECK_PLAYER,
    (username: string, callback: Function) => {
      const player = findPlayerByUsername(username, allPlayers);

      if (!player?.isDeleted) {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  socket.on(
    SocketEvent.GET_TOURNAMENT_INFO,
    (playerUsername: string, callback: Function) => {
      const tournamentName = findTournamentByUsername(playerUsername)?.name;
      if (tournamentName) {
        callback(tournamentName);
      }
    }
  );

  socket.on(SocketEvent.DELETE_TOURNAMENT, (tournamentId: string) => {
    const tournamentToBeDeleted = findTournamentByTournamentId(tournamentId);

    if (tournamentToBeDeleted) {
      io.to(tournamentId).emit(SocketEvent.TOURNAMENT_DELETED);
      const tournamentPlayersUsernames = getUsernamesFromTournament(
        tournamentToBeDeleted
      );

      activePlayers.forEach((player) => {
        if (tournamentPlayersUsernames.includes(player.username)) {
          activePlayers.delete(player);
        }
      });
      allPlayers.forEach((player) => {
        if (tournamentPlayersUsernames.includes(player.username)) {
          userSockets.delete(player.id);
          allPlayers.delete(player);
        }
      });

      activeTournaments.delete(tournamentToBeDeleted);
    }

    io.to(adminManager).emit(
      SocketEvent.UPDATE_TOURNAMENTS,
      Array.from(activeTournaments)
    );
  });

  socket.on(
    SocketEvent.LEAVE_TOURNAMENT,
    ({
      tournamentId,
      username,
    }: {
      tournamentId: string;
      username: string;
    }) => {
      const tournament = findTournamentByTournamentId(tournamentId);

      if (tournament) {
        activePlayers.forEach((player) => {
          if (player.username === username) {
            activePlayers.delete(player);
          }
        });

        allPlayers.forEach((player) => {
          if (player.username === username) {
            userSockets.delete(player.id);
            allPlayers.delete(player);
          }
        });

        tournament.players = tournament.players.filter(
          (player) => player.username !== username
        );

        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
      }
      io.to(adminManager).emit(
        SocketEvent.UPDATE_TOURNAMENTS,
        Array.from(activeTournaments)
      );
    }
  );

  socket.on(
    SocketEvent.CHECK_TOURNAMENT,
    (username: string, callback: Function) => {
      const tournament = findTournamentByUsername(username);

      if (tournament) {
        const tournamentPlayersUsernames =
          getUsernamesFromTournament(tournament);

        const isPlayerInTournament =
          tournamentPlayersUsernames?.includes(username);

        if (tournament) {
          if (tournament.active) {
            if (isPlayerInTournament) {
              callback({ tournament: true, active: true, player: true });
            } else {
              callback({ tournament: true, active: true, player: false });
            }
          } else {
            if (isPlayerInTournament) {
              callback({ tournament: true, active: false, player: true });
            } else {
              callback({ tournament: true, active: false, player: false });
            }
          }
        } else {
          callback({ tournament: false });
        }
      }
    }
  );

  socket.on(SocketEvent.GET_TOURNAMENTS, (callback: Function) => {
    callback(Array.from(activeTournaments));
  });

  socket.on(
    SocketEvent.CHECK_IS_PLAYER_IN_TOURNAMENT,
    (playerUsername: string, callback: Function) => {
      const tournament = findTournamentByUsername(playerUsername);
      if (tournament) {
        callback(true);
      } else {
        callback(false);
      }
    }
  );
};
