import { updateAdminManager } from "../functions/updateAdminManager";
import { activeTournaments, allPlayers } from "../socket/onConnection";
import { TournamentType } from "../types/types";

export const createTournament = (
  name: string,
  id: string,
  username: string,
  time: string,
  increment: string,
  type: TournamentType,
  win: string,
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

  updateAdminManager();
};
