import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SMS_API_URL = process.env.SMS_API_URL || 'http://bulksmsbd.net/api/smsapi';
const SMS_API_KEY = process.env.SMS_API_KEY || 'QvWIhejLvbHoLq9vCj54';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || '8809617631284';

/**
 * Send SMS using BulkSMSBD API
 * @param {string} phoneNumber - Phone number without country code (e.g., 01712345678)
 * @param {string} message - SMS message text
 * @returns {Promise<Object>} - API response
 */
export async function sendSMS(phoneNumber, message) {
  try {
    // Clean and validate phone number
    let cleanNumber = phoneNumber.toString().trim();
    
    // Remove any spaces, dashes, or special characters
    cleanNumber = cleanNumber.replace(/[\s-]/g, '');
    
    // If starts with +880 or 880, keep as is (already correct)
    if (cleanNumber.startsWith('+880')) {
      cleanNumber = cleanNumber.substring(1); // Remove + sign, keep 880
    } else if (cleanNumber.startsWith('880')) {
      // Already correct format, keep as is
    } else if (cleanNumber.startsWith('0')) {
      // Remove leading 0 and add 880
      // 01711337145 -> 1711337145 -> 8801711337145
      cleanNumber = '880' + cleanNumber.substring(1);
    } else {
      // Assume it's just the number without 0 or 880
      // 1711337145 -> 8801711337145
      cleanNumber = '880' + cleanNumber;
    }
    
    // Validate: should be 13 digits total (880 + 10 digits)
    if (!/^880\d{10}$/.test(cleanNumber)) {
      throw new Error(`Invalid phone number format. Got: ${phoneNumber}, Cleaned: ${cleanNumber}. Expected: 8801XXXXXXXXX (13 digits)`);
    }

    console.log(`📱 Sending SMS to: ${cleanNumber} (original: ${phoneNumber})`);

    // URL encode the message to handle special characters
    const encodedMessage = encodeURIComponent(message);

    // Build API URL with query parameters (using 880 format as per API docs)
    const apiUrl = `${SMS_API_URL}?api_key=${SMS_API_KEY}&type=text&number=${cleanNumber}&senderid=${SMS_SENDER_ID}&message=${encodedMessage}`;

    // Send GET request
    const response = await axios.get(apiUrl);

    // Check response code (202 = success)
    if (response.data && response.data.response_code === 202) {
      console.log('✅ SMS sent successfully to:', phoneNumber);
      return {
        success: true,
        code: response.data.response_code,
        message: response.data.success_message || 'SMS sent successfully',
        data: response.data
      };
    } else {
      console.error('❌ SMS failed:', response.data);
      return {
        success: false,
        code: response.data?.response_code,
        message: response.data?.error_message || 'SMS sending failed',
        data: response.data
      };
    }
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    return {
      success: false,
      code: error.response?.data?.response_code,
      message: error.message,
      error: error
    };
  }
}

/**
 * Send violation fine SMS notification or generic SMS
 * @param {Object|string} params - If object: violation parameters, If string: phone number
 * @param {string} message - SMS message (used when first param is phone number)
 * @returns {Promise<Object>} - SMS response
 */
export async function sendViolationSMS(params, message) {
  // If called with phone number and message (impoundment style)
  if (typeof params === 'string' && message) {
    return await sendSMS(params, message);
  }
  
  // If called with object (violation style)
  const { phoneNumber, violationNumber, violationName, amount, websiteUrl, dueDate } = params;
  const smsMessage = `BRTA Fine Alert!\nFine #${violationNumber}\nReason: ${violationName}\nAmount: ${amount} BDT\nDue: ${dueDate}\nVisit ${websiteUrl || 'https://brta-extended.vercel.app'} to pay online.\nPay before due date to avoid penalties.`;
  
  return await sendSMS(phoneNumber, smsMessage);
}

/**
 * Get user phone number from profiles table
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User UUID
 * @returns {Promise<string|null>} - Phone number or null
 */
export async function getUserPhoneNumber(supabase, userId) {
  try {
    // Get phone number from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error querying profiles:', error.message);
      throw error;
    }
    
    const phoneNumber = data?.phone;
    
    if (!phoneNumber) {
      console.warn('⚠️ No phone number found for user:', userId);
      return null;
    }
    
    console.log(`📞 Retrieved phone number for user ${userId}: ${phoneNumber}`);
    
    // Return as-is, sendSMS will handle formatting
    return phoneNumber;
  } catch (error) {
    console.error('❌ Error getting user phone:', error.message);
    return null;
  }
}

/**
 * Send license generation SMS notification
 * @param {string} phoneNumber - User phone number
 * @param {string} licenseNumber - Generated license number
 * @param {string} fullName - User's full name
 * @param {string} expiryDate - License expiry date
 * @returns {Promise<Object>} - SMS response
 */
export async function sendLicenseGeneratedSMS(phoneNumber, licenseNumber, fullName, expiryDate) {
  const message = `BRTA License Generated!\n` +
                 `Congratulations ${fullName}!\n` +
                 `Your driving license has been successfully generated.\n` +
                 `License #: ${licenseNumber}\n` +
                 `Valid until: ${expiryDate}\n` +
                 `Download from: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send vehicle registration completion SMS notification
 * @param {string} phoneNumber - User phone number
 * @param {string} registrationNumber - Vehicle registration number
 * @param {string} registrationPlate - Vehicle plate number
 * @param {string} vehicleName - Vehicle name and model
 * @param {string} validUntil - Registration validity date
 * @returns {Promise<Object>} - SMS response
 */
export async function sendVehicleRegistrationSMS(phoneNumber, registrationNumber, registrationPlate, vehicleName, validUntil) {
  const message = `BRTA Vehicle Registration Complete!\n` +
                 `Your vehicle registration is successful.\n` +
                 `Vehicle: ${vehicleName}\n` +
                 `Reg #: ${registrationNumber}\n` +
                 `Plate: ${registrationPlate}\n` +
                 `Valid until: ${validUntil}\n` +
                 `View details: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send license renewal SMS notification
 * @param {string} phoneNumber - User phone number
 * @param {string} licenseNumber - License number
 * @param {string} newExpiryDate - New expiry date after renewal
 * @param {number} amount - Renewal fee paid
 * @returns {Promise<Object>} - SMS response
 */
export async function sendLicenseRenewalSMS(phoneNumber, licenseNumber, newExpiryDate, amount) {
  const message = `BRTA License Renewed!\n` +
                 `Your driving license has been successfully renewed.\n` +
                 `License #: ${licenseNumber}\n` +
                 `New expiry: ${newExpiryDate}\n` +
                 `Amount paid: BDT ${amount}\n` +
                 `View license: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send tax token renewal SMS notification
 * @param {string} phoneNumber - User phone number
 * @param {string} vehicleInfo - Vehicle name and plate
 * @param {string} validUntil - Token validity date
 * @param {number} amount - Renewal amount paid
 * @returns {Promise<Object>} - SMS response
 */
export async function sendTaxTokenRenewalSMS(phoneNumber, vehicleInfo, validUntil, amount) {
  const message = `BRTA Tax Token Renewed!\n` +
                 `Your tax token has been successfully renewed.\n` +
                 `Vehicle: ${vehicleInfo}\n` +
                 `Valid until: ${validUntil}\n` +
                 `Amount paid: BDT ${amount}\n` +
                 `View token: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send ownership transfer SMS - for previous owner
 * @param {string} phoneNumber - Previous owner's phone
 * @param {string} vehicleInfo - Vehicle name and registration
 * @param {string} newOwnerName - New owner's name
 * @returns {Promise<Object>} - SMS response
 */
export async function sendOwnershipTransferPreviousSMS(phoneNumber, vehicleInfo, newOwnerName) {
  const message = `BRTA Ownership Transfer Complete!\n` +
                 `Vehicle: ${vehicleInfo}\n` +
                 `The ownership has been successfully transferred to ${newOwnerName}.\n` +
                 `This vehicle is no longer registered under your name.\n` +
                 `View details: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send ownership transfer SMS - for new owner
 * @param {string} phoneNumber - New owner's phone
 * @param {string} vehicleInfo - Vehicle name and registration
 * @param {string} registrationPlate - Vehicle plate number
 * @param {number} transferFee - Transfer fee paid
 * @returns {Promise<Object>} - SMS response
 */
export async function sendOwnershipTransferNewSMS(phoneNumber, vehicleInfo, registrationPlate, transferFee) {
  const message = `BRTA Vehicle Ownership Received!\n` +
                 `Congratulations! You are now the registered owner of:\n` +
                 `Vehicle: ${vehicleInfo}\n` +
                 `Plate: ${registrationPlate}\n` +
                 `Transfer fee: BDT ${transferFee}\n` +
                 `View vehicle: https://brta-extended.vercel.app\n` +
                 `- Bangladesh Road Transport Authority`;
  
  return await sendSMS(phoneNumber, message);
}

export default { 
  sendSMS, 
  sendViolationSMS, 
  getUserPhoneNumber,
  sendLicenseGeneratedSMS,
  sendVehicleRegistrationSMS,
  sendLicenseRenewalSMS,
  sendTaxTokenRenewalSMS,
  sendOwnershipTransferPreviousSMS,
  sendOwnershipTransferNewSMS
};
