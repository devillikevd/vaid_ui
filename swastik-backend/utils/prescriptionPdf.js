/**
 * Prescription PDF Generator
 * Generates a clean, professional prescription PDF using PDFKit.
 * Returns a Buffer that can be uploaded to MinIO.
 */

let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {
  PDFDocument = null;
}

/**
 * L016: sanitize any value before it reaches PDFKit's text pipeline.
 * Strips C0 control characters (notably ESC \x1b, which can trigger PDFKit's
 * vulnerable postscript interpreter — CVE-2021-30490), removes non-printable
 * Unicode, collapses whitespace, and caps length to prevent runaway layouts.
 * @param {*} value
 * @param {number} maxLen
 * @returns {string}
 */
const sanitizeText = (value, maxLen = 200) => {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  text = text.replace(/[\u0080-\u009f]/g, ''); // C1 control chars
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLen);
};

const sanitizeMultiline = (value, maxLen = 2000) => {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  text = text.replace(/[\u0080-\u009f]/g, '');
  return text.trim().slice(0, maxLen);
};

/**
 * Generate a prescription PDF buffer.
 * @param {Object} prescription - Full prescription object with doctor, patient, medicines
 * @returns {Promise<Buffer>} PDF buffer ready for upload
 */
const generatePrescriptionPdf = async (prescription) => {
  if (!PDFDocument) {
    console.warn('[PrescriptionPDF] pdfkit not installed — skipping PDF generation');
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        compress: true,        // Enable PDF stream compression (zlib deflate)
        autoFirstPage: true,
        bufferPages: false,    // Stream pages instead of buffering all (memory-efficient)
        info: {
          Title: 'Prescription',
          Author: 'VAIDIDEA Healthcare',
          Creator: 'VAIDIDEA Healthcare Platform',
        },
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // 50px margins on each side

      // ==================== Header ====================
      doc.fontSize(20).font('Helvetica-Bold').text('VAIDIDEA HEALTHCARE', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Digital Prescription', { align: 'center' });
      doc.moveDown(0.5);

      // Divider line
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#10b981');
      doc.moveDown(0.5);

      // ==================== Prescription Info ====================
      const rxNumber = sanitizeText(prescription.prescription_number || 'N/A', 64) || 'N/A';
      const createdAt = prescription.created_at
        ? new Date(prescription.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : 'N/A';
      const validUntil = prescription.valid_until
        ? new Date(prescription.valid_until).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : 'N/A';

      doc.fontSize(10).font('Helvetica-Bold').text(`Rx: ${rxNumber}`, { continued: true });
      doc.font('Helvetica').text(`    Date: ${createdAt}    Valid until: ${validUntil}`, { align: 'right' });
      doc.moveDown(0.5);

      // ==================== Doctor Info ====================
      if (prescription.doctor) {
        doc.fontSize(11).font('Helvetica-Bold').text(`Dr. ${sanitizeText(prescription.doctor.name, 120) || 'Unknown'}`);
        if (prescription.doctor.specialization) {
          doc.fontSize(9).font('Helvetica').text(sanitizeText(prescription.doctor.specialization, 200));
        }
        doc.moveDown(0.3);
      }

      // ==================== Patient Info ====================
      if (prescription.patient) {
        doc.fontSize(10).font('Helvetica').text(`Patient: ${sanitizeText(prescription.patient.name, 120) || 'Unknown'}`, {
          continued: prescription.patient.phone ? true : false,
        });
        if (prescription.patient.phone) {
          doc.text(`    Phone: ${sanitizeText(prescription.patient.phone, 40)}`);
        }
        doc.moveDown(0.3);
      }

      // ==================== Diagnosis ====================
      if (prescription.diagnosis) {
        doc.fontSize(10).font('Helvetica-Bold').text('Diagnosis: ', { continued: true });
        doc.font('Helvetica').text(sanitizeText(prescription.diagnosis, 500));
        doc.moveDown(0.3);
      }

      // Divider
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#d1d5db');
      doc.moveDown(0.5);

      // ==================== Medicines Table ====================
      const medicines = prescription.prescription_medicines || prescription.medicines || [];

      if (medicines.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('℞ Medicines', { underline: true });
        doc.moveDown(0.3);

        medicines.forEach((med, index) => {
          const name = sanitizeText(med.medicine_name || med.medicineName, 120) || 'Unknown';
          const dosage = sanitizeText(med.dosage, 100);
          const frequency = sanitizeText(med.frequency, 100);
          const duration = sanitizeText(med.duration, 100);
          const qty = med.quantity ? `Qty: ${sanitizeText(med.quantity, 20)}` : '';
          const instructions = sanitizeMultiline(med.instructions, 500);
          const beforeFood = med.before_food ? '🍽 Before food' : '';
          const isCritical = med.is_critical ? '⚠️ CRITICAL' : '';

          doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${name}`, { continued: isCritical ? true : false });
          if (isCritical) {
            doc.font('Helvetica-Bold').fillColor('#dc2626').text(`  ${isCritical}`).fillColor('#000000');
          }

          const details = [dosage, frequency, duration, qty].filter(Boolean).join('  |  ');
          if (details) {
            doc.fontSize(9).font('Helvetica').text(`   ${details}`);
          }

          const extras = [instructions, beforeFood].filter(Boolean).join('  •  ');
          if (extras) {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280').text(`   ${extras}`).fillColor('#000000');
          }

          if (med.generic_name) {
            doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text(`   Generic: ${sanitizeText(med.generic_name, 120)}`).fillColor('#000000');
          }

          doc.moveDown(0.2);
        });
      }

      doc.moveDown(0.3);

      // ==================== Advice Sections ====================
      if (prescription.dietary_advice) {
        doc.fontSize(10).font('Helvetica-Bold').text('Dietary Advice:');
        doc.fontSize(9).font('Helvetica').text(sanitizeMultiline(prescription.dietary_advice, 2000));
        doc.moveDown(0.3);
      }

      if (prescription.lifestyle_advice) {
        doc.fontSize(10).font('Helvetica-Bold').text('Lifestyle Advice:');
        doc.fontSize(9).font('Helvetica').text(sanitizeMultiline(prescription.lifestyle_advice, 2000));
        doc.moveDown(0.3);
      }

      if (prescription.notes) {
        doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
        doc.fontSize(9).font('Helvetica').text(sanitizeMultiline(prescription.notes, 2000));
        doc.moveDown(0.3);
      }

      if (prescription.follow_up_date) {
        const followUp = new Date(prescription.follow_up_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        });
        doc.fontSize(10).font('Helvetica-Bold').text(`Follow-up: ${followUp}`);
        doc.moveDown(0.3);
      }

      // ==================== Footer ====================
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#d1d5db');
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text('This is a digitally generated prescription from VAIDIDEA Healthcare.', { align: 'center' })
        .text('Please verify with your doctor before use.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePrescriptionPdf };
