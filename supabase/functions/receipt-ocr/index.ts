// supabase/functions/receipt-ocr/index.ts


// Import the OCR tool
import { PaddleOcrService } from "https://deno.land/x/ppu_paddle_ocr/mod.ts";

// This function runs every time someone uploads a receipt
Deno.serve(async (req) => {
  // Step 1: Get the image URL from the request
  const { imageUrl } = await req.json();
  
  try {
    console.log("Starting to read receipt...");
    
    // Step 2: Download the image from storage
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Step 3: Use OCR to read text from the image
    const ocrService = new PaddleOcrService();
    await ocrService.initialize();
    
    console.log("Reading text from image...");
    const ocrResult = await ocrService.recognize(imageBuffer);
    
    // The OCR gives us raw text, like:
    // "WALMART\n123 Main St\nDate: 01/15/2024\nTotal: $42.99\n..."
    const rawText = ocrResult.text;
    console.log("Raw text extracted:", rawText);
    
    // Step 4: Use AI to understand the text and extract information
    const extractedData = await understandReceiptText(rawText);
    
    // Step 5: Clean up
    await ocrService.destroy();
    
    // Step 6: Send back the structured information
    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    // If anything goes wrong, tell the user
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to read receipt. Please try again."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// This function understand the receipt text
async function understandReceiptText(text: string) {
  // Simple pattern matching (no API key needed)
  
  // Look for common patterns in the text
  const merchant = extractMerchant(text);
  const date = extractDate(text);
  const total = extractTotal(text);
  
  return {
    merchant,
    date,
    total,
    items: extractItems(text)
  };
}

// Helper functions for extracting information
function extractMerchant(text: string): string {
  // Common patterns for merchant names
  const lines = text.split('\n');
  // Usually the first line is the store name
  return lines[0]?.trim() || "Unknown Store";
}

function extractDate(text: string): string {
  // Look for patterns like MM/DD/YYYY or YYYY-MM-DD
  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
  const match = text.match(datePattern);
  return match ? match[0] : "Date not found";
}

function extractTotal(text: string): number {
  // Look for patterns like $XX.XX or Total: XX.XX
  const totalPattern = /\$\s*\d+\.\d{2}/;
  const match = text.match(totalPattern);
  if (match) {
    // Remove the $ sign and convert to number
    return parseFloat(match[0].replace('$', ''));
  }
  return 0;
}

function extractItems(text: string): Array<{name: string, price: number}> {
  // This is simplified - real implementation would be more complex
  const items = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for lines that have a price at the end
    const priceMatch = line.match(/\$\s*\d+\.\d{2}$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[0].replace('$', ''));
      const name = line.replace(priceMatch[0], '').trim();
      items.push({ name, price });
    }
  }
  
  return items;
}