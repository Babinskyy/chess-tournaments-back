import { users } from './onConnection';

export const userReconnect = (username: string, socketid: string) => {
    const existingUser = Array.from(users).find(
      (user) => user.username === username
    );

    if (existingUser) {
      const updatedUsers = new Set(
        Array.from(users).map((user) =>
          user.username === username ? existingUser : user
        )
      );
      updatedUsers.delete(existingUser)
      updatedUsers.add({id: socketid, username: username})

      users.clear();
      updatedUsers.forEach((user) => users.add(user));

      console.log(users);
    }
  }