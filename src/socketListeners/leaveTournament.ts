import { io } from "../..";
import { updateAdminManager } from "../functions/updateAdminManager";
import { activePlayers, allPlayers, userSockets } from "../socket/onConnection";
import { SocketEvent } from "../types/types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";

export const leaveTournament = (tournamentId: string, username: string) => {
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
  updateAdminManager();
};
