import { Player } from "../types/types";

export const getUserBySocket = (
  socketId: string,
  activePlayers: Set<Player>
) => {
    return Array.from(activePlayers).find((u) => u.id === socketId);
};
