import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";
import { userReconnect } from "./userReconnect";
import { v4 } from "uuid";
import { startGame } from "./startGame";
import { addPoints } from "./addPoints";
import { finishGame } from "./finishGame";
import {
  Color,
  Game,
  PlayerStatus,
  TemporaryPlayer,
  Tournament,
  Player,
  TournamentType,
  SocketEvent,
} from "../types/types";
import { startCountdown } from "./startCountdown";
import {
  INITIAL_FEN,
  MAX_PLAYERS_IN_TOURNAMENT,
} from "../constansts/constants";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findGameBySpectator } from "../utils/findGameBySpectator";
import { getUserBySocket } from "../utils/getUserBySocket";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { startStatusChecking } from "./startStatusChecking";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { deletePlayer } from "../utils/deleteUser";
import { generateSwissPairings } from "../utils/generateSwissPairing";
import { updatePlayerColor } from "../utils/updatePlayerColor";
import { Match } from "../swiss/swiss.types";

export const activeTournaments: Set<Tournament> = new Set();
export const activePlayers: Set<Player> = new Set();
export const allPlayers: Set<Player> = new Set();
export const userSockets = new Map();
export const activeGames: Map<string, Game> = new Map();
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
      const activePlayersInTournament = getPlayersFromTournamentById(
        tournamentId
      ).filter((player) => player.isDeleted === false);

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

      if (activePlayersInTournament.length >= MAX_PLAYERS_IN_TOURNAMENT) {
        callback({
          success: false,
          message: "Max players in tournament limit.",
          cause: "players-limit",
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
          playersPlayed: [],
          colors: [],
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
      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
    }
  );

  socket.on(
    SocketEvent.USER_ENTERED_LOBBY,
    (tournamentId: string, callback: Function) => {
      const tournament = findTournamentByTournamentId(tournamentId);
      if (tournament) {
        callback(tournament);
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
      playerColor: Color;
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
            playerColor === Color.BLACK
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
            updatePlayerColor(player0, Color.WHITE);
            updatePlayerColor(player1, Color.BLACK);
            updatePlayerStatus(player0, PlayerStatus.NOT_STARTED);
            updatePlayerStatus(player1, PlayerStatus.NOT_STARTED);
          }

          addPoints(winner, room, activeGames);
          socket.leave(room);

          const result =
            playerColor === Color.WHITE ? Color.BLACK : Color.WHITE;

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
      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
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
        playersPlayed: existingUser.playersPlayed,
        colors: existingUser.colors,
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

    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
  });

  socket.on(SocketEvent.MOVE, (move, gameId) => {
    const game = activeGames.get(gameId);
    if (game?.playersUsernames[0]) {
      const tournament = findTournamentByUsername(game?.playersUsernames[0]);
      if (tournament?.increment) {
        if (game.isWhiteMove) {
          game.clocks[0] = game.clocks[0] + tournament?.increment;
        } else {
          game.clocks[1] = game.clocks[1] + tournament?.increment;
        }
        game.isWhiteMove = !game.isWhiteMove;
      }
    }

    if (!game) {
      socket.broadcast.emit(SocketEvent.PLAYER_MOVE, move);
    } else {
      socket.to(gameId).emit(SocketEvent.PLAYER_MOVE, move);
    }
  });

  socket.on(SocketEvent.JOIN_GAME, (player: string) => {
    let game: string | undefined;
    let playersUsernames: string[] | undefined;

    const tournament1 = findTournamentByUsername(player);
    const playerObj = findPlayerByUsername(player, allPlayers);

    if (tournament1?.type === TournamentType.FFA && playerObj) {
      const allPlayersInTournament = getPlayersFromTournamentById(
        tournament1.id
      ).filter(
        (tournamentPlayer) =>
          tournamentPlayer.username !== player &&
          tournamentPlayer.isDeleted !== true
      );

      if (playerObj.playersPlayed.length >= allPlayersInTournament.length) {
        playerObj.playersPlayed = [];
      }

      for (const [gameId, gameData] of activeGames) {
        if (gameData.playersUsernames.length < 2) {
          const existingPlayerUsername = gameData.playersUsernames[0];
          const tournament2 = findTournamentByUsername(existingPlayerUsername);
          const existingPlayer = findPlayerByUsername(
            existingPlayerUsername,
            allPlayers
          );

          if (
            tournament1?.id === tournament2?.id &&
            existingPlayer &&
            !existingPlayer.playersPlayed.includes(player) &&
            !playerObj.playersPlayed.includes(existingPlayerUsername)
          ) {
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
          isWhiteMove: true,
          spectators: [],
        });

        const activePlayer = findPlayerByUsername(player, allPlayers);
        if (activePlayer) {
          updatePlayerStatus(activePlayer, PlayerStatus.WAITING);
        }
      }

      if (playersUsernames) {
        playersUsernames.push(player);
        socket.join(game!);
        if (playersUsernames.length === 2) {
          const player0 = findPlayerByUsername(playersUsernames[0], allPlayers);
          const player1 = findPlayerByUsername(playersUsernames[1], allPlayers);

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
    }

    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
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
      const tournamentType = findTournamentByUsername(
        finishedGame?.playersUsernames[0]
      )?.type;

      const winner =
        result === "white"
          ? finishedGame.playersUsernames[0]
          : result === "black"
          ? finishedGame.playersUsernames[1]
          : result === ""
          ? tournamentType === TournamentType.SWISS
            ? finishedGame.playersUsernames[1]
            : ""
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
        updatePlayerColor(player0, Color.WHITE);
        updatePlayerColor(player1, Color.BLACK);
        updatePlayerStatus(player0, PlayerStatus.NOT_STARTED);
        updatePlayerStatus(player1, PlayerStatus.NOT_STARTED);
      }

      addPoints(winner, room, activeGames);
      finishGame(room, result, reason);
      activeGames.delete(room);
    }
    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
  });

  socket.on(
    SocketEvent.CREATE_TOURNAMENT,
    (
      {
        name,
        id,
        username,
        time,
        increment,
        type,
        win,
      }: {
        name: string;
        id: string;
        username: string;
        time: string;
        increment: string;
        type: TournamentType;
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
          increment: Number(increment),
          win: Number(win),
          currentRound: 0,
        });

        callback({ username: false, tournamentName: false });
      }

      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
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
      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
    }
  );

  socket.on(SocketEvent.START_TOURNAMENT, (tournamentId: string) => {
    const tournamentToBeStarted = findTournamentByTournamentId(tournamentId);
    if (tournamentToBeStarted) {
      tournamentToBeStarted.active = true;
    }
    io.to(tournamentId).emit(SocketEvent.TOURNAMENT_STARTED, tournamentId);
    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
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
          socket.join(game);
          socket.emit(SocketEvent.SET_GAME, game);
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

      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
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
          io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
            tournaments: Array.from(activeTournaments),
            activePlayers: Array.from(activePlayers),
            allPlayers: Array.from(allPlayers),
            games: Array.from(activeGames),
          });
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
      const tournament = findTournamentByUsername(playerUsername);
      if (tournament) {
        callback(tournament);
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

    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
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
      io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
        tournaments: Array.from(activeTournaments),
        activePlayers: Array.from(activePlayers),
        allPlayers: Array.from(allPlayers),
        games: Array.from(activeGames),
      });
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
    callback({
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });
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

  socket.on(SocketEvent.START_ROUND, (tournamentId: string) => {
    activeTournaments.forEach((t) => {
      if (t.id === tournamentId) {
        t.currentRound = t.currentRound + 1;
      }
    });

    const tournament = findTournamentByTournamentId(tournamentId);
    let pairings: Match[] | null = null;
    const tournamentPlayers = tournament?.players;

    if (tournamentPlayers) {
      pairings = generateSwissPairings(
        tournamentPlayers,
        tournament?.currentRound
      );
    }

    pairings?.forEach((pairing) => {
      const gameId = v4();

      if (
        typeof pairing.player1 === "string" &&
        typeof pairing.player2 === "string" &&
        tournament
      ) {
        activeGames.set(gameId, {
          fen: INITIAL_FEN,
          playersUsernames: [pairing.player1, pairing.player2],
          clocks: [tournament.time * 60, tournament.time * 60],
          isWhiteMove: true,
          spectators: [],
        });

        const player0 = findPlayerByUsername(pairing.player1, activePlayers);
        const player1 = findPlayerByUsername(pairing.player2, activePlayers);

        if (player0 && player1) {
          const socket0 = io.sockets.sockets.get(player0?.id);
          const socket1 = io.sockets.sockets.get(player1?.id);

          socket0?.join(gameId);
          socket1?.join(gameId);

          io.to(player0?.id).to(player1?.id).emit(SocketEvent.SET_GAME, gameId);

          updatePlayerStatus(player0, PlayerStatus.IN_GAME);
          updatePlayerStatus(player1, PlayerStatus.IN_GAME);

          startCountdown(gameId, activeGames);

          const tournamentId = findTournamentByUsername(player0.username)?.id;
          if (tournamentId) {
            io.to(tournamentId).emit(
              SocketEvent.USERS_LIST_UPDATE,
              getPlayersFromTournamentById(tournamentId)
            );
            io.to(gameId!).emit(SocketEvent.PLAYER_JOIN, [
              pairing.player1,
              pairing.player2,
            ]);
          }
        }
      }
    });

    io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
      tournaments: Array.from(activeTournaments),
      activePlayers: Array.from(activePlayers),
      allPlayers: Array.from(allPlayers),
      games: Array.from(activeGames),
    });

    io.to(tournamentId).emit(SocketEvent.UPDATE_ONE_TOURNAMENT, tournament);
  });
};
