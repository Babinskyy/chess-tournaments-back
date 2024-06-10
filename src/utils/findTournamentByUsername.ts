import { activeTournaments } from "../socket/onConnection";
import { Tournament } from "../types/types.types";
import { getUsernamesFromTournament } from "./getUsernamesFromTournament";

export const findTournamentByUsername = (
  username: string
): Tournament | undefined => {
  for (let tournament of activeTournaments) {
    const usernamesInTournament = getUsernamesFromTournament(tournament);
    if (usernamesInTournament.includes(username)) {
      return tournament;
    }
  }

  return undefined;
};
