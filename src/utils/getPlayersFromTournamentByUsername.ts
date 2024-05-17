import { activeTournaments, activeUsers } from "../socket/onConnection";
import { User } from "../types/types.types";
import { getUsersArray } from "./getUsersArray";

export const getPlayersFromTournamentByUsername = (
  username: string
): User[] => {
  const tournamentWithParticipants = Array.from(activeTournaments).find(
    (tournament) => tournament.playersUsernames.includes(username)
  );

  if (!tournamentWithParticipants) {
    return []
  }

  const usernamesInTournament = tournamentWithParticipants.playersUsernames;

  const playersInTournament = getUsersArray(activeUsers).filter((player) =>
    usernamesInTournament.includes(player.username)
  );

  return playersInTournament;
};
