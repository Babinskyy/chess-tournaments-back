import { io } from "../..";
import { SocketEvent } from "../types/types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";

export const userEnteredLobby = (tournamentId: string, callback: Function) => {
  const tournament = findTournamentByTournamentId(tournamentId);
  if (tournament) {
    callback(tournament);
  }

  io.to(tournamentId).emit(
    SocketEvent.USERS_LIST_UPDATE,
    getPlayersFromTournamentById(tournamentId)
  );
};
