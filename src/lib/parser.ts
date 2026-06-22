import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';

export async function parseFileFromUrl(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from gateway: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();

  try {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: arrayBuffer });
      const result = await parser.getText();
      return result.text || '';
    } 
    
    const buffer = Buffer.from(arrayBuffer);
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType.includes('docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } 
    
    if (mimeType === 'text/csv' || mimeType.includes('csv')) {
      const csvContent = buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      return JSON.stringify(parsed.data);
    } 
    
    if (mimeType.startsWith('text/') || mimeType.includes('json')) {
      return buffer.toString('utf-8');
    }
  } catch (error) {
    console.error(`Error parsing file with mime type ${mimeType}:`, error);
    throw new Error(`Failed to extract text from file: ${(error as Error).message}`);
  }

  return '';
}

export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  if (!text) return [];
  
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    i += chunkSize - overlap;
    
    // Safety check to avoid infinite loops if chunkSize is <= overlap
    if (chunkSize <= overlap) {
      i += chunkSize;
    }
  }
  
  return chunks;
}
