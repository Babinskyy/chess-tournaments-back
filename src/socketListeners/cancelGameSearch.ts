import { Socket } from "socket.io";
import { activeGames, activePlayers } from "../socket/onConnection";
import { getUserBySocket } from "../utils/getUserBySocket";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { PlayerStatus, SocketEvent } from "../types/types";
import { io } from "../..";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";

export const cancelGameSearch = (
  room: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  activeGames.delete(room);
  const player = getUserBySocket(socket.id, activePlayers);

  if (player) {
    updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
    const tournamentId = findTournamentByUsername(player.username)?.id;
    if (tournamentId) {
      io.to(tournamentId).emit(
        SocketEvent.USERS_LIST_UPDATE,
        getPlayersFromTournamentById(tournamentId)
      );
    }
  }
};
