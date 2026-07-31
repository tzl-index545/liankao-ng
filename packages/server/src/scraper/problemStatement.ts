import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { parseXsyPageUrl } from "./xsyUrl";

const MAX_STATEMENT_LENGTH = 2_000_000;

type StatementSection = {
  selector: string;
  title: string;
  sample?: boolean;
  required?: boolean;
};

const STATEMENT_SECTIONS: StatementSection[] = [
  { selector: "#description", title: "题目描述", required: true },
  { selector: "#input", title: "输入格式" },
  { selector: "#output", title: "输出格式" },
  { selector: "#sinput, #sampleinput", title: "样例输入", sample: true },
  { selector: "#soutput, #sampleoutput", title: "样例输出", sample: true },
  { selector: "#hint", title: "提示" },
];

function isLoginPage($: cheerio.CheerioAPI): boolean {
  const bodyText = $("body").text().replace(/\s+/g, " ");
  return (
    /Please\s+Login\s+first/i.test(bodyText) ||
    $("a[href*='loginpage.php']").filter((_, element) =>
      /login/i.test($(element).text()),
    ).length > 0 &&
      $("#description").length === 0
  );
}

function normalizeResourceUrl(
  rawUrl: string | undefined,
  sourceUrl: string,
  allowData: boolean,
): string | undefined {
  if (!rawUrl) return undefined;
  if (
    allowData &&
    /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(rawUrl)
  ) {
    return rawUrl;
  }

  try {
    const resolved = new URL(rawUrl, sourceUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return undefined;
    }
    return resolved.toString();
  } catch {
    return undefined;
  }
}

function sanitizeStatementHtml(html: string, sourceUrl: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "section",
      "font",
      "sub",
      "sup",
    ],
    allowedAttributes: {
      "*": ["class"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      font: ["color", "size"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => {
        const { href: _rawHref, ...safeAttributes } = attributes;
        const href = normalizeResourceUrl(attributes.href, sourceUrl, false);
        return {
          tagName,
          attribs: {
            ...safeAttributes,
            ...(href ? { href } : {}),
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
      img: (tagName, attributes) => {
        const { src: _rawSrc, ...safeAttributes } = attributes;
        const src = normalizeResourceUrl(attributes.src, sourceUrl, true);
        return {
          tagName,
          attribs: {
            ...safeAttributes,
            ...(src ? { src } : {}),
          },
        };
      },
    },
    exclusiveFilter(frame) {
      return frame.tag === "a" && !frame.attribs.href && !frame.text.trim();
    },
  });
}

function sectionContent(
  $: cheerio.CheerioAPI,
  section: StatementSection,
): string | null {
  let element = $(section.selector).first();
  if (!element.length) return null;

  if (section.sample && !element.is("pre")) {
    const parentPre = element.closest("pre");
    if (parentPre.length) element = parentPre;
  }

  const innerHtml = element.html()?.trim();
  if (!innerHtml) return null;
  return section.sample && !element.is("pre")
    ? `<pre>${innerHtml}</pre>`
    : element.is("pre")
      ? `<pre>${innerHtml}</pre>`
      : `<div>${innerHtml}</div>`;
}

export type ParsedProblemStatement = {
  description: string;
  statementHtml: string;
};

export function parseXsyProblemStatement(
  htmlDocument: string,
  sourceUrl: string,
): ParsedProblemStatement {
  const parsedUrl = parseXsyPageUrl(sourceUrl);
  if (parsedUrl.kind !== "problem") throw new Error("invalid XSY problem URL");
  if (!htmlDocument || htmlDocument.length > MAX_STATEMENT_LENGTH) {
    throw new Error("XSY problem statement has an invalid size");
  }

  const $ = cheerio.load(htmlDocument);
  if (isLoginPage($)) throw new Error("XSY session is invalid or expired");

  const descriptionElement = $("#description").first();
  if (!descriptionElement.length) {
    throw new Error("XSY problem page does not contain a statement");
  }

  const sections = STATEMENT_SECTIONS.flatMap((section) => {
    const content = sectionContent($, section);
    if (!content) {
      if (section.required) {
        throw new Error(`XSY problem page is missing ${section.selector}`);
      }
      return [];
    }
    return [
      `<section class="statement-section"><h2>${section.title}</h2>${content}</section>`,
    ];
  });

  const statementHtml = sanitizeStatementHtml(sections.join(""), sourceUrl).trim();
  if (!statementHtml) throw new Error("XSY problem statement is empty");

  const descriptionClone = descriptionElement.clone();
  descriptionClone.find("script, style").remove();
  const description = descriptionClone.text().replace(/\s+/g, " ").trim().slice(0, 240);
  return { description, statementHtml };
}
