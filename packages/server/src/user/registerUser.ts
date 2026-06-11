// src/user/registerUser.ts
import { prisma } from "../prisma";
import { getUserRealname, getUserXsyName } from "../scraper/getUserInfo";
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

export async function registerRealUser(unHashedPassword: string,nickname: string,xsytoken: string) : Promise<UserPayload>{
  let xsyusername=await getUserXsyName(xsytoken);
  // const password=await Bun.password.hash(unHashedPassword);
  // const userOldData=await prisma.user.findUnique({ where: { xsyusername } });
  // console.log(xsyusername)
// console.log(process.env.JWT_SECRET);
  // console.log(prisma.user.findUnique({ where: { xsyusername } }))
  const [password, userOldData] = await Promise.all([
    Bun.password.hash(unHashedPassword),
    prisma.user.findUnique({ where: { xsyusername } }),
  ]);
  const realName = await getUserRealname(xsytoken);
  if (userOldData) {
    if (userOldData.password)   throw new Error("User Exists!");
    const userData=await prisma.user.update({
      where: { xsyusername },
      data: {
        password,
        xsytoken,
        nickname,
        realname: realName,
      },
    });
    return {
        xsyusername: userData.xsyusername,
        nickname: userData.nickname,
        rating: userData.rating,
        id: userData.id
    };
    // return {xsyusername,nickname,}
  }

  const userData=await prisma.user.create({
    data: {
      xsyusername,
      nickname,
      password,
      xsytoken,
      realname: realName,
      rating: INITIAL_RATING,
    },
  });
  return {
        xsyusername: userData.xsyusername,
        nickname: userData.nickname,
        rating: userData.rating,
        id: userData.id
  };
}
