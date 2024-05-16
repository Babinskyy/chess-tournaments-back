import { TemporaryPlayer, User } from "../types/types.types";

export const findTemporaryPlayerByUsername = (
  username: string,
  users: Set<User>
): User | undefined => {
  return Array.from(users)
    .filter((player) => player.id === TemporaryPlayer.ID)
    .find((user) => user.username === username);
};
