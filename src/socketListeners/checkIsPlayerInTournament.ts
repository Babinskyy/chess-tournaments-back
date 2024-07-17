import { findTournamentByUsername } from "../utils/findTournamentByUsername";

export const checkIsPlayerInTournament = (
  playerUsername: string,
  callback: Function
) => {
  const tournament = findTournamentByUsername(playerUsername);
  if (tournament) {
    callback(true);
  } else {
    callback(false);
  }
};
