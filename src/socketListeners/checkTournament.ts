import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";

export const checkTournament = (username: string, callback: Function) => {
  const tournament = findTournamentByUsername(username);

  if (tournament) {
    const tournamentPlayersUsernames = getUsernamesFromTournament(tournament);

    const isPlayerInTournament = tournamentPlayersUsernames?.includes(username);

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
};
