// =============================================================
// SHIVBAEMPIRE — Amount to Words Utility
// =============================================================

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numberToWords(num) {
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;

  let result = '';

  if (crore > 0) result += convertTwoDigit(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigit(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigit(thousand) + ' Thousand ';
  if (hundred > 0) result += ones[hundred] + ' Hundred ';
  if (remainder > 0) result += convertTwoDigit(remainder);

  return result.trim();
}

function convertTwoDigit(num) {
  if (num < 20) return ones[num];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
}

/**
 * Convert amount (DECIMAL) to Indian words
 * @param {number|string} amount
 * @returns {string} e.g. "Five Thousand Rupees Only"
 */
function amountToWords(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return 'Invalid Amount';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = '';

  if (rupees > 0) {
    words += numberToWords(rupees) + ' Rupees';
  }

  if (paise > 0) {
    words += (rupees > 0 ? ' and ' : '') + numberToWords(paise) + ' Paise';
  }

  if (!words) words = 'Zero Rupees';

  return words + ' Only';
}

/**
 * Format currency for display
 * @param {number|string} amount
 * @returns {string} e.g. "₹5,000.00"
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { amountToWords, formatCurrency };
