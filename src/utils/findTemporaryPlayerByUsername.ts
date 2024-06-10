import { TemporaryPlayer, Player } from "../types/types.types";

export const findTemporaryPlayerByUsername = (
  username: string,
  users: Set<Player>
): Player | undefined => {
  return Array.from(users)
    .filter((player) => player.id === TemporaryPlayer.ID)
    .find((user) => user.username === username);
};
