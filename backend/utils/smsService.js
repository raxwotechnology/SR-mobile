const { formatSLPhone, isStrictSLE164Phone } = require('./validators');

const SMSLENZ_BASE_URL = process.env.SMSLENZ_BASE_URL || 'https://www.smslenz.lk/api';
const SMSLENZ_USER_ID = process.env.SMSLENZ_USER_ID;
const SMSLENZ_API_KEY = process.env.SMSLENZ_API_KEY;
const SMSLENZ_SENDER = process.env.SMSLENZ_SENDER || 'ZAGE';

const assertSmsConfig = () => {
  if (!SMSLENZ_USER_ID || !SMSLENZ_API_KEY || !SMSLENZ_SENDER) {
    throw new Error('SMS configuration missing. Set SMSLENZ_USER_ID, SMSLENZ_API_KEY, SMSLENZ_SENDER.');
  }
};

const postSmslenz = async (endpoint, payload) => {
  assertSmsConfig();
  const response = await fetch(`${SMSLENZ_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = { raw: await response.text() };
  }

  if (!response.ok) {
    throw new Error(data?.message || 'SMS provider request failed');
  }

  return data;
};

const sendSms = async (phone, message) => {
  const contact = formatSLPhone(phone);
  if (!isStrictSLE164Phone(contact)) {
    throw new Error('Invalid phone number format. Use +947XXXXXXXX.');
  }
  if (!message || message.length > 621) {
    throw new Error('SMS message must be between 1 and 621 characters.');
  }

  const data = await postSmslenz('/send-sms', {
    user_id: SMSLENZ_USER_ID,
    api_key: SMSLENZ_API_KEY,
    sender_id: SMSLENZ_SENDER,
    contact,
    message,
  });

  return { success: true, provider: 'smslenz', data };
};

const sendBulkSms = async (contacts, message) => {
  const normalizedContacts = (contacts || []).map((c) => formatSLPhone(c));
  if (!normalizedContacts.length || normalizedContacts.some((c) => !isStrictSLE164Phone(c))) {
    throw new Error('Bulk SMS requires valid contacts in +947XXXXXXXX format.');
  }

  const data = await postSmslenz('/send-bulk-sms', {
    user_id: SMSLENZ_USER_ID,
    api_key: SMSLENZ_API_KEY,
    sender_id: SMSLENZ_SENDER,
    contacts: normalizedContacts,
    message,
  });

  return { success: true, provider: 'smslenz', data };
};

const applyTemplate = (template, values) => String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
  const value = values[key];
  return value === undefined || value === null ? '' : String(value);
});

const getSmsTemplates = async () => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne().lean();
    return {
      shopName: settings?.shopName || 'Mobile Hub',
      templates: settings?.smsTemplates || {},
    };
  } catch {
    return { shopName: 'Mobile Hub', templates: {} };
  }
};

const buildOtpMessage = async (otp) => {
  const { shopName, templates } = await getSmsTemplates();
  return applyTemplate(templates.otp || 'Your {shopName} OTP is {code}.', { shopName, code: otp });
};

const buildPaymentMessage = async (amount, values = {}) => {
  const { shopName, templates } = await getSmsTemplates();
  return applyTemplate(templates.payment || 'Payment received. Total: Rs. {total}. Thank you - {shopName}', {
    shopName,
    total: Number(amount || 0).toFixed(2),
    ...values,
  });
};

const buildPosReceiptMessage = async (amount, values = {}) => {
  const { shopName, templates } = await getSmsTemplates();
  return applyTemplate(templates.posReceipt || 'Thank you for shopping at {shopName}. Total Rs. {total}.', {
    shopName,
    total: Number(amount || 0).toFixed(2),
    ...values,
  });
};

module.exports = {
  sendSms,
  sendBulkSms,
  buildOtpMessage,
  buildPaymentMessage,
  buildPosReceiptMessage,
};
