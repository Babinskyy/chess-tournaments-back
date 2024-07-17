import { Socket } from "socket.io";
import { activeGames, activePlayers, allPlayers } from "../socket/onConnection";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findGameBySpectator } from "../utils/findGameBySpectator";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { PlayerStatus, SocketEvent, TemporaryPlayer } from "../types/types";
import { getUserBySocket } from "../utils/getUserBySocket";
import { findGameByUsername } from "../utils/findGameByUsername";
import { startStatusChecking } from "../socket/startStatusChecking";
import { io } from "../..";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updateAdminManager } from "../functions/updateAdminManager";

export const userDisconnect = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const existingUser = Array.from(activePlayers).find(
    (user) => user.id === socket.id
  );

  let tournament = undefined;

  if (existingUser) {
    tournament = findTournamentByUsername(existingUser?.username);

    const spectatorGame = findGameBySpectator(
      existingUser.username,
      activeGames
    );

    if (spectatorGame) {
      if (activeGames.has(spectatorGame)) {
        const activeGame = activeGames.get(spectatorGame)!;
        activeGame.spectators = activeGame.spectators.filter(
          (spectator) => spectator !== existingUser.username
        );

        updatePlayerStatus(existingUser, PlayerStatus.NOT_STARTED);
        socket.leave(spectatorGame);
      } else {
        updatePlayerStatus(existingUser, PlayerStatus.NOT_STARTED);
        console.error(`Game with ID ${spectatorGame} not found.`);
      }
    }

    if (existingUser.status === PlayerStatus.WAITING) {
      const game = findGameByUsername(existingUser.username, activeGames);
      if (game) {
        activeGames.delete(game);
        const player = getUserBySocket(socket.id, activePlayers);

        if (player) {
          updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
        }
      }
    }

    allPlayers.add({
      id: TemporaryPlayer.ID,
      username: existingUser.username,
      status: existingUser.status,
      points: 0,
      isAdmin: false,
      isDeleted: false,
      playersPlayed: existingUser.playersPlayed,
      colors: existingUser.colors,
    });

    updatePlayerStatus(existingUser, PlayerStatus.DISCONNECTED);

    startStatusChecking(existingUser.username);
  }

  if (existingUser) {
    const tournamentId = findTournamentByUsername(existingUser.username)?.id;
    if (tournamentId) {
      io.to(tournamentId).emit(
        SocketEvent.USERS_LIST_UPDATE,
        getPlayersFromTournamentById(tournamentId)
      );
    }
  }

  updateAdminManager();
};
