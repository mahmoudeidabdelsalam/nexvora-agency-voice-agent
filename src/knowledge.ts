/**
 * Site knowledge for the voice agent.
 *
 * Pulls the company, service and homepage content from the same WordPress
 * GraphQL endpoint that builds nexvoraagency.com, so the assistant answers from
 * what the website actually says. Results are cached in memory and refreshed in
 * the background; if WordPress is unreachable the last good copy (or a small
 * built-in fallback) is used so a session never fails because of it.
 */

export type ServiceEntry = {
  slug: string;
  title: string;
  summary: string;
  details: string;
};

export type Knowledge = {
  company: string;
  services: ServiceEntry[];
  source: "wordpress" | "stale-cache" | "fallback";
};

const SITE_URL = "https://nexvoraagency.com";
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const PROMPT_DETAIL_CHARS = 450;
const TOOL_DETAIL_CHARS = 3500;

const SERVICES_QUERY = /* GraphQL */ `
  query VoiceServices {
    allServices(first: 50, where: { orderby: { field: MENU_ORDER, order: ASC } }) {
      nodes {
        slug
        title
        content
        serviceFields {
          summary
          codeHtml
        }
      }
    }
  }
`;

const COMPANY_QUERY = /* GraphQL */ `
  query VoiceCompany {
    aboutPageSettings {
      aboutpageFields {
        aboutHeadline
        aboutSubText
        nameFounder
        titleFounder
        textFounder
        boxAbout {
          boxHeadline
          boxSubText
        }
      }
    }
    homepageSettings {
      homepageFields {
        heroHeading
        heroSubtext
        expertiseHeadline
        expertiseSubText
        solutions {
          valuee
          text
        }
        counters {
          valuee
          text
        }
        coreValues {
          valuee
          text
        }
      }
    }
  }
`;

// Used only when WordPress cannot be reached and nothing has been cached yet.
// Mirrors https://nexvoraagency.com/llms.txt.
const FALLBACK: Knowledge = {
  source: "fallback",
  company:
    "Nexvora is a technology solutions company based in Egypt. It designs, builds, and optimizes digital products, marketing systems, and business technology for organizations worldwide, with access to a talent pool in Egypt and the US.",
  services: [
    ["tech-talent", "Tech Talent", "Access to engineering talent in Egypt and the US to fit an organization's technology and business needs."],
    ["product-engineering", "Product Engineering", "Design and engineering of digital products."],
    ["web-development", "Web design & Development", "Websites and web applications, including CMS and PHP work."],
    ["page-speed-optimization", "Page Speed Optimization", "Improving website loading performance."],
    ["mobile-applications", "Mobile Applications", "Android and iOS applications."],
    ["wordpress-and-shopify", "WordPress and Shopify", "WordPress and Shopify websites and stores."],
    ["digital-marketing-advertising", "Digital Marketing", "Data-driven digital marketing and advertising."],
    ["brand-identity-graphic-design", "Brand Identity & Graphic Design", "Brand identity and graphic design."],
    ["it-infrastructure", "IT Infrastructure", "Cloud and IT infrastructure for performance, connectivity, security, and operations."],
    ["managed-hosting-services", "Managed Hosting Services", "Managed hosting."],
    ["cybersecurity-recovery-service", "Cybersecurity & Recovery Service", "Security, SSL, monitoring, and recovery."],
    ["ai-consultation", "AI Consultation", "AI consulting."],
  ].map(([slug, title, summary]) => ({ slug, title, summary, details: summary })),
};

type GraphQLResponse<T> = { data?: T; errors?: unknown[] };

async function wpQuery<T>(url: string, query: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`WordPress GraphQL returned ${response.status}`);
  const json = (await response.json()) as GraphQLResponse<T>;
  // WPGraphQL can return partial data alongside errors; only give up when there is none.
  if (!json.data) throw new Error(`WordPress GraphQL returned no data: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#8217;": "'",
  "&#8216;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&#8211;": "-",
  "&#8212;": "-",
  "&nbsp;": " ",
};

/** Reduce WordPress HTML to plain sentences the model can read. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|nbsp|#039|#8217|#8216|#8220|#8221|#8211|#8212);/g, (m) => NAMED_ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .replace(/(\.\s*){2,}/g, ". ")
    .trim();
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

type CompanyData = {
  aboutPageSettings?: {
    aboutpageFields?: {
      aboutHeadline?: string | null;
      aboutSubText?: string | null;
      nameFounder?: string | null;
      titleFounder?: string | null;
      textFounder?: string | null;
      boxAbout?: { boxHeadline?: string | null; boxSubText?: string | null }[] | null;
    } | null;
  } | null;
  homepageSettings?: {
    homepageFields?: {
      heroHeading?: string | null;
      heroSubtext?: string | null;
      expertiseHeadline?: string | null;
      expertiseSubText?: string | null;
      solutions?: { valuee?: string | null; text?: string | null }[] | null;
      counters?: { valuee?: string | null; text?: string | null }[] | null;
      coreValues?: { valuee?: string | null; text?: string | null }[] | null;
    } | null;
  } | null;
};

type ServicesData = {
  allServices?: {
    nodes?: {
      slug: string;
      title: string;
      content?: string | null;
      serviceFields?: { summary?: string | null; codeHtml?: string | null } | null;
    }[];
  } | null;
};

function buildCompany(data: CompanyData): string {
  const lines: string[] = [];
  const home = data.homepageSettings?.homepageFields;
  const about = data.aboutPageSettings?.aboutpageFields;
  const add = (label: string, value?: string | null) => {
    const text = htmlToText(value);
    if (text) lines.push(label ? `${label}: ${text}` : text);
  };
  add("", home?.heroHeading);
  add("", home?.heroSubtext);
  add("", home?.expertiseHeadline);
  add("", home?.expertiseSubText);
  add("About", about?.aboutHeadline);
  add("", about?.aboutSubText);
  for (const box of about?.boxAbout ?? []) {
    const title = htmlToText(box.boxHeadline);
    const body = htmlToText(box.boxSubText);
    if (title || body) lines.push([title, body].filter(Boolean).join(": "));
  }
  for (const item of home?.solutions ?? []) {
    const text = [htmlToText(item.valuee), htmlToText(item.text)].filter(Boolean).join(": ");
    if (text) lines.push(`Solution - ${text}`);
  }
  for (const item of home?.coreValues ?? []) {
    const text = [htmlToText(item.valuee), htmlToText(item.text)].filter(Boolean).join(": ");
    if (text) lines.push(`Core value - ${text}`);
  }
  for (const item of home?.counters ?? []) {
    const text = [htmlToText(item.valuee), htmlToText(item.text)].filter(Boolean).join(" ");
    if (text) lines.push(`Figure - ${text}`);
  }
  if (about?.nameFounder) {
    lines.push(
      `Founder: ${htmlToText(about.nameFounder)}${about.titleFounder ? `, ${htmlToText(about.titleFounder)}` : ""}. ${htmlToText(about.textFounder)}`.trim(),
    );
  }
  return lines.join("\n");
}

function buildServices(data: ServicesData): ServiceEntry[] {
  return (data.allServices?.nodes ?? []).map((node) => {
    const summary = htmlToText(node.serviceFields?.summary);
    const body = htmlToText(node.serviceFields?.codeHtml) || htmlToText(node.content);
    return {
      slug: node.slug,
      title: htmlToText(node.title) || node.slug,
      summary,
      details: clip([summary, body].filter(Boolean).join(" "), TOOL_DETAIL_CHARS),
    };
  });
}

let cache: { value: Knowledge; fetchedAt: number } | null = null;
let inflight: Promise<Knowledge> | null = null;

async function refresh(url: string): Promise<Knowledge> {
  // Fetched separately so a schema problem in one query does not lose the other.
  const [servicesResult, companyResult] = await Promise.allSettled([
    wpQuery<ServicesData>(url, SERVICES_QUERY),
    wpQuery<CompanyData>(url, COMPANY_QUERY),
  ]);

  if (servicesResult.status === "rejected") {
    console.warn("Nexvora knowledge: services query failed:", servicesResult.reason);
  }
  if (companyResult.status === "rejected") {
    console.warn("Nexvora knowledge: company query failed:", companyResult.reason);
  }

  const services = servicesResult.status === "fulfilled" ? buildServices(servicesResult.value) : [];
  const company = companyResult.status === "fulfilled" ? buildCompany(companyResult.value) : "";

  if (services.length === 0 && !company) {
    throw new Error("WordPress returned no usable content");
  }

  const value: Knowledge = {
    source: "wordpress",
    services: services.length > 0 ? services : FALLBACK.services,
    company: company || FALLBACK.company,
  };
  cache = { value, fetchedAt: Date.now() };
  return value;
}

export async function loadKnowledge(url: string | undefined): Promise<Knowledge> {
  if (!url) return cache?.value ?? FALLBACK;
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.value;

  inflight ??= refresh(url).finally(() => {
    inflight = null;
  });
  try {
    return await inflight;
  } catch (error) {
    console.error("Nexvora knowledge: refresh failed, using fallback data.", error);
    return cache ? { ...cache.value, source: "stale-cache" } : FALLBACK;
  }
}

/** Compact knowledge block appended to the system prompt at the start of a session. */
export function buildKnowledgeBlock(knowledge: Knowledge): string {
  const services = knowledge.services
    .map((s) => {
      const text = s.summary || clip(s.details, PROMPT_DETAIL_CHARS);
      return `- ${s.title} (${s.slug}): ${text}`;
    })
    .join("\n");
  return [
    "COMPANY KNOWLEDGE (taken from the Nexvora website; this is your only source of facts):",
    knowledge.company,
    "",
    "SERVICES:",
    services,
    "",
    `Website: ${SITE_URL}. Contact page: ${SITE_URL}/contact-us/.`,
  ].join("\n");
}

/** Looks a service up by slug or by (partial) title; returns null when nothing matches. */
export function findService(knowledge: Knowledge, query: string): ServiceEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    knowledge.services.find((s) => s.slug.toLowerCase() === q) ??
    knowledge.services.find((s) => s.title.toLowerCase() === q) ??
    knowledge.services.find((s) => s.title.toLowerCase().includes(q) || q.includes(s.title.toLowerCase())) ??
    knowledge.services.find((s) => s.slug.toLowerCase().includes(q.replace(/\s+/g, "-"))) ??
    null
  );
}
