import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import {
  activeGames,
  activeUsers,
  allUsers,
  disconnectTimeouts,
} from "./onConnection";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { PlayerStatus, SocketEvent, User } from "../types/types.types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { io } from "../..";

export const userReconnect = (
  username: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
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

    const newUser: User = {
      id: socket.id,
      username: username,
      points: existingUser.points,
      status: temporaryPlayer.status,
      isAdmin: existingUser.isAdmin,
      isDeleted: false,
    };

    updatedUsers.add(newUser);

    activeUsers.clear();
    allUsers.clear();
    updatedUsers.forEach((user) => activeUsers.add(user));
    updatedUsers.forEach((user) => allUsers.add(user));

    const activeGameId = findGameByUsername(username, activeGames);
    let playerInfo = findPlayerByUsername(username, allUsers);

    if (activeGameId) {
      socket.join(activeGameId);
      io.to(activeGameId).emit(
        SocketEvent.PLAYER_JOIN,
        activeGames.get(activeGameId)?.playersUsernames
      );
      const fen = activeGames.get(activeGameId)?.fen;
      const clocks = activeGames.get(activeGameId)?.clocks;
      io.to(activeGameId).emit(SocketEvent.RECOVER_GAME, {
        fen,
        activeGameId,
        clocks,
      });
    } else {
      const player = findPlayerByUsername(username, activeUsers);
      if (player && playerInfo) {
        player.status = PlayerStatus.NOT_STARTED;
        playerInfo.status = PlayerStatus.NOT_STARTED;
      }

      socket.emit(SocketEvent.RECOVER_PLAYER, playerInfo);
    }

    clearTimeout(disconnectTimeouts.get(newUser.username));
  } else if (existingUser && !temporaryPlayer) {
    const tournament = findTournamentByUsername(existingUser.username);
    if (!tournament?.active) {
      existingUser.isDeleted = false;
      existingUser.status = PlayerStatus.NOT_STARTED;
    }
  }

  const tournamentId = findTournamentByUsername(username)?.id;
  if (tournamentId) {
    socket.join(tournamentId);
    io.to(tournamentId).emit(
      SocketEvent.USERS_LIST_UPDATE,
      getPlayersFromTournamentById(tournamentId)
    );
  }
};
