import PDFDocument from 'pdfkit';

export interface CertificateData {
  documentTitle: string;
  residentName: string;
  address: string;
  purpose: string;
  issuedAt: Date;
  requestId: string;
  chairmanName: string;
}

/** Renders a simple official-looking certificate PDF and resolves to its bytes. */
export function renderCertificate(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 64 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const issued = data.issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.fontSize(11).fillColor('#444').text('Republic of the Philippines', { align: 'center' });
    doc.text('City of Manila · Zone 58, District VI', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(20).fillColor('#1E3A5F').font('Helvetica-Bold').text('BARANGAY 591', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('OFFICE OF THE PUNONG BARANGAY', { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(18).fillColor('#000').font('Helvetica-Bold').text(data.documentTitle.toUpperCase(), { align: 'center', underline: true });
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica').fillColor('#000');
    doc.text('TO WHOM IT MAY CONCERN:', { align: 'left' });
    doc.moveDown(1);
    doc.text(
      `This is to certify that ${data.residentName}, a resident of ${data.address}, Barangay 591, Zone 58, District VI, City of Manila, is known to this office and has requested this document for the following purpose: ${data.purpose}.`,
      { align: 'justify', lineGap: 4 },
    );
    doc.moveDown(1);
    doc.text(`Issued this ${issued} at the Barangay 591 Hall, City of Manila.`, { align: 'justify', lineGap: 4 });

    doc.moveDown(4);
    doc.font('Helvetica-Bold').text(data.chairmanName.toUpperCase(), 320, doc.y, { align: 'left' });
    doc.font('Helvetica').fontSize(10).fillColor('#555').text('Punong Barangay', 320, doc.y, { align: 'left' });

    doc.moveDown(4);
    doc
      .fontSize(8)
      .fillColor('#999')
      .text(
        `Document ID: ${data.requestId} · Generated electronically by the Barangay 591 e-Services Portal. Valid without signature when verified against the portal's audit log.`,
        64,
        doc.page.height - 110,
        { align: 'center', width: doc.page.width - 128 },
      );

    doc.end();
  });
}
