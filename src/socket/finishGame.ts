import { io } from "../..";
import { activeGames, allUsers } from "./onConnection";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { PlayerStatus, SocketEvent, User } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";

export const finishGame = (game: string, result: string, reason: string) => {
  let tempPlayer: User | undefined;
  activeGames.get(game)?.playersUsernames.forEach((playerUsername) => {
    const player = findPlayerByUsername(playerUsername, allUsers);
    tempPlayer = player;
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      player.status = PlayerStatus.NOT_STARTED;
    }
  });
  activeGames.get(game)?.spectators.forEach((spectator) => {
    const player = findPlayerByUsername(spectator, allUsers);
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      player.status = PlayerStatus.NOT_STARTED;
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
};
