import { io } from "../..";
import { Game, SocketEvent } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { activePlayers, activeTournaments, allPlayers, userSockets } from "./onConnection";

export const addPoints = (
  winner: string,
  game: string,
  activeGames: Map<string, Game>
) => {
  if (winner) {
    if (winner !== "draw") {
      activePlayers.forEach((user) => {
        if (user.username === winner) {
          user.points = user.points + 1;
        }
      });
    } else {
      const playersUsername = activeGames.get(game)?.playersUsernames;
      activePlayers.forEach((user) => {
        if (playersUsername && user.username === playersUsername[0]) {
          user.points = user.points + 0.5;
        }
        if (playersUsername && user.username === playersUsername[1]) {
          user.points = user.points + 0.5;
        }
      });
    }

    activePlayers.forEach((player) => {
      const tournament = findTournamentByUsername(player.username);
      if (tournament) {
        if (tournament?.win && player.points >= tournament?.win) {
          io.to(tournament.id).emit(SocketEvent.FINISH_TOURNAMENT, {
            players: Array.from(tournament.players),
            tournamentName: tournament.name,
          });

          const tournamentPlayersUsernames =
            getUsernamesFromTournament(tournament);

          activePlayers.forEach((player) => {
            if (tournamentPlayersUsernames.includes(player.username)) {
              activePlayers.delete(player);
            }
          });
          allPlayers.forEach((player) => {
            if (tournamentPlayersUsernames.includes(player.username)) {
              userSockets.delete(player.id);
              allPlayers.delete(player);
            }
          });

          activeTournaments.delete(tournament);
        }
      }
    });
  } else {
    return;
  }
};
