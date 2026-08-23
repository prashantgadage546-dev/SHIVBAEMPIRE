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
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receipt_number}.pdf`);

    doc.pipe(res);

    // ---- PDF Design ----
    const primaryColor = '#1F2937';
    const accentColor = '#374151';
    const borderColor = '#E5E7EB';

    // Header background
    doc.rect(0, 0, doc.page.width, 130).fill('#F8F9FA');

    // Organization name
    doc.font('Helvetica-Bold').fontSize(22).fillColor(primaryColor)
      .text('SHIVBAEMPIRE', 50, 40, { align: 'center' });

    doc.font('Helvetica').fontSize(11).fillColor(accentColor)
      .text('Shivba Tarun Mitra Mandal', { align: 'center' });

    doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
      .text('Mandal Management Platform', { align: 'center' });

    // Divider
    doc.moveTo(50, 130).lineTo(545, 130).stroke(borderColor);

    // Receipt title
    doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor)
      .text('DONATION RECEIPT', 50, 148, { align: 'center' });

    // Receipt number box
    doc.roundedRect(350, 140, 195, 40, 4).stroke(borderColor);
    doc.font('Helvetica').fontSize(8).fillColor('#6B7280')
      .text('Receipt No.', 360, 147);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor)
      .text(receipt.receipt_number, 360, 158);

    // Event name
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280')
      .text(`Event: ${receipt.event_name || 'N/A'}`, 50, 155);

    doc.moveTo(50, 195).lineTo(545, 195).stroke(borderColor);

    // Donor details
    let y = 215;
    const labelColor = '#6B7280';
    const valueColor = '#111827';

    const addRow = (label, value, left = 50, right = 350) => {
      doc.font('Helvetica').fontSize(9).fillColor(labelColor).text(label, left, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(valueColor).text(String(value || 'N/A'), left, y + 12);
      y += 40;
    };

    const addTwoCol = (l1, v1, l2, v2) => {
      doc.font('Helvetica').fontSize(9).fillColor(labelColor).text(l1, 50, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(valueColor).text(String(v1 || 'N/A'), 50, y + 12);
      doc.font('Helvetica').fontSize(9).fillColor(labelColor).text(l2, 300, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(valueColor).text(String(v2 || 'N/A'), 300, y + 12);
      y += 40;
    };

    addRow('Donor Name', receipt.donor_name);
    addTwoCol('Mobile Number', receipt.donor_mobile, 'Village', receipt.village_name);
    if (receipt.address) { addRow('Address', receipt.address); }

    doc.moveTo(50, y).lineTo(545, y).stroke(borderColor);
    y += 15;

    // Amount section
    doc.rect(50, y, 495, 70).fill('#F8F9FA');
    doc.font('Helvetica').fontSize(9).fillColor(labelColor).text('Amount Received', 65, y + 8);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827')
      .text(formatCurrency(receipt.amount), 65, y + 20);
    doc.font('Helvetica').fontSize(9).fillColor(labelColor)
      .text(`In Words: ${receipt.amount_in_words || amountToWords(receipt.amount)}`, 65, y + 52);
    y += 90;

    addTwoCol('Payment Mode', receipt.payment_mode.replace('_', ' '),
              'Collection Date', new Date(receipt.collection_date).toLocaleDateString('en-IN'));

    if (receipt.transaction_id) {
      addRow('Transaction ID', receipt.transaction_id);
    }

    addRow('Collected By', receipt.collector_name);

    doc.moveTo(50, y).lineTo(545, y).stroke(borderColor);
    y += 25;

    // QR Code
    if (receipt.qr_code_data) {
      try {
        const qrBase64 = receipt.qr_code_data.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, 50, y, { width: 80, height: 80 });
        doc.font('Helvetica').fontSize(7).fillColor(labelColor)
          .text('Scan to verify', 50, y + 82, { width: 80, align: 'center' });
      } catch {}
    }

    // Signature area
    doc.font('Helvetica').fontSize(9).fillColor(labelColor)
      .text('Authorized Signature', 400, y + 50);
    doc.moveTo(380, y + 75).lineTo(540, y + 75).stroke(borderColor);

    y += 110;

    // Footer
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF')
      .text('This is a computer generated receipt. SHIVBAEMPIRE — Shivba Tarun Mitra Mandal', 50, y, { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getReceipts, getReceiptById, verifyReceipt, downloadReceiptPdf };
