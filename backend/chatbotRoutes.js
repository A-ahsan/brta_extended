// Chatbot API Routes
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  initializeSession,
  sendMessage,
  addAssistantMessage,
  getChatHistory,
  clearChatHistory,
  getSessionInfo
} from './chatbotService.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper functions for quick actions
async function getUserApplications(userId) {
  const { data, error } = await supabase
    .from('license_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserVehicleRegistrations(userId) {
  const { data, error } = await supabase
    .from('vehicle_registrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserRoutePermits(userId) {
  const { data, error } = await supabase
    .from('route_permits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserOwnershipTransfers(userId) {
  const { data, error } = await supabase
    .from('ownership_transfer_applications')
    .select('*')
    .eq('current_owner_user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserVehicles(userId) {
  const { data, error } = await supabase
    .from('registered_vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserViolations(userId) {
  const { data: vehicles } = await supabase
    .from('registered_vehicles')
    .select('id')
    .eq('user_id', userId);
  
  if (!vehicles || vehicles.length === 0) return [];
  
  const vehicleIds = vehicles.map(v => v.id);
  
  const { data, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .in('registered_vehicle_id', vehicleIds)
    .order('violation_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserImpoundments(userId) {
  const { data: vehicles } = await supabase
    .from('registered_vehicles')
    .select('id')
    .eq('user_id', userId);
  
  if (!vehicles || vehicles.length === 0) return [];
  
  const vehicleIds = vehicles.map(v => v.id);
  
  const { data, error } = await supabase
    .from('vehicle_impoundments')
    .select('*')
    .in('registered_vehicle_id', vehicleIds)
    .order('impound_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function getUserLicenses(userId) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Initialize chat session
router.post('/initialize', async (req, res) => {
  try {
    const { userId, userContext } = req.body;

    if (!userId || !userContext) {
      return res.status(400).json({ error: 'Missing userId or userContext' });
    }

    const result = await initializeSession(userId, userContext);
    
    res.json({ 
      success: true, 
      sessionId: result.sessionId,
      userContext: result.userContext 
    });
  } catch (error) {
    console.error('Initialize chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, language } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    const response = await sendMessage(sessionId, message, language);
    
    res.json({ 
      success: true, 
      response 
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick action: Check applications
router.post('/quick-action/applications', async (req, res) => {
  try {
    const { userId, sessionId, language } = req.body;

    const [dlApps, vehicleRegs, routePermits, ownershipTransfers] = await Promise.all([
      getUserApplications(userId),
      getUserVehicleRegistrations(userId),
      getUserRoutePermits(userId),
      getUserOwnershipTransfers(userId)
    ]);

    let message = language === 'en' 
      ? "▸ ALL YOUR APPLICATIONS:\n\n" 
      : "▸ আপনার সকল আবেদন:\n\n";

    if (language === 'en') {
      if (dlApps.length > 0) {
        message += `▪ Driving License (${dlApps.length}):\n`;
        dlApps.forEach(app => {
          message += `• ${app.application_number} - ${app.license_type} ${app.license_category} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (vehicleRegs.length > 0) {
        message += `▪ Vehicle Registration (${vehicleRegs.length}):\n`;
        vehicleRegs.forEach(app => {
          message += `• ${app.application_number} - ${app.status}\n`;
        });
        message += "\n";
      }
      
      if (routePermits.length > 0) {
        message += `▪ Route Permits (${routePermits.length}):\n`;
        routePermits.forEach(app => {
          message += `• ${app.permit_number} - ${app.route_from_en} → ${app.route_to_en} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (ownershipTransfers.length > 0) {
        message += `▪ Ownership Transfers (${ownershipTransfers.length}):\n`;
        ownershipTransfers.forEach(app => {
          message += `• ${app.application_number} - ${app.vehicle_name} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (dlApps.length === 0 && vehicleRegs.length === 0 && routePermits.length === 0 && ownershipTransfers.length === 0) {
        message = "You don't have any applications yet. You can start by applying for a driving license, registering a vehicle, or requesting a route permit from the sidebar menu.";
      } else {
        message += "\n» Check sidebar for detailed status of each application.";
      }
    } else {
      if (dlApps.length > 0) {
        message += `▪ ড্রাইভিং লাইসেন্স (${dlApps.length}):\n`;
        dlApps.forEach(app => {
          message += `• ${app.application_number} - ${app.license_type} ${app.license_category} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (vehicleRegs.length > 0) {
        message += `▪ যানবাহন নিবন্ধন (${vehicleRegs.length}):\n`;
        vehicleRegs.forEach(app => {
          message += `• ${app.application_number} - ${app.status}\n`;
        });
        message += "\n";
      }
      
      if (routePermits.length > 0) {
        message += `▪ রুট পারমিট (${routePermits.length}):\n`;
        routePermits.forEach(app => {
          message += `• ${app.permit_number} - ${app.route_from_bn || app.route_from_en} → ${app.route_to_bn || app.route_to_en} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (ownershipTransfers.length > 0) {
        message += `▪ মালিকানা স্থানান্তর (${ownershipTransfers.length}):\n`;
        ownershipTransfers.forEach(app => {
          message += `• ${app.application_number} - ${app.vehicle_name} (${app.status})\n`;
        });
        message += "\n";
      }
      
      if (dlApps.length === 0 && vehicleRegs.length === 0 && routePermits.length === 0 && ownershipTransfers.length === 0) {
        message = "আপনার এখনও কোনো আবেদন নেই। ড্রাইভিং লাইসেন্স, যানবাহন নিবন্ধন, বা রুট পারমিটের জন্য আবেদন করুন!";
      } else {
        message += "\n» প্রতিটি আবেদনের বিস্তারিত জানতে সাইডবার দেখুন।";
      }
    }

    // Add to session history
    if (sessionId) {
      addAssistantMessage(sessionId, message);
    }

    res.json({ success: true, response: message });
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick action: Check vehicles
router.post('/quick-action/vehicles', async (req, res) => {
  try {
    const { userId, sessionId, language } = req.body;
    const vehicles = await getUserVehicles(userId);

    let message;
    if (vehicles.length === 0) {
      message = language === 'en'
        ? "You don't have any registered vehicles yet. Would you like to register a vehicle?"
        : "আপনার এখনও কোনো নিবন্ধিত যানবাহন নেই। আপনি কি একটি যানবাহন নিবন্ধন করতে চান?";
    } else {
      const vehicleList = vehicles.map(v => {
        const plate = language === 'en' 
          ? (v.registration_plate?.en || v.registration_plate || 'N/A')
          : (v.registration_plate?.bn || v.registration_plate?.en || 'নম্বর নেই');
        const vehicleName = v.vehicle_name || (language === 'en' ? 'Vehicle' : 'যানবাহন');
        const vehicleType = v.vehicle_type || (language === 'en' ? 'Car' : 'গাড়ি');
        return `• ${plate} - ${vehicleName} ${v.model || ''} (${vehicleType}, ${v.status || (language === 'en' ? 'active' : 'সক্রিয়')})`;
      }).join('\n');

      message = language === 'en'
        ? `Here are your registered vehicles:\n\n${vehicleList}\n\nHow can I help with your vehicles?`
        : `এখানে আপনার নিবন্ধিত যানবাহন:\n\n${vehicleList}\n\nআপনার যানবাহন নিয়ে কীভাবে সাহায্য করতে পারি?`;
    }

    // Add to session history
    if (sessionId) {
      addAssistantMessage(sessionId, message);
    }

    res.json({ success: true, response: message });
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick action: Check violations
router.post('/quick-action/violations', async (req, res) => {
  try {
    const { userId, sessionId, language } = req.body;
    const [violations, impoundments] = await Promise.all([
      getUserViolations(userId),
      getUserImpoundments(userId)
    ]);

    let message;
    
    if (violations.length === 0 && impoundments.length === 0) {
      message = language === 'en'
        ? "✓ Good news! You don't have any traffic violations or vehicle impoundments. Keep driving safely."
        : "✓ দুর্দান্ত খবর! আপনার কোনো ট্রাফিক লঙ্ঘন বা যানবাহন আটক নেই। নিরাপদে গাড়ি চালাতে থাকুন।";
    } else {
      message = language === 'en' 
        ? "▸ TRAFFIC VIOLATIONS & IMPOUNDMENTS:\n\n" 
        : "▸ ট্রাফিক লঙ্ঘন এবং আটক:\n\n";

      if (violations.length > 0) {
        const unpaidViolations = violations.filter(v => v.payment_status === 'unpaid');
        const paidViolations = violations.filter(v => v.payment_status === 'paid' || v.status === 'closed' || v.status === 'resolved');

        if (language === 'en') {
          message += `▪ Violations: ${violations.length} total\n`;
          message += `  • Paid: ${paidViolations.length}\n`;
          message += `  • Unpaid: ${unpaidViolations.length}\n\n`;

          if (unpaidViolations.length > 0) {
            message += `Unpaid Fines:\n`;
            unpaidViolations.slice(0, 3).forEach(v => {
              const amount = parseFloat(v.total_amount || 0).toFixed(2);
              message += `  • ${v.violation_number}: ৳${amount} - ${v.violation_name_en || 'Fine'}\n`;
            });
            if (unpaidViolations.length > 3) {
              message += `  ... and ${unpaidViolations.length - 3} more\n`;
            }
            message += "\n";
          }
        } else {
          message += `▪ লঙ্ঘন: মোট ${violations.length}টি\n`;
          message += `  • পরিশোধিত: ${paidViolations.length}\n`;
          message += `  • অপরিশোধিত: ${unpaidViolations.length}\n\n`;

          if (unpaidViolations.length > 0) {
            message += `অপরিশোধিত জরিমানা:\n`;
            unpaidViolations.slice(0, 3).forEach(v => {
              const amount = parseFloat(v.total_amount || 0).toFixed(2);
              message += `  • ${v.violation_number}: ৳${amount} - ${v.violation_name_bn || v.violation_name_en || 'জরিমানা'}\n`;
            });
            if (unpaidViolations.length > 3) {
              message += `  ... এবং আরো ${unpaidViolations.length - 3}টি\n`;
            }
            message += "\n";
          }
        }
      }

      if (impoundments.length > 0) {
        const unpaidImpoundments = impoundments.filter(i => i.status === 'impounded' && i.payment_status === 'unpaid');
        const releasedImpoundments = impoundments.filter(i => i.status === 'released' || i.payment_status === 'paid' || i.status === 'cleared');

        if (language === 'en') {
          message += `▪ Vehicle Impoundments: ${impoundments.length} total\n`;
          message += `  • Released: ${releasedImpoundments.length}\n`;
          message += `  • Currently Impounded: ${unpaidImpoundments.length}\n\n`;

          if (unpaidImpoundments.length > 0) {
            message += `Active Impoundments:\n`;
            unpaidImpoundments.forEach(imp => {
              const amount = parseFloat(imp.total_amount || 0).toFixed(2);
              const days = Math.ceil((new Date() - new Date(imp.impound_date)) / (1000 * 60 * 60 * 24));
              message += `  • ${imp.impound_number}: ৳${amount} (${days} days)\n`;
            });
            message += "\n";
          }
        } else {
          message += `▪ যানবাহন আটক: মোট ${impoundments.length}টি\n`;
          message += `  • মুক্ত: ${releasedImpoundments.length}\n`;
          message += `  • বর্তমানে আটক: ${unpaidImpoundments.length}\n\n`;

          if (unpaidImpoundments.length > 0) {
            message += `সক্রিয় আটক:\n`;
            unpaidImpoundments.forEach(imp => {
              const amount = parseFloat(imp.total_amount || 0).toFixed(2);
              const days = Math.ceil((new Date() - new Date(imp.impound_date)) / (1000 * 60 * 60 * 24));
              message += `  • ${imp.impound_number}: ৳${amount} (${days} দিন)\n`;
            });
            message += "\n";
          }
        }
      }

      const totalUnpaid = violations.filter(v => v.payment_status === 'unpaid' && v.status === 'active').length + 
                         impoundments.filter(i => i.payment_status === 'unpaid' && i.status === 'impounded').length;

      if (totalUnpaid > 0) {
        message += language === 'en'
          ? `\n» Go to "Violations" from sidebar to pay your pending fines/impoundments before the deadline.`
          : `\n» সাইডবার থেকে "লঙ্ঘন" এ যান এবং সময়সীমার আগে আপনার বকেয়া জরিমানা/আটক পরিশোধ করুন।`;
      } else {
        message += language === 'en' ? `✓ All fines and impoundments are cleared.` : `✓ সমস্ত জরিমানা এবং আটক পরিশোধিত।`;
      }
    }

    // Add to session history
    if (sessionId) {
      addAssistantMessage(sessionId, message);
    }

    res.json({ success: true, response: message });
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quick action: Renewal status
router.post('/quick-action/renewal', async (req, res) => {
  try {
    const { userId, sessionId, language } = req.body;
    const licenses = await getUserLicenses(userId);
    const vehicles = await getUserVehicles(userId);

    let message = language === 'en' ? "▸ RENEWAL STATUS:\n\n" : "▸ নবায়ন স্থিতি:\n\n";

    if (language === 'en') {
      if (licenses.length === 0) {
        message += "▪ Licenses: None\n\n";
      } else {
        message += `▪ Licenses (${licenses.length}):\n`;
        licenses.forEach(license => {
          const daysUntilExpiry = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          const status = daysUntilExpiry < 0 ? `✗ EXPIRED ${Math.abs(daysUntilExpiry)} days ago` 
                      : daysUntilExpiry < 30 ? `⚠ Expires in ${daysUntilExpiry} days - Renew soon`
                      : `✓ Valid (${daysUntilExpiry} days left)`;
          message += `• ${license.license_number} - ${status}\n`;
        });
        message += "\n";
      }

      if (vehicles.length === 0) {
        message += "▪ Vehicles: None\n";
      } else {
        message += `▪ Vehicles (${vehicles.length}):\n`;
        vehicles.forEach(v => {
          const plate = v.registration_plate?.en || 'N/A';
          const daysUntilExpiry = Math.ceil((new Date(v.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
          const status = daysUntilExpiry < 0 ? `✗ EXPIRED ${Math.abs(daysUntilExpiry)} days ago` 
                      : daysUntilExpiry < 30 ? `⚠ Expires in ${daysUntilExpiry} days - Renew now`
                      : `✓ Valid (${daysUntilExpiry} days left)`;
          message += `• ${plate} - ${status}\n`;
        });
      }

      message += "\n» Renew from Profile section before expiry.";
    } else {
      if (licenses.length === 0) {
        message += "▪ লাইসেন্স: নেই\n\n";
      } else {
        message += `▪ লাইসেন্স (${licenses.length}):\n`;
        licenses.forEach(license => {
          const daysUntilExpiry = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          const status = daysUntilExpiry < 0 ? `✗ মেয়াদোত্তীর্ণ ${Math.abs(daysUntilExpiry)} দিন আগে` 
                      : daysUntilExpiry < 30 ? `⚠ ${daysUntilExpiry} দিনে মেয়াদ শেষ - এখনই নবায়ন করুন`
                      : `✓ বৈধ (${daysUntilExpiry} দিন বাকি)`;
          message += `• ${license.license_number} - ${status}\n`;
        });
        message += "\n";
      }

      if (vehicles.length === 0) {
        message += "▪ যানবাহন: নেই\n";
      } else {
        message += `▪ যানবাহন (${vehicles.length}):\n`;
        vehicles.forEach(v => {
          const plate = v.registration_plate?.bn || v.registration_plate?.en || 'নম্বর নেই';
          const daysUntilExpiry = Math.ceil((new Date(v.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
          const status = daysUntilExpiry < 0 ? `✗ মেয়াদোত্তীর্ণ ${Math.abs(daysUntilExpiry)} দিন আগে` 
                      : daysUntilExpiry < 30 ? `⚠ ${daysUntilExpiry} দিনে মেয়াদ শেষ - এখনই নবায়ন করুন`
                      : `✓ বৈধ (${daysUntilExpiry} দিন বাকি)`;
          message += `• ${plate} - ${status}\n`;
        });
      }

      message += "\n» মেয়াদ শেষ হওয়ার আগে প্রোফাইল থেকে নবায়ন করুন।";
    }

    // Add to session history
    if (sessionId) {
      addAssistantMessage(sessionId, message);
    }

    res.json({ success: true, response: message });
  } catch (error) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = getChatHistory(sessionId);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear chat history
router.post('/clear/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    clearChatHistory(sessionId);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session info (admin/debug)
router.get('/sessions', (req, res) => {
  try {
    const info = getSessionInfo();
    res.json({ success: true, ...info });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
