// =============================================================
// SHIVBAEMPIRE — Utility Helpers
// =============================================================

/**
 * Format Indian Rupees
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Format number with Indian commas
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(parseInt(num) || 0);
};

/**
 * Format date to readable Indian format
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format datetime
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get status badge class
 */
export const getStatusBadgeClass = (status) => {
  const map = {
    PAID: 'badge badge-paid',
    PARTIALLY_PAID: 'badge badge-partial',
    PENDING: 'badge badge-pending',
    ACTIVE: 'badge badge-active',
    INACTIVE: 'badge badge-inactive',
    CANCELLED: 'badge badge-cancelled',
    UPCOMING: 'badge badge-pending',
    COMPLETED: 'badge badge-paid',
  };
  return map[status] || 'badge badge-inactive';
};

/**
 * Format status label
 */
export const formatStatus = (status) => {
  const map = {
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partial',
    PENDING: 'Pending',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    CANCELLED: 'Cancelled',
    UPCOMING: 'Upcoming',
    COMPLETED: 'Completed',
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    OTHER: 'Other',
  };
  return map[status] || status;
};

/**
 * Format payment mode
 */
export const formatPaymentMode = (mode) => {
  if (!mode) return 'Cash';
  if (mode === 'CASH') return 'Cash';
  return 'Online';
};

/**
 * Generate WhatsApp URL
 */
export const generateWhatsAppUrl = (mobile, message) => {
  const phone = mobile?.replace(/\D/g, '');
  const fullPhone = phone?.startsWith('91') ? phone : `91${phone}`;
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${fullPhone}?text=${encodedMsg}`;
};

/**
 * Generate receipt WhatsApp message in Marathi
 */
export const generateReceiptWhatsAppMessage = ({ donorName, amount, eventName, receiptNumber, paymentMode, date, verifyUrl }) => {
  const modeText = paymentMode === 'CASH' ? 'नगद (Cash)' : 'ऑनलाइन (Online)';
  return `शिवबा तरुण मित्र मंडळ (SHIVBAEMPIRE) आयोजित ${eventName || 'यात्रा / उत्सव'} साठी आपली वर्गणी यशस्वीरित्या जमा झाली आहे.

👤 देणगीदाराचे नाव: ${donorName}
💰 जमा वर्गणी रक्कम: ${formatCurrency(amount)}
🧾 पावती क्रमांक: ${receiptNumber}
💳 भरणा प्रकार: ${modeText}
📅 जमा तारीख: ${formatDate(date)}

📄 पावती डाऊनलोड करा (PDF):
${verifyUrl}

आपल्या बहुमूल्य सहकार्याबद्दल मनापासून आभार! 💐

— शिवबा तरुण मित्र मंडळ (SHIVBAEMPIRE)`;
};

/**
 * Generate pending reminder WhatsApp message in Marathi
 */
export const generatePendingWhatsAppMessage = ({ donorName, expectedAmount, paidAmount, pendingAmount, eventName }) => {
  return `जय शिवराय! 🙏🚩

शिवबा तरुण मित्र मंडळ (SHIVBAEMPIRE) आयोजित ${eventName || 'यात्रा / उत्सव'} संदर्भात नम्र विनंती.

👤 देणगीदाराचे नाव: ${donorName}
💰 वर्गणी रक्कम: ${formatCurrency(expectedAmount || paidAmount)}
✅ जमा रक्कम: ${formatCurrency(paidAmount)}
⚠️ बाकी रक्कम: ${formatCurrency(pendingAmount)}

मंडळाच्या उत्सवासाठी सहकार्य करून आपली वर्गणी जमा करावी ही नम्र विनंती. 💐

— शिवबा तरुण मित्र मंडळ (SHIVBAEMPIRE)`;
};

/**
 * Debounce function
 */
export const debounce = (fn, delay = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Extract error message from axios error
 */
export const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'An unexpected error occurred.';
};
