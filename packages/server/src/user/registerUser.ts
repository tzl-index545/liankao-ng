// src/user/registerUser.ts
import { prisma } from "../prisma";
import { UserPayload } from "../types/user";

const INITIAL_RATING = 1500;

export async function registerGhostUser(
  xsyusername: string,
  realname: string
)  : Promise<UserPayload>{
  const userData = await prisma.user.findUnique({
    where: { xsyusername },
  });

  if (userData) return userData;

  return prisma.user.create({
    data: {
      xsyusername,
      nickname: xsyusername,
      realname,
      rating: INITIAL_RATING,
    },
  });
}
