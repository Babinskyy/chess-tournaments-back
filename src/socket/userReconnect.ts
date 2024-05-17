import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { activeUsers, allUsers, disconnectTimeouts } from "./onConnection";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { PlayerStatus, SocketEvent } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";

export const userReconnect = (
  username: string,
  socketid: string,
  activeGames: Map<any, any>,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const existingUser = findPlayerByUsername(username, allUsers);
  const temporaryPlayer = findTemporaryPlayerByUsername(username, allUsers);

  if (existingUser && temporaryPlayer) {
    const updatedUsers = new Set(
      Array.from(activeUsers).map((user) =>
        user.username === username ? existingUser : user
      )
    );

    updatedUsers.delete(existingUser);
    updatedUsers.add({
      id: socketid,
      username: username,
      points: existingUser.points,
      status: temporaryPlayer.status,
      isAdmin: existingUser.isAdmin,
      isDeleted: false,
    });

    activeUsers.clear();
    allUsers.clear();
    updatedUsers.forEach((user) => activeUsers.add(user));
    updatedUsers.forEach((user) => allUsers.add(user));

    const activeGameId = findGameByUsername(username, activeGames);
    const playerInfo = findPlayerByUsername(username, allUsers);

    if (activeGameId) {
      socket.join(activeGameId);
      io.to(activeGameId).emit(
        SocketEvent.PLAYER_JOIN,
        activeGames.get(activeGameId).playersUsernames
      );
      const fen = activeGames.get(activeGameId).fen;
      const clocks = activeGames.get(activeGameId).clocks;
      io.to(activeGameId).emit(SocketEvent.RECOVER_GAME, {
        fen,
        activeGameId,
        clocks,
      });
    } else {
      socket.emit(SocketEvent.RECOVER_PLAYER, playerInfo);
    }

    clearTimeout(disconnectTimeouts.get(existingUser.username));
  } else if (existingUser && !temporaryPlayer) {
    const tournament = findTournamentByUsername(existingUser.username);
    if (!tournament?.active) {
      existingUser.isDeleted = false;
      existingUser.status = PlayerStatus.NOT_STARTED;
    }
  }

  const tournamentId = findTournamentByUsername(username)?.id;

  if (tournamentId) {
    io.to(tournamentId).emit(
      SocketEvent.USERS_LIST_UPDATE,
      getPlayersFromTournamentById(tournamentId)
    );
  }
};
