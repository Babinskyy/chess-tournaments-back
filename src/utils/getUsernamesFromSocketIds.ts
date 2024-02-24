import { User } from '../socket/onConnection';

export const getUsernamesForActiveSockets = (
  activeUsers: Set<User>,
  activeSocketIds: Set<string> | undefined
): string[] => {
  const usernames: string[] = [];

  // Iterate through the active socket IDs
  activeSocketIds?.forEach((socketId) => {
    // Find the corresponding user in the active users set
    const user = Array.from(activeUsers).find((u) => u.id === socketId);

    // If user is found, add their username to the array
    if (user) {
      usernames.push(user.username);
    }
  });

  return usernames;
};
