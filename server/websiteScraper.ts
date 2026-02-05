import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ScrapedBusinessInfo {
  aboutBusiness: string;
  servicesDescription: string;
  hoursOfOperation: string;
  locationInfo: string;
  faqJson: string;
  additionalInfo: string;
}

export interface CrawledPage {
  title: string;
  content: string;
  sourceUrl: string;
  contentLength: number;
}

// Extract text from HTML, stripping scripts, styles, nav, footer, etc.
export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50000);
}

// Extract internal links from HTML for multi-page crawling
export function extractInternalLinks(html: string, baseUrl: string): string[] {
  try {
    const urlObj = new URL(baseUrl);
    const domain = urlObj.origin;
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      if (href.startsWith('/')) href = domain + href;
      else if (!href.startsWith('http')) href = domain + '/' + href;
      
      try {
        const linkUrl = new URL(href);
        if (linkUrl.origin === domain && !links.includes(linkUrl.href)) {
          links.push(linkUrl.href.split('#')[0].split('?')[0]);
        }
      } catch {}
    }
    return [...new Set(links)];
  } catch {
    return [];
  }
}

// Fetch a single page with proper headers
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      console.warn(`[Scraper] Fetch returned ${response.status} for ${url}`);
      // Try mobile user agent as fallback
      const fallbackRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
        signal: AbortSignal.timeout(20000),
      });
      if (fallbackRes.ok) return await fallbackRes.text();
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`[Scraper] Error fetching ${url}:`, error);
    return null;
  }
}

// Multi-page crawl function
export async function crawlWebsite(url: string, maxPages: number = 10): Promise<CrawledPage[]> {
  const crawledUrls = new Set<string>();
  const urlsToCrawl = [url];
  const results: CrawledPage[] = [];
  const pageLimit = Math.min(maxPages, 50);
  
  console.log(`[Scraper] Starting multi-page crawl from: ${url} (max ${pageLimit} pages)`);
  
  while (urlsToCrawl.length > 0 && crawledUrls.size < pageLimit) {
    const currentUrl = urlsToCrawl.shift()!;
    if (crawledUrls.has(currentUrl)) continue;
    crawledUrls.add(currentUrl);
    
    try {
      console.log(`[Scraper] Crawling page ${crawledUrls.size}/${pageLimit}: ${currentUrl}`);
      
      const html = await fetchPage(currentUrl);
      if (!html) continue;
      
      const textContent = extractTextFromHtml(html);
      if (textContent.length < 100) continue;
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : currentUrl;
      
      results.push({
        title,
        content: textContent,
        sourceUrl: currentUrl,
        contentLength: textContent.length,
      });
      
      // Extract and queue internal links
      if (crawledUrls.size < pageLimit) {
        const newLinks = extractInternalLinks(html, currentUrl);
        for (const link of newLinks) {
          if (!crawledUrls.has(link) && !urlsToCrawl.includes(link)) {
            urlsToCrawl.push(link);
          }
        }
      }
    } catch (err) {
      console.log(`[Scraper] Failed to crawl ${currentUrl}:`, err);
    }
  }
  
  console.log(`[Scraper] Crawl complete: ${results.length} pages saved`);
  return results;
}

// Legacy single-page scrape for backward compatibility
export async function scrapeWebsiteContent(url: string): Promise<string> {
  const html = await fetchPage(url);
  if (!html) throw new Error(`Failed to fetch: unable to reach ${url}`);
  return extractTextFromHtml(html);
}

export async function extractBusinessInfo(websiteContent: string, businessName: string): Promise<ScrapedBusinessInfo> {
  const systemPrompt = `You are an expert at extracting business information from website content.
Given raw text content from a business website, extract and structure the following information:

1. About the Business: A clear summary of what the business does, their mission, values, and unique selling points
2. Services Description: Detailed list of services offered, including any pricing or duration information mentioned
3. Hours of Operation: Business hours, days open, any seasonal variations
4. Location Info: Address, service area, parking info, directions
5. FAQs: Common questions and answers about the business
6. Additional Info: Any other relevant details like payment methods, policies, team info

Be thorough but concise. If information is not available, make reasonable inferences based on the business type.
For FAQs, generate 3-5 helpful Q&As based on the content and business type.`;

  const userPrompt = `Business Name: ${businessName}

Website Content:
${websiteContent}

Extract the business information and respond with a JSON object:
{
  "aboutBusiness": "A comprehensive summary of the business...",
  "servicesDescription": "List of services with details...",
  "hoursOfOperation": "Business hours info or 'Not specified - please update'",
  "locationInfo": "Address and location details...",
  "faqJson": "[{\\"question\\": \\"...\\", \\"answer\\": \\"...\\"}, ...]",
  "additionalInfo": "Other relevant details..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      aboutBusiness: parsed.aboutBusiness || "",
      servicesDescription: parsed.servicesDescription || "",
      hoursOfOperation: parsed.hoursOfOperation || "",
      locationInfo: parsed.locationInfo || "",
      faqJson: typeof parsed.faqJson === 'string' ? parsed.faqJson : JSON.stringify(parsed.faqJson || []),
      additionalInfo: parsed.additionalInfo || "",
    };
  } catch (error) {
    console.error('[Scraper] Error extracting business info:', error);
    throw error;
  }
}

export async function scrapeAndExtract(url: string, businessName: string): Promise<ScrapedBusinessInfo> {
  console.log(`[Scraper] Starting scrape for ${businessName} from ${url}`);
  
  const content = await scrapeWebsiteContent(url);
  console.log(`[Scraper] Fetched ${content.length} chars of content`);
  
  const info = await extractBusinessInfo(content, businessName);
  console.log(`[Scraper] Extracted business info successfully`);
  
  return info;
}
