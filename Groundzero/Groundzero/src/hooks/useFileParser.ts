import { useState } from 'react';

export function useFileParser() {
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseFile = async (file: File): Promise<string> => {
    setIsParsingFile(true);
    setParseError(null);

    try {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await parsePDF(file);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        return await parseDOCX(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await parseText(file);
      } else {
        throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      }
    } catch (error: any) {
      setParseError(error.message);
      throw error;
    } finally {
      setIsParsingFile(false);
    }
  };

  const parsePDF = async (file: File): Promise<string> => {
    // Dynamic import of pdfjs-dist to avoid top-level await issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use unpkg CDN which is more reliable for npm packages
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  };

  const parseDOCX = async (file: File): Promise<string> => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.default.extractRawText({ arrayBuffer });
    return result.value.trim();
  };

  const parseText = async (file: File): Promise<string> => {
    return await file.text();
  };

  return {
    parseFile,
    isParsingFile,
    parseError,
  };
}
