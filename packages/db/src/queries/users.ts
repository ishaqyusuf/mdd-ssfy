import { Db } from "..";

export async function getUsersById(
  db: Db,
  ids: number[],
): Promise<
  {
    id: number;
    role?: string;
    fullName?: string;
    email: string;
  }[]
> {
  return [];
}
