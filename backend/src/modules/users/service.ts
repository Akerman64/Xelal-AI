import { devStore, publicUser } from "../core/dev-store";

export class UsersError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const usersService = {
  listUsers() {
    return devStore.users.map(publicUser);
  },

  getUserById(id: string) {
    const user = devStore.users.find((candidate) => candidate.id === id);
    if (!user) {
      throw new UsersError("Utilisateur introuvable.");
    }

    return publicUser(user);
  },
};
