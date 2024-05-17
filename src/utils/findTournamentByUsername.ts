import { activeTournaments } from "../socket/onConnection";
import { Tournament } from "../types/types.types";

export const findTournamentByUsername = (
  username: string,
): Tournament | undefined => {
  for (let tournament of activeTournaments) {
    if (tournament.playersUsernames.includes(username)) {
      return tournament;
    }
  }

  return undefined;
};
