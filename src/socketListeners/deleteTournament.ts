import { io } from "../..";
import { updateAdminManager } from "../functions/updateAdminManager";
import {
  activePlayers,
  activeTournaments,
  allPlayers,
  userSockets,
} from "../socket/onConnection";
import { SocketEvent } from "../types/types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";

export const deleteTournament = (tournamentId: string) => {
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

  updateAdminManager();
};
