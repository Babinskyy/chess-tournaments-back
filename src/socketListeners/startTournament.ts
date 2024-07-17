import { io } from "../..";
import { updateAdminManager } from "../functions/updateAdminManager";
import { SocketEvent } from "../types/types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";

export const startTournament = (tournamentId: string) => {
  const tournamentToBeStarted = findTournamentByTournamentId(tournamentId);
  if (tournamentToBeStarted) {
    tournamentToBeStarted.active = true;
  }
  io.to(tournamentId).emit(SocketEvent.TOURNAMENT_STARTED, tournamentId);
  updateAdminManager();
};
