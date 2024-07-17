import { findTournamentByUsername } from "../utils/findTournamentByUsername";

export const getTournamentInfo = (
  playerUsername: string,
  callback: Function
) => {
  const tournament = findTournamentByUsername(playerUsername);
  if (tournament) {
    callback(tournament);
  }
};
