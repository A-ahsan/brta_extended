import React from 'react';

const ViolationReceipt = ({ violation, isOpen, onClose, language }) => {
  if (!isOpen || !violation) return null;

  const isPaid = violation.payment_status === 'paid';

  const openReceiptInNewTab = () => {
    const receiptWindow = window.open('', '_blank');
    
    if (!receiptWindow) {
      alert('Please allow pop-ups to view the receipt');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Violation Receipt - ${violation.violation_number}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            page-break-inside: avoid;
          }
          .receipt-header {
            background: linear-gradient(135deg, #006A4E, #004D3A);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .receipt-header::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 200px;
            background-image: url('/brta.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.1;
          }
          .receipt-header > * {
            position: relative;
            z-index: 1;
          }
          .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 10px;
          }
          .logo-section img {
            width: 50px;
            height: 50px;
            object-fit: contain;
            background: white;
            padding: 6px;
            border-radius: 8px;
          }
          .receipt-header h1 {
            font-size: 22px;
            margin-bottom: 3px;
          }
          .receipt-header p {
            font-size: 12px;
            opacity: 0.95;
          }
          .status-badge {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 13px;
            border: 2px solid white;
          }
          .status-paid {
            background: #28A745;
            color: white;
          }
          .status-unpaid {
            background: #DC3545;
            color: white;
          }
          .receipt-body {
            padding: 20px;
          }
          .section {
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E9ECEF;
          }
          .section:last-of-type {
            border-bottom: none;
          }
          .section-title {
            font-size: 15px;
            font-weight: bold;
            color: #006A4E;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .info-item {
            background: #F8F9FA;
            padding: 8px;
            border-radius: 6px;
            border-left: 3px solid #006A4E;
          }
          .info-item.full {
            grid-column: 1 / -1;
          }
          .info-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .info-value {
            font-size: 13px;
            font-weight: bold;
            color: #333;
          }
          .violation-title {
            background: linear-gradient(135deg, #FEF3C7, #FDE68A);
            border: 2px solid #F59E0B;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 0;
          }
          .violation-title h2 {
            color: #92400E;
            font-size: 15px;
            margin-bottom: 4px;
          }
          .violation-title p {
            color: #78350F;
            font-size: 10px;
            line-height: 1.3;
          }
          .amount-box {
            background: linear-gradient(135deg, #FEE2E2, #FECACA);
            border: 2px solid #DC2626;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
          }
          .amount-breakdown {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #FCA5A5;
          }
          .amount-breakdown:last-child {
            border-bottom: none;
            border-top: 2px solid #DC2626;
            margin-top: 6px;
            padding-top: 8px;
          }
          .amount-label {
            font-size: 12px;
            color: #7F1D1D;
          }
          .amount-value {
            font-size: 13px;
            font-weight: bold;
            color: #991B1B;
          }
          .total-amount {
            font-size: 20px !important;
            color: #DC2626 !important;
          }
          .payment-confirmed {
            background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
            border: 2px solid #10B981;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
          }
          .payment-confirmed h3 {
            color: #065F46;
            font-size: 14px;
            margin-bottom: 6px;
          }
          .payment-date {
            display: flex;
            justify-content: space-around;
            margin-top: 8px;
          }
          .payment-date-item {
            text-align: center;
          }
          .payment-date-label {
            font-size: 9px;
            color: #047857;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .payment-date-value {
            font-size: 12px;
            font-weight: bold;
            color: #065F46;
          }
          .receipt-footer {
            text-align: center;
            padding: 10px;
            background: #F8F9FA;
            color: #666;
            font-size: 8px;
            line-height: 1.3;
          }
          .icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-right: 8px;
          }
          .print-btn {
            display: block;
            width: 250px;
            margin: 30px auto 0;
            padding: 15px 30px;
            background: linear-gradient(135deg, #006A4E, #004D3A);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,106,78,0.3);
            transition: all 0.3s ease;
          }
          .print-btn:hover {
            background: linear-gradient(135deg, #004D3A, #003827);
            box-shadow: 0 6px 20px rgba(0,106,78,0.4);
            transform: translateY(-2px);
          }
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body { 
              padding: 0; 
              background: white;
              margin: 0;
            }
            .receipt-container { 
              box-shadow: none;
              max-width: 100%;
              page-break-inside: avoid;
              break-inside: avoid;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt-body {
              padding: 15px;
            }
            .section {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 10px;
              padding-bottom: 8px;
            }
            .receipt-header,
            .amount-box,
            .violation-title,
            .payment-confirmed,
            .info-item {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-btn { 
              display: none; 
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="receipt-header">
            <div class="logo-section">
              <img src="/brta.png" alt="BRTA Logo" crossorigin="anonymous" onerror="this.style.display='none'" />
              <div>
                <h1>${language === 'en' ? 'BRTA' : 'বিআরটিএ'}</h1>
                <p>${language === 'en' ? 'Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ'}</p>
              </div>
            </div>
            <h2 style="margin-top: 15px; font-size: 22px;">${language === 'en' ? 'Traffic Violation Receipt' : 'ট্রাফিক লঙ্ঘন রসিদ'}</h2>
            <div class="status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}">
              ${isPaid ? (language === 'en' ? '✓ PAID' : '✓ পরিশোধিত') : (language === 'en' ? '⚠ UNPAID' : '⚠ বকেয়া')}
            </div>
          </div>

          <!-- Body -->
          <div class="receipt-body">
            <!-- Receipt Info -->
            <div class="section">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">${language === 'en' ? 'Receipt Number' : 'রসিদ নম্বর'}</div>
                  <div class="info-value">${violation.violation_number}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">${language === 'en' ? 'Issue Date' : 'ইস্যুর তারিখ'}</div>
                  <div class="info-value">${new Date(violation.violation_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
              </div>
            </div>

            <!-- Violation Type -->
            <div class="section">
              <div class="section-title">${language === 'en' ? 'Violation Details' : 'লঙ্ঘনের বিবরণ'}</div>
              <div class="violation-title">
                <h2>${language === 'en' ? violation.violation_name_en : violation.violation_name_bn}</h2>
                ${violation.description ? `<p>${violation.description}</p>` : ''}
              </div>
            </div>

            <!-- Vehicle & Location -->
            <div class="section">
              <div class="section-title">${language === 'en' ? 'Vehicle & Location Information' : 'যানবাহন ও স্থানের তথ্য'}</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">${language === 'en' ? 'Vehicle Registration' : 'যানবাহন নিবন্ধন'}</div>
                  <div class="info-value">${violation.registered_vehicles?.registration_number || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">${language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}</div>
                  <div class="info-value" style="font-size: 14px;">${violation.registered_vehicles?.vehicle_name || ''} ${violation.registered_vehicles?.model || ''}</div>
                </div>
                <div class="info-item full">
                  <div class="info-label">${language === 'en' ? 'Violation Location' : 'লঙ্ঘনের স্থান'}</div>
                  <div class="info-value" style="font-size: 14px;">
                    ${language === 'en' ? violation.location : (violation.location_bn || violation.location)}
                  </div>
                </div>
              </div>
            </div>

            <!-- Officer Details -->
            <div class="section">
              <div class="section-title">${language === 'en' ? 'Issuing Officer' : 'জারিকারী কর্মকর্তা'}</div>
              <div class="info-grid">
                <div class="info-item full">
                  <div class="info-label">${language === 'en' ? 'Officer Name' : 'কর্মকর্তার নাম'}</div>
                  <div class="info-value">${violation.police_name}</div>
                </div>
              </div>
            </div>

            <!-- Payment Details -->
            <div class="section">
              <div class="section-title">${language === 'en' ? 'Payment Details' : 'পেমেন্টের বিবরণ'}</div>
              <div class="amount-box">
                <div class="amount-breakdown">
                  <span class="amount-label">${language === 'en' ? 'Base Fine Amount' : 'মূল জরিমানা'}</span>
                  <span class="amount-value">BDT ${violation.fine_amount.toFixed(2)}</span>
                </div>
                ${violation.additional_charges > 0 ? `
                  <div class="amount-breakdown">
                    <span class="amount-label">${language === 'en' ? 'Additional Charges' : 'অতিরিক্ত চার্জ'}</span>
                    <span class="amount-value">BDT ${violation.additional_charges.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="amount-breakdown">
                  <span class="amount-label" style="font-size: 16px;">${language === 'en' ? 'Total Amount' : 'মোট পরিমাণ'}</span>
                  <span class="amount-value total-amount">BDT ${violation.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <!-- Payment Status -->
            ${isPaid ? `
              <div class="section">
                <div class="payment-confirmed">
                  <h3>✓ ${language === 'en' ? 'Payment Confirmed' : 'পেমেন্ট নিশ্চিত'}</h3>
                  <div class="payment-date">
                    <div class="payment-date-item">
                      <div class="payment-date-label">${language === 'en' ? 'Payment Date' : 'পেমেন্টের তারিখ'}</div>
                      <div class="payment-date-value">${new Date(violation.paid_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}</div>
                    </div>
                    <div class="payment-date-item">
                      <div class="payment-date-label">${language === 'en' ? 'Payment Method' : 'পেমেন্ট পদ্ধতি'}</div>
                      <div class="payment-date-value">${language === 'en' ? 'Online Payment' : 'অনলাইন পেমেন্ট'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div class="receipt-footer">
            <p><strong>${language === 'en' ? 'Official Receipt' : 'অফিসিয়াল রসিদ'}</strong></p>
            <p>${language === 'en' 
              ? 'This is a system-generated receipt. For any queries, please contact BRTA helpline.'
              : 'এটি একটি সিস্টেম-জেনারেটেড রসিদ। কোনো প্রশ্নের জন্য, অনুগ্রহ করে BRTA হেল্পলাইনে যোগাযোগ করুন।'}</p>
            <p style="margin-top: 8px; color: #999; font-size: 10px;">
              ${language === 'en' ? 'Generated on' : 'তৈরির তারিখ'}: ${new Date().toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
            </p>
          </div>
        </div>

        <button class="print-btn" onclick="window.print()">
          ${language === 'en' ? 'Print / Download Receipt' : 'প্রিন্ট / ডাউনলোড রসিদ'}
        </button>
      </body>
      </html>
    `;

    receiptWindow.document.write(htmlContent);
    receiptWindow.document.close();
    
    // Close the modal after opening the new tab
    if (onClose) {
      onClose();
    }
  };

  // Auto-open receipt in new tab when modal is opened
  React.useEffect(() => {
    if (isOpen && violation) {
      openReceiptInNewTab();
    }
  }, [isOpen, violation]);

  return null; // No need to render a modal, just open new tab
};

export default ViolationReceipt;
