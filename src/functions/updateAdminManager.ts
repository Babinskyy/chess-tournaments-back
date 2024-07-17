import { io } from "../..";
import {
  activeGames,
  activePlayers,
  activeTournaments,
  adminManager,
  allPlayers,
} from "../socket/onConnection";
import { SocketEvent } from "../types/types";

export const updateAdminManager = () => {
  io.to(adminManager).emit(SocketEvent.UPDATE_TOURNAMENTS, {
    tournaments: Array.from(activeTournaments),
    activePlayers: Array.from(activePlayers),
    allPlayers: Array.from(allPlayers),
    games: Array.from(activeGames),
  });
};
