import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PageFormat } from '../types';

export interface PdfExportOptions {
  filename?: string;
  format?: PageFormat;
  onProgress?: (step: string, percent: number) => void;
}

export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'documento.pdf',
    format = 'a4',
    onProgress,
  } = options;

  onProgress?.('Preparando documento...', 10);

  // Dimensions in mm
  const pageSize = format === 'letter' ? { width: 215.9, height: 279.4 } : { width: 210, height: 297 };
  const marginMm = 12; // 12mm page margin
  const contentWidthMm = pageSize.width - marginMm * 2;
  const contentHeightMm = pageSize.height - marginMm * 2;

  // Clone or capture target element
  onProgress?.('Renderizando lienzo en alta definición...', 30);

  const canvas = await html2canvas(element, {
    scale: 2, // High resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  onProgress?.('Generando páginas de PDF...', 65);

  const imgData = canvas.toDataURL('image/png');
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // Calculate rendered height in PDF mm based on target contentWidthMm
  const renderedTotalHeightMm = (imgHeightPx * contentWidthMm) / imgWidthPx;

  // Initialize jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: format === 'letter' ? 'letter' : 'a4',
  });

  let heightLeftMm = renderedTotalHeightMm;
  let positionMm = marginMm;
  let page = 1;

  // First page
  pdf.addImage(
    imgData,
    'PNG',
    marginMm,
    positionMm,
    contentWidthMm,
    renderedTotalHeightMm,
    undefined,
    'FAST'
  );
  heightLeftMm -= contentHeightMm;

  // Additional pages if needed
  while (heightLeftMm > 0) {
    onProgress?.(`Procesando página ${page + 1}...`, Math.min(90, 65 + page * 10));
    positionMm = marginMm - page * contentHeightMm;
    pdf.addPage();
    pdf.addImage(
      imgData,
      'PNG',
      marginMm,
      positionMm,
      contentWidthMm,
      renderedTotalHeightMm,
      undefined,
      'FAST'
    );
    heightLeftMm -= contentHeightMm;
    page++;
  }

  onProgress?.('Finalizando descarga local...', 98);
  pdf.save(filename);
}

export function printDocumentDirectly(iframeRef?: HTMLIFrameElement | null) {
  if (iframeRef && iframeRef.contentWindow) {
    iframeRef.contentWindow.focus();
    iframeRef.contentWindow.print();
  } else {
    window.print();
  }
}
