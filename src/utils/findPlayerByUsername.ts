import { Player } from '../types/types';

export const findPlayerByUsername = (
  username: string,
  users: Set<Player>
): Player | undefined => {
  return Array.from(users).find((user) => user.username === username);
};
