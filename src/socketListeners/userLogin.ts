import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { MAX_PLAYERS_IN_TOURNAMENT } from "../constansts/constants";
import { activePlayers, allPlayers, userSockets } from "../socket/onConnection";
import { PlayerStatus } from "../types/types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updateAdminManager } from "../functions/updateAdminManager";

export const userLogin = (
  username: string,
  newPlayerId: string,
  tournamentId: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  callback: Function
) => {
  const tournament = findTournamentByTournamentId(tournamentId);
  const activePlayersInTournament = getPlayersFromTournamentById(
    tournamentId
  ).filter((player) => player.isDeleted === false);

  if (!tournament) {
    callback({
      success: false,
      message: "Tournament does not exist",
      cause: "tournament",
    });

    return;
  }

  if (tournament && tournament.active) {
    callback({
      success: false,
      message: "Tournament already started.",
      cause: "started",
    });

    return;
  }

  if (activePlayersInTournament.length >= MAX_PLAYERS_IN_TOURNAMENT) {
    callback({
      success: false,
      message: "Max players in tournament limit.",
      cause: "players-limit",
    });

    return;
  }

  const isUsernameTaken = Array.from(allPlayers).some(
    (existingUser) =>
      existingUser.username.toLowerCase() === username.toLowerCase()
  );

  if (isUsernameTaken) {
    callback({
      success: false,
      message: "Username taken",
      cause: "username",
    });
  } else {
    const tournament = findTournamentByTournamentId(tournamentId);
    const isAdmin = !tournament?.players.length;

    const newPlayer = {
      id: newPlayerId,
      username: username,
      points: 0,
      status: PlayerStatus.NOT_STARTED,
      isAdmin: isAdmin,
      isDeleted: false,
      playersPlayed: [],
      colors: [],
    };

    if (tournament) {
      tournament.players = [...tournament?.players, newPlayer];
    }

    activePlayers.add(newPlayer);

    socket.join(tournamentId);
    userSockets.set(newPlayerId, socket);

    const newUserCopy = structuredClone(newPlayer);
    allPlayers.add(newUserCopy);

    callback({
      success: true,
      message: `Player added successfully`,
      user: newPlayer,
    });
  }
  updateAdminManager();
};
