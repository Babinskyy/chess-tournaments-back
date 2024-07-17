import { Socket } from "socket.io";
import { updateAdminManager } from "../functions/updateAdminManager";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const enterTournament = (
  tournamentId: string,
  callback: Function,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
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
  updateAdminManager();
};
