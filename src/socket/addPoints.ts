import { io } from "../..";
import { Player, SocketEvent } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { activeTournaments, allPlayers, userSockets } from "./onConnection";

export const addPoints = (
  activePlayers: Set<Player>,
  winner: string,
  game: string,
  activeGames: Map<any, any>
) => {
  if (winner) {
    if (winner !== "draw") {
      activePlayers.forEach((user) => {
        if (user.username === winner) {
          user.points = user.points + 1;
        }
      });
    } else {
      const players = activeGames.get(game).players;
      activePlayers.forEach((user) => {
        if (user.username === players[0]) {
          user.points = user.points + 0.5;
        }
        if (user.username === players[1]) {
          user.points = user.points + 0.5;
        }
      });
    }

    activePlayers.forEach((player) => {
      const tournament = findTournamentByUsername(player.username);
      if (tournament) {
        if (tournament?.win && player.points >= tournament?.win) {
          io.to(tournament.id).emit(
            SocketEvent.FINISH_TOURNAMENT,
            Array.from(tournament.players)
          );

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
