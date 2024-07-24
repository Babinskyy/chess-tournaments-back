import { io } from "../..";
import {
  Game,
  PlayerStatus,
  SocketEvent,
  TournamentType,
} from "../types/types";
import { findGameIdByUsername } from "../utils/findGameIdByUsername";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import {
  activeGames,
  activePlayers,
  activeTournaments,
  allPlayers,
  userSockets,
} from "./onConnection";

export const addPoints = (winner: string, game?: string) => {
  if (winner) {
    if (winner !== "draw") {
      activePlayers.forEach((player) => {
        if (player.username === winner) {
          player.points = player.points + 1;
        }
      });
    } else if (game) {
      const playersUsername = activeGames.get(game)?.playersUsernames;
      activePlayers.forEach((player) => {
        if (playersUsername && player.username === playersUsername[0]) {
          player.points = player.points + 0.5;
        }
        if (playersUsername && player.username === playersUsername[1]) {
          player.points = player.points + 0.5;
        }
      });
    }

    activePlayers.forEach((player) => {
      const tournament = findTournamentByUsername(player.username);

      if (tournament) {
        const arePlayersStillPlaying = getPlayersFromTournamentById(
          tournament?.id
        ).some((p) => p.status === PlayerStatus.IN_GAME);

        const isFFATournamentFinished =
          tournament.type === TournamentType.FFA &&
          tournament?.win &&
          player.points >= tournament?.win;

        const isSwissTournamentFinished =
          tournament.type === TournamentType.SWISS &&
          tournament.win === tournament.currentRound &&
          !arePlayersStillPlaying;

        if (isFFATournamentFinished || isSwissTournamentFinished) {
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
  }
};
