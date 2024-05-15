import { Tournament } from "../types/types.types";

export const findTournamentByUsername = (
  username: string,
  activeTournaments: Set<Tournament>
): Tournament | undefined => {
  for (let tournament of activeTournaments) {
    if (tournament.playersUsernames.includes(username)) {
      return tournament;
    }
  }

  return undefined;
};
