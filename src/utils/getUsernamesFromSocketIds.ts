import { User } from '../types/types.types';

export const getUsernamesForActiveSockets = (
  activeUsers: Set<User>,
  activeSocketIds: Set<string> | undefined
): string[] => {
  const usernames: string[] = [];

  activeSocketIds?.forEach((socketId) => {
    const user = Array.from(activeUsers).find((u) => u.id === socketId);

    if (user) {
      usernames.push(user.username);
    }
  });

  return usernames;
};
