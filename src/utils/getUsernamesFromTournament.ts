import { Tournament } from "../types/types.types";

export const getUsernamesFromTournament = (tournament: Tournament) => {
  return tournament.players.map((player) => player.username);
};
