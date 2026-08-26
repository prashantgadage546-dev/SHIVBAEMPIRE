// =============================================================
// SHIVBAEMPIRE — Receipt Controller (View, Verify, PDF)
// =============================================================
const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { formatCurrency, amountToWords } = require('../utils/amountToWords');

/**
 * GET /api/receipts
 */
const getReceipts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, event_id = '', donor_id = '', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['r.is_cancelled = 0'];
    let params = [];

    if (req.user.role === 'COLLECTOR') {
      conditions.push('r.collector_id = ?');
      params.push(req.user.id);
    }
    if (event_id) { conditions.push('r.event_id = ?'); params.push(parseInt(event_id)); }
    if (donor_id) { conditions.push('r.donor_id = ?'); params.push(parseInt(donor_id)); }
    if (search) {
      conditions.push('(r.receipt_number LIKE ? OR d.full_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM receipts r LEFT JOIN donors d ON r.donor_id = d.id ${where}`,
      params
    );

    const [receipts] = await pool.execute(
      `SELECT r.*, d.full_name as donor_name, d.mobile as donor_mobile, d.village_name,
              u.full_name as collector_name, e.name as event_name
       FROM receipts r
       LEFT JOIN donors d ON r.donor_id = d.id
       LEFT JOIN users u ON r.collector_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const totalRecords = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? receipts.length;
    res.json({
      success: true,
      data: receipts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: totalRecords, pages: Math.ceil(totalRecords / parseInt(limit)) || 1 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/receipts/:id
 */
const getReceiptById = async (req, res, next) => {
  try {
    const [receipts] = await pool.execute(
      `SELECT r.*, d.full_name as donor_name, d.mobile as donor_mobile,
              d.village_name, d.address, d.email as donor_email,
              u.full_name as collector_name, e.name as event_name, e.location as event_location
       FROM receipts r
       LEFT JOIN donors d ON r.donor_id = d.id
       LEFT JOIN users u ON r.collector_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    res.json({ success: true, data: receipts[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/receipts/verify/:receiptNumber — Public
 */
const verifyReceipt = async (req, res, next) => {
  try {
    const [receipts] = await pool.execute(
      `SELECT r.receipt_number, r.amount, r.payment_mode, r.collection_date, r.is_cancelled,
              d.full_name as donor_name, d.mobile as donor_mobile, d.village_name,
              e.name as event_name, u.full_name as collector_name
       FROM receipts r
       LEFT JOIN donors d ON r.donor_id = d.id
       LEFT JOIN events e ON r.event_id = e.id
       LEFT JOIN users u ON r.collector_id = u.id
       WHERE r.receipt_number = ?`,
      [req.params.receiptNumber]
    );

    if (receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found. This receipt number is invalid.' });
    }

    const receipt = receipts[0];

    res.json({
      success: true,
      data: {
        receiptNumber: receipt.receipt_number,
        donorName: receipt.donor_name,
        donorMobile: receipt.donor_mobile,
        village: receipt.village_name,
        amount: receipt.amount,
        paymentMode: receipt.payment_mode,
        collectionDate: receipt.collection_date,
        eventName: receipt.event_name,
        collectorName: receipt.collector_name,
        isCancelled: receipt.is_cancelled === 1,
        isValid: receipt.is_cancelled === 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/receipts/:id/pdf — Generate PDF
 */
const downloadReceiptPdf = async (req, res, next) => {
  try {
    const [receipts] = await pool.execute(
      `SELECT r.*, d.full_name as donor_name, d.mobile as donor_mobile,
              d.village_name, d.address, d.email as donor_email,
              u.full_name as collector_name, e.name as event_name, e.location as event_location
       FROM receipts r
       LEFT JOIN donors d ON r.donor_id = d.id
       LEFT JOIN users u ON r.collector_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const receipt = receipts[0];
    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receipt_number}.pdf`);
    doc.pipe(res);

    const W = doc.page.width;   // 595
    const H = doc.page.height;  // 842

    // ── COLORS ───────────────────────────────────────────────
    const saffron   = '#FF6B00';
    const darkBlue  = '#1A237E';
    const gold      = '#F9A825';
    const lightGray = '#F5F5F5';
    const midGray   = '#E0E0E0';
    const textDark  = '#212121';
    const textGray  = '#616161';
    const white     = '#FFFFFF';

    // ── HEADER BACKGROUND ────────────────────────────────────
    // Saffron gradient-like header
    doc.rect(0, 0, W, 130).fill(saffron);
    // Gold accent strip at bottom of header
    doc.rect(0, 122, W, 8).fill(gold);

    // Org name
    doc.font('Helvetica-Bold').fontSize(24).fillColor(white)
      .text('SHIVBAEMPIRE', 0, 22, { align: 'center', width: W });

    doc.font('Helvetica').fontSize(11).fillColor(white)
      .text('Shivba Tarun Mitra Mandal', 0, 52, { align: 'center', width: W });

    doc.font('Helvetica').fontSize(9).fillColor('#FFE0B2')
      .text('Mandal Management Platform', 0, 69, { align: 'center', width: W });

    // ── RECEIPT TITLE BANNER ─────────────────────────────────
    doc.rect(0, 130, W, 44).fill(darkBlue);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(white)
      .text('DONATION RECEIPT', 0, 144, { align: 'center', width: W });

    // ── RECEIPT NO BOX (top-right) ───────────────────────────
    doc.roundedRect(W - 195, 180, 175, 52, 6)
       .lineWidth(1.5).strokeColor(saffron).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(textGray)
      .text('Receipt No.', W - 190, 186);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(darkBlue)
      .text(receipt.receipt_number, W - 190, 200);

    // Event badge
    doc.roundedRect(30, 185, W - 250, 40, 5).fill(lightGray);
    doc.font('Helvetica').fontSize(8).fillColor(textGray).text('Event', 42, 190);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkBlue)
      .text(receipt.event_name || 'N/A', 42, 202);

    // ── DIVIDER ──────────────────────────────────────────────
    let y = 248;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 14;

    // ── DONOR SECTION TITLE ──────────────────────────────────
    doc.rect(30, y, W - 60, 22).fill(darkBlue);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(white)
      .text('  DONOR INFORMATION', 30, y + 6);
    y += 30;

    // Helper functions
    const fieldLabel = (label, x, fy) => {
      doc.font('Helvetica').fontSize(8).fillColor(textGray).text(label, x, fy);
    };
    const fieldValue = (value, x, fy, opts = {}) => {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark)
        .text(String(value || '—'), x, fy + 11, opts);
    };

    // Row 1 — Name (full width)
    fieldLabel('Donor Name', 30, y);
    fieldValue(receipt.donor_name, 30, y, { width: W - 60 });
    y += 36;

    // Row 2 — Mobile | Village
    fieldLabel('Mobile Number', 30, y);
    fieldLabel('Village', W / 2 + 10, y);
    fieldValue(receipt.donor_mobile || '—', 30, y);
    fieldValue(receipt.village_name || '—', W / 2 + 10, y);
    y += 36;

    if (receipt.address) {
      fieldLabel('Address', 30, y);
      fieldValue(receipt.address, 30, y, { width: W - 60 });
      y += 36;
    }

    y += 2;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 14;

    // ── AMOUNT SECTION ───────────────────────────────────────
    doc.rect(30, y, W - 60, 76).fill('#FFF8E1');
    doc.rect(30, y, 6, 76).fill(gold);

    doc.font('Helvetica').fontSize(9).fillColor(textGray)
      .text('Amount Received', 48, y + 8);

    const amtStr = `RS. ${parseFloat(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    doc.font('Helvetica-Bold').fontSize(26).fillColor(saffron)
      .text(amtStr, 48, y + 20);

    doc.font('Helvetica').fontSize(9).fillColor(textGray)
      .text(`In Words: `, 48, y + 56, { continued: true });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark)
      .text(receipt.amount_in_words || amountToWords(receipt.amount), { width: W - 100 });

    y += 92;

    // ── PAYMENT DETAILS ──────────────────────────────────────
    doc.rect(30, y, W - 60, 22).fill(darkBlue);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(white)
      .text('  PAYMENT DETAILS', 30, y + 6);
    y += 30;

    // Row — Mode | Date | Collector
    const colW = (W - 60) / 3;
    fieldLabel('Payment Mode', 30, y);
    fieldLabel('Collection Date', 30 + colW, y);
    fieldLabel('Collector', 30 + colW * 2, y);

    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(darkBlue)
      .text((receipt.payment_mode || '—').replace('_', ' '), 30, y + 11);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark)
      .text(new Date(receipt.collection_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 30 + colW, y + 11);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark)
      .text(receipt.collector_name || '—', 30 + colW * 2, y + 11, { width: colW - 10 });
    y += 42;

    if (receipt.transaction_id) {
      fieldLabel('Transaction ID / Ref', 30, y);
      fieldValue(receipt.transaction_id, 30, y);
      y += 36;
    }

    y += 4;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 20;

    // ── SIGNATURE + QR ───────────────────────────────────────
    const sigX = 30;
    const qrX  = W - 140;
    const bottomY = y;

    // QR Code
    if (receipt.qr_code_data) {
      try {
        const qrBase64 = receipt.qr_code_data.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, qrX, bottomY, { width: 90, height: 90 });
        doc.font('Helvetica').fontSize(7).fillColor(textGray)
          .text('Scan to Verify', qrX, bottomY + 93, { width: 90, align: 'center' });
      } catch {}
    }

    // Digital Signature
    const path = require('path');
    const sigPath = path.join(__dirname, '../assets/signature.jpg');
    const fs = require('fs');
    if (fs.existsSync(sigPath)) {
      doc.image(sigPath, sigX, bottomY, { width: 150, height: 55, fit: [150, 55] });
    }
    // Signature line
    doc.moveTo(sigX, bottomY + 62).lineTo(sigX + 160, bottomY + 62)
       .lineWidth(0.8).strokeColor(midGray).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkBlue)
      .text('Shivba Tarun Mitra Mandal', sigX, bottomY + 66, { width: 180 });
    doc.font('Helvetica').fontSize(7.5).fillColor(textGray)
      .text('Authorized Signatory', sigX, bottomY + 79);

    // ── FOOTER ───────────────────────────────────────────────
    const footerY = H - 42;
    doc.rect(0, footerY, W, 42).fill(darkBlue);
    doc.font('Helvetica').fontSize(8).fillColor('#90CAF9')
      .text(
        'This is an official computer generated donation receipt.',
        0, footerY + 10, { align: 'center', width: W }
      );
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
      .text('Shivba Tarun Mitra Mandal  |  SHIVBAEMPIRE Platform', 0, footerY + 23, { align: 'center', width: W });

    doc.end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/receipts/verify/:receiptNumber/pdf — Public PDF Download by Receipt Number
 */
const downloadReceiptPdfByNumber = async (req, res, next) => {
  try {
    const [receipts] = await pool.execute(
      `SELECT r.*, d.full_name as donor_name, d.mobile as donor_mobile,
              d.village_name, d.address, d.email as donor_email,
              u.full_name as collector_name, e.name as event_name, e.location as event_location
       FROM receipts r
       LEFT JOIN donors d ON r.donor_id = d.id
       LEFT JOIN users u ON r.collector_id = u.id
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.receipt_number = ?`,
      [req.params.receiptNumber]
    );

    if (receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const receipt = receipts[0];
    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receipt_number}.pdf`);
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    const saffron   = '#FF6B00';
    const darkBlue  = '#1A237E';
    const gold      = '#F9A825';
    const lightGray = '#F5F5F5';
    const midGray   = '#E0E0E0';
    const textDark  = '#212121';
    const textGray  = '#616161';
    const white     = '#FFFFFF';

    doc.rect(0, 0, W, 130).fill(saffron);
    doc.rect(0, 122, W, 8).fill(gold);

    doc.font('Helvetica-Bold').fontSize(24).fillColor(white)
      .text('SHIVBAEMPIRE', 0, 22, { align: 'center', width: W });
    doc.font('Helvetica').fontSize(11).fillColor(white)
      .text('Shivba Tarun Mitra Mandal', 0, 52, { align: 'center', width: W });
    doc.font('Helvetica').fontSize(9).fillColor('#FFE0B2')
      .text('Mandal Management Platform', 0, 69, { align: 'center', width: W });

    doc.rect(0, 130, W, 44).fill(darkBlue);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(white)
      .text('DONATION RECEIPT', 0, 144, { align: 'center', width: W });

    doc.roundedRect(W - 195, 180, 175, 52, 6)
       .lineWidth(1.5).strokeColor(saffron).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(textGray).text('Receipt No.', W - 190, 186);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(darkBlue).text(receipt.receipt_number, W - 190, 200);

    doc.roundedRect(30, 185, W - 250, 40, 5).fill(lightGray);
    doc.font('Helvetica').fontSize(8).fillColor(textGray).text('Event', 42, 190);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkBlue).text(receipt.event_name || 'N/A', 42, 202);

    let y = 248;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 14;

    doc.rect(30, y, W - 60, 22).fill(darkBlue);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(white).text('  DONOR INFORMATION', 30, y + 6);
    y += 30;

    const fieldLabel = (label, x, fy) => { doc.font('Helvetica').fontSize(8).fillColor(textGray).text(label, x, fy); };
    const fieldValue = (value, x, fy, opts = {}) => { doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark).text(String(value || '—'), x, fy + 11, opts); };

    fieldLabel('Donor Name', 30, y);
    fieldValue(receipt.donor_name, 30, y, { width: W - 60 });
    y += 36;

    fieldLabel('Mobile Number', 30, y);
    fieldLabel('Village', W / 2 + 10, y);
    fieldValue(receipt.donor_mobile || '—', 30, y);
    fieldValue(receipt.village_name || '—', W / 2 + 10, y);
    y += 36;

    if (receipt.address) { fieldLabel('Address', 30, y); fieldValue(receipt.address, 30, y, { width: W - 60 }); y += 36; }

    y += 2;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 14;

    doc.rect(30, y, W - 60, 76).fill('#FFF8E1');
    doc.rect(30, y, 6, 76).fill(gold);
    doc.font('Helvetica').fontSize(9).fillColor(textGray).text('Amount Received', 48, y + 8);
    const amtStr = `RS. ${parseFloat(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    doc.font('Helvetica-Bold').fontSize(26).fillColor(saffron).text(amtStr, 48, y + 20);
    doc.font('Helvetica').fontSize(9).fillColor(textGray).text('In Words: ', 48, y + 56, { continued: true });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark).text(receipt.amount_in_words || amountToWords(receipt.amount), { width: W - 100 });
    y += 92;

    doc.rect(30, y, W - 60, 22).fill(darkBlue);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(white).text('  PAYMENT DETAILS', 30, y + 6);
    y += 30;

    const colW = (W - 60) / 3;
    fieldLabel('Payment Mode', 30, y);
    fieldLabel('Collection Date', 30 + colW, y);
    fieldLabel('Collector', 30 + colW * 2, y);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(darkBlue).text((receipt.payment_mode || '—').replace('_', ' '), 30, y + 11);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark).text(new Date(receipt.collection_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 30 + colW, y + 11);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(textDark).text(receipt.collector_name || '—', 30 + colW * 2, y + 11, { width: colW - 10 });
    y += 42;

    if (receipt.transaction_id) { fieldLabel('Transaction ID / Ref', 30, y); fieldValue(receipt.transaction_id, 30, y); y += 36; }

    y += 4;
    doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).strokeColor(midGray).stroke();
    y += 20;

    const sigX = 30;
    const qrX  = W - 140;
    const bottomY = y;

    if (receipt.qr_code_data) {
      try {
        const qrBase64 = receipt.qr_code_data.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, qrX, bottomY, { width: 90, height: 90 });
        doc.font('Helvetica').fontSize(7).fillColor(textGray).text('Scan to Verify', qrX, bottomY + 93, { width: 90, align: 'center' });
      } catch {}
    }

    const path = require('path');
    const sigPath = path.join(__dirname, '../assets/signature.jpg');
    const fs = require('fs');
    if (fs.existsSync(sigPath)) { doc.image(sigPath, sigX, bottomY, { width: 150, height: 55, fit: [150, 55] }); }
    doc.moveTo(sigX, bottomY + 62).lineTo(sigX + 160, bottomY + 62).lineWidth(0.8).strokeColor(midGray).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkBlue).text('Shivba Tarun Mitra Mandal', sigX, bottomY + 66, { width: 180 });
    doc.font('Helvetica').fontSize(7.5).fillColor(textGray).text('Authorized Signatory', sigX, bottomY + 79);

    const footerY = H - 42;
    doc.rect(0, footerY, W, 42).fill(darkBlue);
    doc.font('Helvetica').fontSize(8).fillColor('#90CAF9').text('This is an official computer generated donation receipt.', 0, footerY + 10, { align: 'center', width: W });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF').text('Shivba Tarun Mitra Mandal  |  SHIVBAEMPIRE Platform', 0, footerY + 23, { align: 'center', width: W });

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getReceipts, getReceiptById, verifyReceipt, downloadReceiptPdf, downloadReceiptPdfByNumber };

