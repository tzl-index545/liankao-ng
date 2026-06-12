import axios from "axios";
import { fetchXsyHtmlViaFetcher } from "./xsyFetcher";

function isValidPhpSessionId(id: string): boolean {
  return /^[-,a-zA-Z0-9]{1,128}$/.test(id);
}

export async function fetchHtml(url: string,phpSessionId: string): Promise<string> {
  if (!url || !isValidPhpSessionId(phpSessionId)) throw new Error('invalid arguments on fetchHtml');  // assert(0)
  const fetcherHtml = await fetchXsyHtmlViaFetcher(url, phpSessionId);
  if (fetcherHtml !== null) return fetcherHtml;

  const res = await axios.get(url, {
    timeout: 15000,
    responseType: "text",
    maxRedirects: 0,
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    },
  });
  return typeof res.data === "string" ? res.data : String(res.data ?? "");
}
