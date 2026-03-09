import { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ExportStoryboardsProps {
  storyboards: any[];
  sceneName: string;
  projectName?: string;
}

export function ExportStoryboards({ storyboards, sceneName, projectName }: ExportStoryboardsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (!storyboards.length) {
      toast.error('No storyboards to export');
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = (pageWidth - margin * 3) / 2;
      const imageHeight = imageWidth * (9 / 16);

      // Title page
      pdf.setFontSize(24);
      pdf.text(projectName || 'Storyboards', pageWidth / 2, 40, { align: 'center' });
      pdf.setFontSize(16);
      pdf.text(sceneName, pageWidth / 2, 55, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`${storyboards.length} frames`, pageWidth / 2, 70, { align: 'center' });
      pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 80, { align: 'center' });

      // Storyboard frames - 2 per row
      let currentPage = 1;
      for (let i = 0; i < storyboards.length; i += 4) {
        pdf.addPage();
        currentPage++;

        const framesBatch = storyboards.slice(i, i + 4);
        
        for (let j = 0; j < framesBatch.length; j++) {
          const frame = framesBatch[j];
          const col = j % 2;
          const row = Math.floor(j / 2);
          const x = margin + col * (imageWidth + margin);
          const y = margin + row * (imageHeight + 25);

          // Frame border
          pdf.setDrawColor(200);
          pdf.rect(x, y, imageWidth, imageHeight);

          // Load and add image
          if (frame.image_url) {
            try {
              const img = await loadImage(frame.image_url);
              pdf.addImage(img, 'JPEG', x, y, imageWidth, imageHeight);
            } catch (e) {
              pdf.setFillColor(240, 240, 240);
              pdf.rect(x, y, imageWidth, imageHeight, 'F');
              pdf.setFontSize(10);
              pdf.text('Image unavailable', x + imageWidth / 2, y + imageHeight / 2, { align: 'center' });
            }
          }

          // Shot info below image
          pdf.setFontSize(10);
          pdf.setTextColor(0);
          pdf.text(`Shot ${frame.shot_number}`, x, y + imageHeight + 5);
          
          if (frame.action) {
            pdf.setFontSize(8);
            pdf.setTextColor(100);
            const actionText = frame.action.substring(0, 80) + (frame.action.length > 80 ? '...' : '');
            pdf.text(actionText, x, y + imageHeight + 10, { maxWidth: imageWidth });
          }
        }

        // Page number
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }

      pdf.save(`${sceneName.replace(/[^a-z0-9]/gi, '_')}_storyboards.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsImages = async () => {
    if (!storyboards.length) {
      toast.error('No storyboards to export');
      return;
    }

    setIsExporting(true);
    try {
      for (let i = 0; i < storyboards.length; i++) {
        const frame = storyboards[i];
        if (frame.image_url) {
          const downloadLink = document.createElement('a');
          
          if (frame.image_url.startsWith('data:')) {
            downloadLink.href = frame.image_url;
          } else {
            try {
              const response = await fetch(frame.image_url);
              const blob = await response.blob();
              downloadLink.href = window.URL.createObjectURL(blob);
            } catch (e) {
              console.error('Failed to fetch image:', e);
              continue;
            }
          }
          
          downloadLink.download = `${sceneName.replace(/[^a-z0-9]/gi, '_')}_shot_${String(frame.shot_number)}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          if (!frame.image_url.startsWith('data:')) {
            window.URL.revokeObjectURL(downloadLink.href);
          }
          
          await new Promise(r => setTimeout(r, 200));
        }
      }
      toast.success(`Downloaded ${storyboards.length} images`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export images');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting || !storyboards.length}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF} className="gap-2">
          <FileText className="w-4 h-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsImages} className="gap-2">
          <FileImage className="w-4 h-4" />
          Download Images
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to load image as base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}
