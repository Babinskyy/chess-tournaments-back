import { User } from '../types/types.types';

export const findPlayerByUsername = (
  username: string,
  users: Set<User>
): User | undefined => {
  return Array.from(users).find((user) => user.username === username);
};
