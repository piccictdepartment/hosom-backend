import { AppError } from "../../core/errors/AppError.js";
import { issueToken } from "../../core/security/jwt.js";
import { comparePassword, hashPassword } from "../../core/security/password.js";
import { userRepository } from "../users/user.repository.js";
import type { LoginInput, RegisterInput } from "./auth.types.js";

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      firstName: input.firstName,
      middleName: input.middleName,
      surname: input.surname,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
    });
    const token = await issueToken(user.id, user.role);
    return { user, token };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmailWithCredentials(input.email);
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }
    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    // Update loggedInAt timestamp
    const now = new Date();
    await userRepository.updateLoggedInAt(user.id, now);
    user.loggedInAt = now;

    const { passwordHash: _, ...safeUser } = user;
    const token = await issueToken(user.id, user.role);
    return { user: safeUser, token };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return user;
  },
};
