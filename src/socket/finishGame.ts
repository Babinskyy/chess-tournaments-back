import { io } from "../..";
import {
  activeGames,
  activeTournaments,
  adminManager,
  allPlayers,
} from "./onConnection";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { PlayerStatus, SocketEvent, Player } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";

export const finishGame = (game: string, result: string, reason: string) => {
  let tempPlayer: Player | undefined;
  activeGames.get(game)?.playersUsernames.forEach((playerUsername) => {
    const player = findPlayerByUsername(playerUsername, allPlayers);
    tempPlayer = player;
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
    }
  });
  activeGames.get(game)?.spectators.forEach((spectator) => {
    const player = findPlayerByUsername(spectator, allPlayers);
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
    }
  });
  activeGames.delete(game);

  io.to(game).emit(SocketEvent.FINISH_GAME, { result, reason });

  if (tempPlayer) {
    const tournamentId = findTournamentByUsername(tempPlayer.username)?.id;
    if (tournamentId) {
      io.to(tournamentId).emit(
        SocketEvent.USERS_LIST_UPDATE,
        getPlayersFromTournamentById(tournamentId)
      );
    }
  }

  io.to(adminManager).emit(
    SocketEvent.UPDATE_TOURNAMENTS,
    Array.from(activeTournaments)
  );
};
