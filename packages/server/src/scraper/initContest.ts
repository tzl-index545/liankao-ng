import * as cheerio from "cheerio";
import { fetchHtml } from "./fetch"; 
import { prisma } from "../prisma";
import { syncLeaderboardByToken } from "./updateLeaderboard";


/**
 * 同步比赛信息：如果 ID 已存在则跳过，否则新建比赛和题目
 * @param url 比赛详情页 URL
 * @param phpSessionId PHP 登录凭证
 * @param contestId 比赛的唯一 ID
 */
export async function syncContestInfo(phpSessionId: string, contestId: number) {
  const url = "http://xsy.gdgzez.com.cn/JudgeOnline/contest.php?cid="+contestId;
  // 1. 检查比赛是否已经存在
  const existingContest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true }
  });

  if (existingContest) {
    console.log(`[Contest ${contestId}] 已经存在，跳过抓取。`);
    return;
  }

  // 2. 获取并解析 HTML
  const htmlDocument = await fetchHtml(url, phpSessionId);
  const $ = cheerio.load(htmlDocument);

  // 提取并清理比赛名称 (去除 "ContestXXXX - " 前缀)
  const rawContestName = $("#main > center > div > font:nth-child(1)").text().trim();
  const contestName = rawContestName.split("-").pop()?.trim() || rawContestName;

  // 提取时间
  const startTimeStr = $("font[size=\"4px\"] > font[color=\"#993399\"]:first-of-type").text().trim();
  const endTimeStr = $("font[size=\"4px\"] > font[color=\"#993399\"]:nth-of-type(2)").text().trim();
  const parseDate = (s: string) => new Date(s.replace(" ", "T") + "+08:00");

  // 提取描述 (基于你的选择器：第一道题目的最后一列)
  const description = $("#problemset > tbody > tr:nth-child(1) > td:nth-child(4) > center").text().trim();

  // 提取所有题目名称
  const problemNames: string[] = [];
  $("#problemset > tbody > tr").each((_, el) => {
    const name = $(el).find("td:nth-child(3) > center > a").text().trim();
    if (name) problemNames.push(name);
  });

  if (problemNames.length === 0) {
    throw new Error(`Contest ${contestId} has no crawlable problems, contest will not be created.`);
  }

  // 3. 执行数据库写入事务
  await prisma.$transaction(async (tx) => {
    // 创建比赛
    const contest = await tx.contest.create({
      data: {
        id: contestId,
        name: contestName,
        description: description,
        startTime: parseDate(startTimeStr),
        endTime: parseDate(endTimeStr),
      }
    });

    // 依次创建题目并关联
    for (let i = 0; i < problemNames.length; i++) {
      // 永远创建新题目 (即便重名也是新 ID)
      const newProblem = await tx.problem.create({
        data: {
          name: problemNames[i],
          description: `Description for ${problemNames[i]}`, 
        }
      });

      // 建立中间表关联
      await tx.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: newProblem.id,
          order: i + 1,
          point: 100
        }
      });
    }
  });
  await syncLeaderboardByToken(phpSessionId,contestId);
  console.log(`✨ 成功创建比赛 [ID: ${contestId}] 及 ${problemNames.length} 道新题目。`);
}