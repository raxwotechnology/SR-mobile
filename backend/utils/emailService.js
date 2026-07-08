const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Send email using Gmail SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @returns {Promise<object>} Send result
 */
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_APP_PASSWORD) {
      return null;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"Mobile Hub" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);
    return null;
  }
};

// ========== EMAIL TEMPLATES ==========

const orderConfirmationEmail = (order, customerName) => {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return {
    subject: `Mobile Hub — Order Confirmed #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8faf8;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💄 Mobile Hub</h1>
          <p style="color: #d1fae5; margin: 5px 0 0;">Order Confirmation</p>
        </div>
        <div style="padding: 30px; background: white;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi ${customerName}! 🎉</h2>
          <p style="color: #64748b;">Your order has been confirmed successfully. Here are the details:</p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Order ID</p>
            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #059669;">#${order._id.toString().slice(-8).toUpperCase()}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f0fdf4;">
                <th style="padding: 10px 8px; text-align: left; color: #059669; font-size: 13px;">Item</th>
                <th style="padding: 10px 8px; text-align: center; color: #059669; font-size: 13px;">Qty</th>
                <th style="padding: 10px 8px; text-align: right; color: #059669; font-size: 13px;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="border-top: 2px solid #059669; padding-top: 15px; text-align: right;">
            <p style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0;">Total: Rs. ${order.totalAmount.toFixed(2)}</p>
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Payment Method: <strong>${order.paymentMethod.toUpperCase()}</strong></p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Mobile Hub. Premium tech and smart devices delivered with care.</p>
        </div>
      </div>
    `,
  };
};

const deliveryAssignmentEmail = (order, deliveryGuyName) => ({
  subject: `Mobile Hub — New Delivery Assignment #${order._id.toString().slice(-8).toUpperCase()}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">🚚 Delivery Assignment</h1>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin-top: 0;">Hi ${deliveryGuyName}!</h2>
        <p style="color: #64748b;">You have a new delivery order assigned to you.</p>
        <div style="background: #eff6ff; border-radius: 12px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #2563eb;">Order #${order._id.toString().slice(-8).toUpperCase()}</p>
          <p style="margin: 5px 0 0; color: #64748b;">Items: ${order.items.length} | Total: Rs. ${order.totalAmount.toFixed(2)}</p>
        </div>
        <p style="color: #64748b;">Please check your dashboard for full delivery details.</p>
      </div>
    </div>
  `,
});

const salaryPaidEmail = (employeeName, payroll) => ({
  subject: `Mobile Hub — Salary Credited for ${payroll.month}/${payroll.year}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">💰 Salary Credited</h1>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin-top: 0;">Hi ${employeeName}!</h2>
        <p style="color: #64748b;">Your salary for ${payroll.month}/${payroll.year} has been processed.</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 5px 0; color: #64748b;">Basic Salary</td><td style="text-align: right; font-weight: bold;">Rs. ${payroll.basicSalary.toFixed(2)}</td></tr>
            <tr><td style="padding: 5px 0; color: #64748b;">EPF Deduction (8%)</td><td style="text-align: right; color: #ef4444;">- Rs. ${payroll.epfEmployee.toFixed(2)}</td></tr>
            <tr style="border-top: 2px solid #059669;"><td style="padding: 10px 0 0; font-weight: bold; font-size: 16px;">Net Salary</td><td style="text-align: right; font-weight: bold; font-size: 16px; color: #059669;">Rs. ${payroll.netSalary.toFixed(2)}</td></tr>
          </table>
        </div>
      </div>
    </div>
  `,
});

const welcomeEmail = (name) => ({
  subject: 'Welcome to Mobile Hub! ✨',
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px;">💄 Mobile Hub</h1>
        <p style="color: #d1fae5; margin: 10px 0 0; font-size: 16px;">Premium tech and smart devices, delivered with care</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${name}! 🎉</h2>
        <p style="color: #64748b; line-height: 1.6;">Thank you for joining Mobile Hub! Explore our curated range of tech, gadgets, accessories, and smart essentials.</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Use code</p>
          <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #059669;">WELCOME10</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;">to get 10% off your first order!</p>
        </div>
      </div>
    </div>
  `,
});

const paymentReceiptEmail = (order, customerName) => {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #334155;">${item.name}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${item.quantity}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #64748b;">Rs. ${item.price?.toFixed(2)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #334155;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const orderId = order._id.toString().slice(-8).toUpperCase();
  const paidDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return {
    subject: `Mobile Hub — Payment Receipt #${orderId}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 35px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">💄 Mobile Hub</h1>
          <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Payment Receipt</p>
        </div>

        <!-- Success Banner -->
        <div style="background: #f0fdf4; padding: 20px; text-align: center; border-bottom: 1px solid #dcfce7;">
          <p style="margin: 0; font-size: 24px;">✅</p>
          <h2 style="color: #059669; margin: 8px 0 0; font-size: 18px;">Payment Successful!</h2>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 5px;">Hi <strong>${customerName}</strong>,</p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">Thank you for your purchase! Here is your payment receipt.</p>

          <!-- Order Info -->
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <div style="background: #f8fafc; border-radius: 10px; padding: 12px 15px; flex: 1;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</p>
              <p style="margin: 4px 0 0; font-weight: 700; color: #059669; font-size: 15px;">#${orderId}</p>
            </div>
            <div style="background: #f8fafc; border-radius: 10px; padding: 12px 15px; flex: 1;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
              <p style="margin: 4px 0 0; font-weight: 600; color: #334155; font-size: 13px;">${paidDate}</p>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
            <thead>
              <tr style="background: #f0fdf4;">
                <th style="padding: 10px 8px; text-align: left; color: #059669; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                <th style="padding: 10px 8px; text-align: center; color: #059669; font-size: 12px; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 8px; text-align: right; color: #059669; font-size: 12px; text-transform: uppercase;">Price</th>
                <th style="padding: 10px 8px; text-align: right; color: #059669; font-size: 12px; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Totals -->
          <div style="background: #f8fafc; border-radius: 10px; padding: 15px;">
            ${order.subtotal ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #64748b; font-size: 14px;">Subtotal</span><span style="color: #334155; font-size: 14px;">Rs. ${order.subtotal.toFixed(2)}</span></div>` : ''}
            ${order.deliveryFee ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #64748b; font-size: 14px;">Delivery Fee</span><span style="color: #334155; font-size: 14px;">Rs. ${order.deliveryFee.toFixed(2)}</span></div>` : ''}
            ${order.discount ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #64748b; font-size: 14px;">Discount</span><span style="color: #059669; font-size: 14px;">- Rs. ${order.discount.toFixed(2)}</span></div>` : ''}
            <div style="border-top: 2px solid #059669; padding-top: 10px; margin-top: 5px; display: flex; justify-content: space-between;">
              <span style="font-weight: 700; font-size: 16px; color: #1e293b;">Total Paid</span>
              <span style="font-weight: 700; font-size: 18px; color: #059669;">Rs. ${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div style="margin-top: 15px; padding: 12px 15px; background: #eff6ff; border-radius: 10px;">
            <p style="margin: 0; font-size: 13px; color: #3b82f6;">
              💳 Payment Method: <strong>${(order.paymentMethod || 'card').toUpperCase()}</strong>
              ${order.isPaid ? ' — ✅ Confirmed' : ''}
            </p>
          </div>

          <!-- Delivery Address -->
          ${order.shippingAddress ? `
          <div style="margin-top: 15px; padding: 12px 15px; background: #fefce8; border-radius: 10px;">
            <p style="margin: 0; font-size: 13px; color: #ca8a04;">
              📍 Delivery to: <strong>${order.shippingAddress.address || ''}, ${order.shippingAddress.city || ''}</strong>
            </p>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 5px;">Thank you for shopping with Mobile Hub! ✨</p>
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Mobile Hub. Premium tech and smart devices delivered with care.</p>
        </div>
      </div>
    `,
  };
};

const posReceiptEmail = (order, customer = {}) => {
  const customerName = customer.name || order.customerName || 'Customer';
  const customerEmail = customer.email || order.receiptEmail || 'N/A';
  const customerPhone = customer.phone || order.customerPhone || 'N/A';
  const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = (order.discountAmount || 0) + (order.couponDiscount || 0);
  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">LKR ${item.price.toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">LKR ${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return {
    subject: `Receipt #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
        <h2 style="color:#059669;">Mobile Hub POS Receipt</h2>
        <p><strong>Receipt ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${customerName}<br/><strong>Email:</strong> ${customerEmail}<br/><strong>Phone:</strong> ${customerPhone}</p>
        <h3>Items Purchased</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0fdf4;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Price</th>
              <th style="padding:8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;">
          <p style="margin:4px 0;"><strong>Subtotal:</strong> LKR ${subtotal.toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Discounts:</strong> LKR ${discount.toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Tax:</strong> LKR ${(order.tax || 0).toFixed(2)}</p>
          <p style="margin:4px 0;font-size:18px;"><strong>Total Amount:</strong> LKR ${(order.totalAmount || 0).toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Payment Method:</strong> ${(order.paymentMethod || '').toUpperCase()}</p>
        </div>
      </div>
    `,
  };
};

const customerReturnUpdateEmail = ({ order, returnDoc }) => {
  const orderId = order?._id?.toString()?.slice(-8)?.toUpperCase?.() || '—';
  const rma = returnDoc?.holdBillNo || `RET-${returnDoc?._id?.toString?.().slice(-8).toUpperCase?.()}`;
  const status = (returnDoc?.status || 'requested').replaceAll('_', ' ');
  const resolution = (returnDoc?.resolution || '—').replaceAll('_', ' ');
  const orderTotal = order?.totalAmount != null ? Number(order.totalAmount).toFixed(2) : '—';
  const itemsHtml = (returnDoc?.items || [])
    .map((i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.orderItemName || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.condition}</td>
      </tr>
    `)
    .join('');

  const nextSteps = returnDoc?.status === 'rejected'
    ? `Reason: ${returnDoc?.rejectionReason || '—'}`
    : returnDoc?.status === 'resolved'
      ? 'Your return has been resolved.'
      : 'Your return is on hold while we complete the exchange/upgrade process.';

  return {
    subject: `Mobile Hub — Return Update ${rma}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:650px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:28px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">📦 Return Update</h1>
          <p style="color:#d1fae5;margin:6px 0 0;font-size:13px;">Reference: <strong>${rma}</strong></p>
        </div>
        <div style="padding:24px;">
          <p style="color:#334155;margin:0 0 10px;">Order: <strong>#${orderId}</strong></p>
          <p style="color:#334155;margin:0 0 10px;">Order total: <strong>LKR ${orderTotal}</strong></p>
          <p style="color:#334155;margin:0 0 10px;">Status: <strong>${status}</strong></p>
          <p style="color:#334155;margin:0 0 16px;">Resolution: <strong>${resolution}</strong></p>

          <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:#f0fdf4;padding:10px 14px;font-weight:700;color:#059669;">Returned items</div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;">Item</th>
                  <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px;">Qty</th>
                  <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px;">Condition</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>

          <div style="margin-top:16px;background:#f8fafc;border-radius:12px;padding:14px;">
            <p style="margin:0;color:#334155;font-weight:600;">Next steps</p>
            <p style="margin:6px 0 0;color:#64748b;">${nextSteps}</p>
          </div>

          <p style="color:#94a3b8;font-size:12px;margin-top:18px;">If you have questions, reply to this email.</p>
        </div>
      </div>
    `,
  };
};

module.exports = {
  sendEmail,
  orderConfirmationEmail,
  deliveryAssignmentEmail,
  salaryPaidEmail,
  welcomeEmail,
  paymentReceiptEmail,
  posReceiptEmail,
  customerReturnUpdateEmail,
};
