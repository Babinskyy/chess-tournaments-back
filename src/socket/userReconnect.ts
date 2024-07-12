import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import {
  activeGames,
  activePlayers,
  activeTournaments,
  adminManager,
  allPlayers,
  disconnectTimeouts,
} from "./onConnection";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { PlayerStatus, SocketEvent, Player } from "../types/types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { io } from "../..";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { replaceTournamentPlayer } from "../utils/replaceTournamentPlayer";

export const userReconnect = (
  username: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const existingUser = findPlayerByUsername(username, allPlayers);
  const temporaryPlayer = findTemporaryPlayerByUsername(username, allPlayers);
  const tournamentId = findTournamentByUsername(username)?.id;

  if (
    (existingUser && temporaryPlayer) ||
    (existingUser && existingUser.status !== PlayerStatus.DISCONNECTED)
  ) {
    const updatedUsers = new Set(
      Array.from(allPlayers).map((user) =>
        user.username === username ? existingUser : user
      )
    );

    updatedUsers.delete(existingUser);

    const newPlayer: Player = {
      id: socket.id,
      username: username,
      points: existingUser.points,
      status: temporaryPlayer
        ? temporaryPlayer.status
        : PlayerStatus.NOT_STARTED,
      isAdmin: existingUser.isAdmin,
      isDeleted: false,
      playersPlayed: existingUser.playersPlayed,
      colors: existingUser.colors
    };

    updatedUsers.add(newPlayer);

    activePlayers.clear();
    allPlayers.clear();
    updatedUsers.forEach((user) => activePlayers.add(user));
    updatedUsers.forEach((user) => allPlayers.add(user));

    replaceTournamentPlayer(existingUser, newPlayer);

    const activeGameId = findGameByUsername(username, activeGames);
    let playerInfo = findPlayerByUsername(username, allPlayers);

    if (activeGameId) {
      socket.join(activeGameId);
      io.to(activeGameId).emit(
        SocketEvent.PLAYER_JOIN,
        activeGames.get(activeGameId)?.playersUsernames
      );
      const fen = activeGames.get(activeGameId)?.fen;
      const clocks = activeGames.get(activeGameId)?.clocks;
      io.to(activeGameId).emit(SocketEvent.RECOVER_GAME, {
        fen,
        activeGameId,
        clocks,
      });
    } else {
      const player = findPlayerByUsername(username, activePlayers);
      if (player && playerInfo) {
        updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
        playerInfo.status = PlayerStatus.NOT_STARTED;
      }

      socket.emit(SocketEvent.RECOVER_PLAYER, playerInfo);
    }

    clearTimeout(disconnectTimeouts.get(newPlayer.username));
  } else if (existingUser && !temporaryPlayer) {
    const tournament = findTournamentByUsername(existingUser.username);

    if (!tournament?.active) {
      existingUser.isDeleted = false;
      updatePlayerStatus(existingUser, PlayerStatus.NOT_STARTED);
    }
  }

  if (tournamentId) {
    socket.join(tournamentId);
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
};
