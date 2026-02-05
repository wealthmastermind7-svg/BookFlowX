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

export async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000), // Increased to 45s
    });
    
    if (!response.ok) {
      // Fallback for some sites that might block the standard fetch or return 403
      console.warn(`[Scraper] Initial fetch returned ${response.status}, trying simple fetch`);
      try {
        const fallbackRes = await fetch(url, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
          signal: AbortSignal.timeout(30000) 
        });
        if (fallbackRes.ok) return await fallbackRes.text();
      } catch (e) {
        console.error(`[Scraper] Fallback fetch failed:`, e);
      }
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.substring(0, 15000);
  } catch (error) {
    console.error('[Scraper] Error fetching website:', error);
    throw error;
  }
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
  "faqJson": "[{\"question\": \"...\", \"answer\": \"...\"}, ...]",
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
