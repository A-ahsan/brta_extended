// Backend Chatbot Service with Session Management
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use API.AI.CC with Gemini 2.5 Flash Lite (FASTEST and CHEAPEST)
const AICC_API_KEY = process.env.AICC_API_KEY;
const AICC_API_URL = 'https://api.ai.cc/v1/chat/completions';

if (!AICC_API_KEY) {
  console.error('⚠️ WARNING: AICC_API_KEY environment variable is not set!');
}

// In-memory session storage
const chatSessions = new Map();

// Auto-cleanup old sessions (older than 2 hours)
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  
  for (const [sessionId, session] of chatSessions.entries()) {
    if (now - session.lastActivity > TWO_HOURS) {
      chatSessions.delete(sessionId);
      console.log(`🗑️ Cleaned up inactive session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000); // Run cleanup every 30 minutes

// System prompt generator
const getSystemPrompt = (userContext) => `You are the official BRTA (Bangladesh Road Transport Authority) Digital Assistant for the BRTA Extended Portal system.

WHAT IS BRTA:
BRTA stands for Bangladesh Road Transport Authority - the government agency that manages driving licenses, vehicle registration, tax tokens, traffic violations, and road transport services in Bangladesh. You are the AI assistant for their digital portal.

YOUR ROLE:
- Provide accurate information about BRTA portal features and services
- Guide users through license applications, vehicle registration, renewals, and payments
- Help users understand their violations, permits, and ownership transfers
- Answer questions about exam processes, fees, and documentation
- Explain payment methods (SSL COMMERZ gateway) and deadlines

STRICT RESTRICTIONS:
If user asks about topics outside BRTA portal (weather, politics, math, general knowledge, other services), respond ONLY:
"I can only assist with BRTA Extended Portal services. Please ask about licenses, vehicles, payments, violations, route permits, or renewals."

CONVERSATION RULES:
- Always acknowledge and remember previous messages in this conversation
- When user asks follow-up questions, refer back to earlier context
- If data was shown earlier (violations, applications, etc.), discuss it when user asks
- Keep responses concise (2-4 sentences) unless explaining a process
- Use professional tone


USER: ${userContext.name || 'User'} (ID: ${userContext.userId})

USER'S CURRENT DATA:
• License Applications: ${userContext.applications || 0} (${userContext.pendingApplications || 0} pending)
• Active Licenses: ${userContext.licenses || 0}
• Registered Vehicles: ${userContext.vehicles || 0}
• Traffic Violations: ${userContext.violations || 0} (${userContext.unpaidViolations || 0} unpaid)
• Route Permits: ${userContext.routePermits || 0}
• Ownership Transfers: ${userContext.ownershipTransfers || 0}
• Pending Payments: ${userContext.pendingPayments || 0}

KEY PORTAL PROCESSES:

LICENSE APPLICATION:
1. Create application → Upload NID (OCR extracts data)
2. Complete face verification
3. Pass online exam (12 MCQ + 3 road signs, don't switch tabs during exam)
4. Book physical test at test center
5. Pay via SSL COMMERZ → Download license from Profile

VEHICLE REGISTRATION:
1. Apply for vehicle → Select tax token period (1-5 years)
2. Pay via SSL COMMERZ
3. Receive Smart Card + Tax Token + Number Plate (all with QR codes)

ROUTE PERMIT:
Apply → Draw route on map → Upload docs → Admin approval → Payment → Permit issued

OWNERSHIP TRANSFER:
Select vehicle → Enter new owner's DL number → Upload deed → Admin approval → New owner pays

RENEWALS:
Go to Profile section → Select license or vehicle tax token → Complete payment

VIOLATIONS & FINES:
View in "Violations" section → Click "Pay Now" → Clear before deadline

FEES & PAYMENT:
Use "Fee Calculator" in sidebar for all fee information. All payments through SSL COMMERZ gateway.

IMPORTANT NOTES:
- Online exam and physical test are both FREE
- Never switch tabs during online exam (auto-cancels)
- All documents have QR codes for verification
- Practice questions available in "Questions" section
- Check sidebar for application status and details`;

// Fetch COMPREHENSIVE user data for ALL BRTA features
async function fetchUserData(userId) {
  try {
    const [
      { data: licenseApplications },
      { data: licenses },
      { data: vehicles },
      { data: vehicleRegistrations },
      { data: payments },
      { data: routePermits },
      { data: ownershipTransfers },
      { data: taxTokens },
      { data: smartCards }
    ] = await Promise.all([
      supabase.from('license_applications').select('*').eq('user_id', userId),
      supabase.from('licenses').select('*').eq('user_id', userId),
      supabase.from('registered_vehicles').select('*').eq('user_id', userId),
      supabase.from('vehicle_registrations').select('*').eq('user_id', userId),
      supabase.from('payments').select('*').eq('user_id', userId),
      supabase.from('route_permits').select('*').eq('user_id', userId),
      supabase.from('ownership_transfer_applications').select('*').eq('current_owner_user_id', userId),
      supabase.from('tax_tokens').select('*').eq('user_id', userId),
      supabase.from('smart_cards').select('*').eq('user_id', userId)
    ]);

    // Get violations & impoundments for user's vehicles
    let violationsCount = 0;
    let unpaidViolationsCount = 0;
    let impoundmentsCount = 0;
    let activeImpoundmentsCount = 0;

    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles.map(v => v.id);
      
      const [{ data: violations }, { data: impoundments }] = await Promise.all([
        supabase.from('traffic_violations').select('*').in('registered_vehicle_id', vehicleIds),
        supabase.from('vehicle_impoundments').select('*').in('registered_vehicle_id', vehicleIds)
      ]);

      violationsCount = violations?.length || 0;
      unpaidViolationsCount = violations?.filter(v => v.payment_status === 'unpaid')?.length || 0;
      impoundmentsCount = impoundments?.length || 0;
      activeImpoundmentsCount = impoundments?.filter(i => i.status === 'impounded')?.length || 0;
    }

    // Count pending payments
    const pendingPayments = payments?.filter(p => p.status === 'pending' || p.status === 'failed')?.length || 0;

    // Get detailed status counts
    const pendingApplications = licenseApplications?.filter(a => a.status === 'pending' || a.status === 'submitted')?.length || 0;
    const approvedApplications = licenseApplications?.filter(a => a.status === 'approved')?.length || 0;
    const pendingRoutePermits = routePermits?.filter(r => r.status === 'pending')?.length || 0;
    const approvedRoutePermits = routePermits?.filter(r => r.status === 'approved' || r.status === 'active')?.length || 0;
    const pendingOwnershipTransfers = ownershipTransfers?.filter(o => o.status === 'pending')?.length || 0;

    // Check for expiring licenses & tax tokens
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringLicenses = licenses?.filter(l => {
      const expiryDate = new Date(l.expiry_date);
      return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    })?.length || 0;

    const expiringVehicles = vehicles?.filter(v => {
      const expiryDate = new Date(v.valid_until);
      return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    })?.length || 0;

    return {
      applications: licenseApplications?.length || 0,
      pendingApplications,
      approvedApplications,
      licenses: licenses?.length || 0,
      expiringLicenses,
      vehicles: vehicles?.length || 0,
      expiringVehicles,
      vehicleRegistrations: vehicleRegistrations?.length || 0,
      routePermits: routePermits?.length || 0,
      pendingRoutePermits,
      approvedRoutePermits,
      ownershipTransfers: ownershipTransfers?.length || 0,
      pendingOwnershipTransfers,
      taxTokens: taxTokens?.length || 0,
      smartCards: smartCards?.length || 0,
      pendingPayments,
      violations: violationsCount,
      unpaidViolations: unpaidViolationsCount,
      impoundments: impoundmentsCount,
      activeImpoundments: activeImpoundmentsCount
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      applications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      licenses: 0,
      expiringLicenses: 0,
      vehicles: 0,
      expiringVehicles: 0,
      vehicleRegistrations: 0,
      routePermits: 0,
      pendingRoutePermits: 0,
      approvedRoutePermits: 0,
      ownershipTransfers: 0,
      pendingOwnershipTransfers: 0,
      taxTokens: 0,
      smartCards: 0,
      pendingPayments: 0,
      violations: 0,
      unpaidViolations: 0,
      impoundments: 0,
      activeImpoundments: 0
    };
  }
}

// Initialize chat session
export async function initializeSession(userId, userContext) {
  const sessionId = userId; // Use userId as session ID for simplicity

  // Fetch real user data
  const userData = await fetchUserData(userId);

  // Build complete user context
  const fullContext = {
    ...userContext,
    ...userData
  };

  // Create system message
  const systemMessage = {
    role: 'system',
    content: getSystemPrompt(fullContext)
  };

  // Store session
  chatSessions.set(sessionId, {
    userId,
    userContext: fullContext,
    chatHistory: [systemMessage],
    lastActivity: Date.now()
  });

  console.log(`✅ Initialized chat session for user ${userId} with real data:`, userData);

  return { sessionId, userContext: fullContext };
}

// Send message and get response
export async function sendMessage(sessionId, message, language = 'en') {
  const session = chatSessions.get(sessionId);
  
  if (!session) {
    throw new Error('Session not found. Please initialize chat first.');
  }

  // Update last activity
  session.lastActivity = Date.now();

  // Check if this is a follow-up question
  const isFollowUp = session.chatHistory.length > 2 && (
    message.toLowerCase().includes('why') ||
    message.toLowerCase().includes('paid') ||
    message.toLowerCase().includes('tell me') ||
    message.toLowerCase().includes('explain') ||
    message.toLowerCase().includes('কেন') ||
    message.toLowerCase().includes('পরিশোধিত') ||
    message.toLowerCase().includes('বলুন')
  );

  // Add language context to the message
  const contextualMessage = isFollowUp 
    ? `${message}\n\n[INSTRUCTION: This is a follow-up question about BRTA data shown previously. Respond in ${language === 'en' ? 'English' : 'Bangla (Bengali)'} language. Refer to the previous conversation context to answer this question. If user mentions they paid something, acknowledge it and explain the data shown.]`
    : `${message}\n\n[CRITICAL INSTRUCTION: You MUST respond in ${language === 'en' ? 'English' : 'Bangla (Bengali)'} language. If this question is NOT about BRTA Extended Portal (licenses, vehicles, payments, violations, route permits, renewals), respond ONLY with: "I can only help with BRTA Extended Portal services. Please ask about licenses, vehicles, payments, violations, route permits, or renewals." - DO NOT answer anything else. NO EXCEPTIONS.]`;

  // Add user message to history (store original message, not with instructions)
  session.chatHistory.push({
    role: 'user',
    content: message  // Store clean message for context
  });

  try {
    // Build messages for API call with instructions in the current message only
    const messagesForAPI = session.chatHistory.slice(0, -1).concat([{
      role: 'user',
      content: contextualMessage  // Add instructions only for current API call
    }]);

    // Use API.AI.CC with Gemini 2.5 Flash Lite (1-3 second responses!)
    const response = await axios.post(
      AICC_API_URL,
      {
        model: 'gemini-2.5-flash-lite',
        messages: messagesForAPI,
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${AICC_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let assistantMessage = response.data.choices[0].message.content;

    // Clean up any artifacts
    let cleanMessage = assistantMessage.trim();

    if (!cleanMessage) {
      cleanMessage = language === 'en' 
        ? "I'm here to help! Could you please rephrase your question?"
        : "আমি সাহায্য করতে এখানে আছি! অনুগ্রহ করে আপনার প্রশ্নটি আবার বলুন?";
    }

    // Add assistant response to history
    session.chatHistory.push({
      role: 'assistant',
      content: cleanMessage
    });

    console.log(`💬 Message processed for session ${sessionId}. History length: ${session.chatHistory.length}`);

    return cleanMessage;
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
}

// Add assistant message to history (for quick actions)
export function addAssistantMessage(sessionId, content) {
  const session = chatSessions.get(sessionId);
  if (session) {
    // Add user's action as context first (so AI knows what button was clicked)
    const actionMap = {
      'ALL YOUR APPLICATIONS': 'Show my applications',
      'আপনার সকল আবেদন': 'আমার আবেদন দেখান',
      'TRAFFIC VIOLATIONS': 'Show my violations',
      'ট্রাফিক লঙ্ঘন': 'আমার লঙ্ঘন দেখান',
      'RENEWAL STATUS': 'Show renewal status',
      'নবায়ন স্থিতি': 'নবায়ন স্থিতি দেখান'
    };
    
    // Try to detect what action was taken from the response content
    let userAction = 'Quick action data';
    for (const [key, value] of Object.entries(actionMap)) {
      if (content.includes(key)) {
        userAction = value;
        break;
      }
    }
    
    // Add simulated user message for context
    session.chatHistory.push({
      role: 'user',
      content: userAction
    });
    
    // Then add the assistant response
    session.chatHistory.push({
      role: 'assistant',
      content: content
    });
    
    session.lastActivity = Date.now();
    console.log(`✅ Quick action added to session ${sessionId}. History: ${session.chatHistory.length} messages`);
  }
}

// Get chat history
export function getChatHistory(sessionId) {
  const session = chatSessions.get(sessionId);
  return session?.chatHistory.filter(msg => msg.role !== 'system') || [];
}

// Clear chat history
export function clearChatHistory(sessionId) {
  const session = chatSessions.get(sessionId);
  if (session) {
    const systemMessage = session.chatHistory.find(msg => msg.role === 'system');
    session.chatHistory = systemMessage ? [systemMessage] : [];
    session.lastActivity = Date.now();
  }
}

// Get session info
export function getSessionInfo() {
  return {
    activeSessions: chatSessions.size,
    sessions: Array.from(chatSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      userId: session.userId,
      messageCount: session.chatHistory.length - 1, // Exclude system message
      lastActivity: new Date(session.lastActivity).toISOString()
    }))
  };
}
