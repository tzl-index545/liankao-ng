import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch';  

export type XsyUserProfile = {
    xsyusername: string;
    realname: string;
};

function parseUserProfile(webInfo: string): XsyUserProfile {
    const nameSelector = '#wrapper > div.form-container > form > div:nth-child(5) > p:nth-child(3)';
    const usernameSelector = '#wrapper > div.form-container > form > div:nth-child(4) > p';
    const $ = cheerio.load(webInfo);
    const xsyusername=$(usernameSelector).text().trim();
    const realname=$(nameSelector).text().trim();
    if(xsyusername.length == 0 || realname.length == 0)    throw Error("Failed to get name");
    return { xsyusername, realname };
}

export async function getUserProfile(xstoken: string): Promise<XsyUserProfile> {
    const webInfo=await fetchHtml("http://xsy.gdgzez.com.cn/JudgeOnline/modifypage.php",xstoken);
    return parseUserProfile(webInfo);
}

export async function getUserInfo(xstoken: string): Promise<XsyUserProfile> {
    return getUserProfile(xstoken);
}

export async function getUserRealname(xstoken: string){
    const { realname } = await getUserProfile(xstoken);
    return realname;
}

export async function getUserXsyName(xstoken: string){
    const { xsyusername } = await getUserProfile(xstoken);
    return xsyusername;
}
