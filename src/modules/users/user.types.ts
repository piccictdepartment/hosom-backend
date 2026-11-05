export interface CreateUserInput {
  name: string;
  email: string;
}

export type UpdateUserInput = Partial<CreateUserInput>;

export interface ListUsersInput {
  page: number;
  limit: number;
}
