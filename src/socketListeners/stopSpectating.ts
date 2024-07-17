import { Socket } from "socket.io";
import { activeGames, activePlayers } from "../socket/onConnection";
import { PlayerStatus, SocketEvent } from "../types/types";
import { findGameBySpectator } from "../utils/findGameBySpectator";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { io } from "../..";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updateAdminManager } from "../functions/updateAdminManager";

export const stopSpectating = (player: string, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
  const game = findGameBySpectator(player, activeGames);

  let activeGame;

  if (game) {
    if (activeGames.has(game)) {
      activeGame = activeGames.get(game)!;
      activeGame.spectators = activeGame?.spectators.filter(
        (spectator) => spectator !== player
      );

      const playerToChangeStatus = findPlayerByUsername(player, activePlayers);

      if (playerToChangeStatus) {
        updatePlayerStatus(playerToChangeStatus, PlayerStatus.NOT_STARTED);
      }
      socket.leave(game);

      const tournamentId = findTournamentByUsername(player)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
        updateAdminManager();
      }
    } else {
      console.error(`Game with ID ${game} not found.`);
    }
  }
};
