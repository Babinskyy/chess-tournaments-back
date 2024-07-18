import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { userReconnect } from "./userReconnect";
import { startGame } from "./startGame";
import {
  Color,
  Game,
  Tournament,
  Player,
  TournamentType,
  SocketEvent,
  moveData,
  GameFinishReason,
} from "../types/types";

import functions from "../socketListeners";

const {
  userLogin,
  userEnteredLobby,
  userLogout,
  userDisconnect,
  moveEvent,
  joinGame,
  updateGame,
  gameEnd,
  createTournament,
  enterTournament,
  startTournament,
  spectatorJoin,
  stopSpectating,
  cancelGameSearch,
  checkPlayer,
  getTournamentInfo,
  deleteTournament,
  leaveTournament,
  checkTournament,
  checkIsPlayerInTournament,
  startRound,
  drawOffer,
  declineDraw,
} = functions;

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
      userLogin(username, newPlayerId, tournamentId, socket, callback);
    }
  );

  socket.on(
    SocketEvent.USER_ENTERED_LOBBY,
    (tournamentId: string, callback: Function) => {
      userEnteredLobby(tournamentId, callback);
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
    }) => {
      userLogout(username, playerColor, room, socket);
    }
  );

  socket.on(SocketEvent.DISCONNECT, (reason) => {
    userDisconnect(socket);
  });

  socket.on(SocketEvent.MOVE, (move: moveData, gameId: string) => {
    moveEvent(move, gameId, socket);
  });

  socket.on(SocketEvent.JOIN_GAME, (player: string) => {
    joinGame(player, socket);
  });

  socket.on(
    SocketEvent.UPDATE_GAME,
    ({ room, currentPosition }: { room: string; currentPosition: string }) => {
      updateGame(room, currentPosition);
    }
  );

  socket.on(SocketEvent.GAME_STARTED, (gameId) => {
    startGame(gameId, activeGames);
  });

  socket.on(
    SocketEvent.GAME_END,
    ({
      result,
      reason,
      room,
    }: {
      result: Color | "draw" | undefined | "";
      reason: GameFinishReason | undefined;
      room: string;
    }) => {
      gameEnd(result, reason, room);
    }
  );

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
      createTournament(
        name,
        id,
        username,
        time,
        increment,
        type,
        win,
        callback
      );
    }
  );

  socket.on(
    SocketEvent.ENTER_TOURNAMENT,
    (tournamentId: string, callback: Function) => {
      enterTournament(tournamentId, callback, socket);
    }
  );

  socket.on(SocketEvent.START_TOURNAMENT, (tournamentId: string) => {
    startTournament(tournamentId);
  });

  socket.on(
    SocketEvent.SPECTATOR_JOIN,
    (
      {
        selectedPlayer,
        selectingPlayer,
      }: { selectedPlayer: string; selectingPlayer: string },
      callback: Function
    ) => {
      spectatorJoin(selectedPlayer, selectingPlayer, callback, socket);
    }
  );

  socket.on(SocketEvent.STOP_SPECTATING, (player: string) => {
    stopSpectating(player, socket);
  });

  socket.on(SocketEvent.CANCEL_GAME_SEARCH, (room: string) => {
    cancelGameSearch(room, socket);
  });

  socket.on(
    SocketEvent.CHECK_PLAYER,
    (username: string, callback: Function) => {
      checkPlayer(username, callback);
    }
  );

  socket.on(
    SocketEvent.GET_TOURNAMENT_INFO,
    (playerUsername: string, callback: Function) => {
      getTournamentInfo(playerUsername, callback);
    }
  );

  socket.on(SocketEvent.DELETE_TOURNAMENT, (tournamentId: string) => {
    deleteTournament(tournamentId);
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
      leaveTournament(tournamentId, username);
    }
  );

  socket.on(
    SocketEvent.CHECK_TOURNAMENT,
    (username: string, callback: Function) => {
      checkTournament(username, callback);
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
      checkIsPlayerInTournament(playerUsername, callback);
    }
  );

  socket.on(SocketEvent.START_ROUND, (tournamentId: string) => {
    startRound(tournamentId);
  });

  socket.on(
    SocketEvent.DRAW_OFFER,
    ({ playerUsername, room }: { playerUsername: string; room: string }) => {
      drawOffer(playerUsername, room);
    }
  );

  socket.on(SocketEvent.DECLINE_DRAW, (room: string) => {
    declineDraw(room);
  });
};
