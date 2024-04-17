import { User } from '../types/types.types';

export const findPlayerByUsername = (
  username: string,
  allUsers: Set<User>
): User | undefined => {
  return Array.from(allUsers).find((user) => user.username === username);
};
