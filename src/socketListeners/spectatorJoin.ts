import { Socket } from "socket.io";
import { activeGames, activePlayers } from "../socket/onConnection";
import { findGameIdByUsername } from "../utils/findGameIdByUsername";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { PlayerStatus, SocketEvent } from "../types/types";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { io } from "../..";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updateAdminManager } from "../functions/updateAdminManager";

export const spectatorJoin = (
  selectedPlayer: string,
  selectingPlayer: string,
  callback: Function,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const game = findGameIdByUsername(selectedPlayer, activeGames);

  let activeGame;

  if (game) {
    if (activeGames.has(game)) {
      activeGame = activeGames.get(game)!;
      activeGame?.spectators.push(selectingPlayer);
      socket.join(game);
      socket.emit(SocketEvent.SET_GAME, game);
      const { fen, clocks, history: movesHistory } = activeGame;
      socket.emit(SocketEvent.RECOVER_GAME, {
        fen,
        movesHistory,
        activeGameId: game,
        clocks,
      });
    } else {
      console.error(`Game with ID ${game} not found.`);
    }
  }

  const playerToChangeStatus = findPlayerByUsername(
    selectingPlayer,
    activePlayers
  );

  if (playerToChangeStatus) {
    updatePlayerStatus(playerToChangeStatus, PlayerStatus.SPECTATOR);
  }

  const tournamentId = findTournamentByUsername(selectingPlayer)?.id;

  if (tournamentId) {
    io.to(tournamentId).emit(
      SocketEvent.USERS_LIST_UPDATE,
      getPlayersFromTournamentById(tournamentId)
    );
  }

  callback(activeGame?.playersUsernames);

  updateAdminManager();
};
