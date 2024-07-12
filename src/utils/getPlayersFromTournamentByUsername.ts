import { activeTournaments, activePlayers } from "../socket/onConnection";
import { Player } from "../types/types";
import { getUsersArray } from "./getUsersArray";

export const getPlayersFromTournamentByUsername = (
  username: string
): Player[] => {
  const tournamentWithParticipants = Array.from(activeTournaments).find(
    (tournament) =>
      tournament.players.forEach((player) => player.username === username)
  );

  if (!tournamentWithParticipants) {
    return [];
  }

  const usernamesInTournament = tournamentWithParticipants.players.map((player) => player.username);

  const playersInTournament = getUsersArray(activePlayers).filter((player) =>
    usernamesInTournament.includes(player.username)
  );

  return playersInTournament;
};
