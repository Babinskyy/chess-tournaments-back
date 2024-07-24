import { Socket } from "socket.io";
import { addPoints } from "../socket/addPoints";
import {
  activeGames,
  activePlayers,
  activeTournaments,
  allPlayers,
} from "../socket/onConnection";
import {
  Color,
  GameFinishReason,
  PlayerStatus,
  SocketEvent,
} from "../types/types";
import { deletePlayer } from "../utils/deleteUser";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { updatePlayerColor } from "../utils/updatePlayerColor";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";
import { finishGame } from "../socket/finishGame";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { updateAdminManager } from "../functions/updateAdminManager";

export const userLogout = (
  username: string,
  playerColor: Color,
  room: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
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

      addPoints(winner);
      socket.leave(room);

      const result = playerColor === Color.WHITE ? Color.BLACK : Color.WHITE;

      finishGame(room, result, GameFinishReason.opponentDisconnect);
      activeGames.delete(room);
    }
  }

  const tournament = findTournamentByUsername(username);

  if (tournament?.id) {
    const playersInTournament = getPlayersFromTournamentById(tournament?.id);

    const isAnyPlayerActive = Array.from(playersInTournament).some(
      (player) => player.isDeleted === false
    );

    if (isAnyPlayerActive) {
      io.to(tournament?.id).emit(
        SocketEvent.USERS_LIST_UPDATE,
        playersInTournament
      );
    } else {
      const tournamentPlayersUsernames = getUsernamesFromTournament(tournament);

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
  updateAdminManager();
};
