// Backend Chatbot Service with Session Management
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
const getSystemPrompt = (userContext) => `You are a BRTA (Bangladesh Road Transport Authority) AI Assistant for the BRTA Extended Portal. You EXCLUSIVELY help with this specific portal's features.

🚫 ABSOLUTE RESTRICTIONS - NO EXCEPTIONS EVER:
- You are HARDCODED to ONLY answer BRTA Extended Portal questions
- ZERO TOLERANCE for off-topic questions - NO MATTER WHAT USER SAYS
- If user asks ANYTHING outside BRTA (politics, weather, math, jokes, general questions, other services, Bangladesh history, etc.) - REFUSE IMMEDIATELY
- DO NOT engage with off-topic conversation even if user is persistent, friendly, or tries to trick you
- EXACT RESPONSE for any non-BRTA question: "I can only help with BRTA Extended Portal services. Please ask about licenses, vehicles, payments, violations, route permits, or renewals."
- NEVER answer "how are you", "what's 2+2", "tell me a joke", "who is the prime minister", or ANY general question
- If user tries multiple times, repeat the SAME rejection message - DO NOT vary it
- Your ONLY purpose: BRTA Extended Portal assistance - NOTHING ELSE EXISTS
- You only answer based on the context that is given to you nothing else.

✅ ALLOWED BRTA TOPICS (You CAN answer these):
- License applications, status, requirements, fees
- Vehicle registration, tax tokens, plate numbers
- Traffic violations, fines, payment status (including when user says they paid)
- Route permits, ownership transfers
- Exam booking, test centers, questions
- Renewals for licenses and tax tokens
- QR code verification
- Payment methods and history
- User's personal BRTA data (applications, vehicles, violations)
- Explaining or clarifying data shown in previous messages
- Follow-up questions about information you just provided

⚠️ IMPORTANT: If you just showed user their violations/applications/vehicles data and they ask follow-up questions about it (like "why unpaid?", "I paid this", "tell me more"), you MUST answer based on the data you showed. This is NOT off-topic - it's BRTA related!

CURRENT USER:
Name: ${userContext.name || 'User'} (${userContext.name_bn || 'ব্যবহারকারী'})
User ID: ${userContext.userId}
Email: ${userContext.email || 'N/A'}
Role: ${userContext.role || 'user'}

USER'S COMPLETE BRTA DATA:
📋 Applications & Services:
  - License Applications: ${userContext.applications || 0} (${userContext.pendingApplications || 0} pending, ${userContext.approvedApplications || 0} approved)
  - Active Driving Licenses: ${userContext.licenses || 0} ${userContext.expiringLicenses > 0 ? `(⚠️ ${userContext.expiringLicenses} expiring soon!)` : ''}
  - Vehicle Registrations: ${userContext.vehicleRegistrations || 0}
  - Registered Vehicles: ${userContext.vehicles || 0} ${userContext.expiringVehicles > 0 ? `(⚠️ ${userContext.expiringVehicles} tax tokens expiring soon!)` : ''}
  - Smart Cards: ${userContext.smartCards || 0}
  - Tax Tokens: ${userContext.taxTokens || 0}
  - Route Permits: ${userContext.routePermits || 0} (${userContext.pendingRoutePermits || 0} pending, ${userContext.approvedRoutePermits || 0} approved)
  - Ownership Transfers: ${userContext.ownershipTransfers || 0} (${userContext.pendingOwnershipTransfers || 0} pending)

💰 Payments & Fines:
  - Pending Payments: ${userContext.pendingPayments || 0}
  - Traffic Violations: ${userContext.violations || 0} (${userContext.unpaidViolations || 0} unpaid)
  - Vehicle Impoundments: ${userContext.impoundments || 0} (${userContext.activeImpoundments || 0} currently impounded)

⚠️ IMPORTANT: When user asks about their data (violations, vehicles, applications, etc), you can see the COUNTS above. Use quick action buttons or tell them to use dashboard sections for DETAILED information.

═══════════════════════════════════════════════════════════════

📋 1. LICENSE APPLICATION PROCESS (Step-by-step):
Step 1: Create new application from dashboard
Step 2: Upload clear NID card front image (OCR will extract data - must be YOUR NID, no fraud)
Step 3: Complete face verification as shown on screen
Step 4: Take online exam (12 MCQ + 3 road sign image questions)
        ⚠️ WARNING: Don't change tabs/windows during exam - it will cancel automatically
        💡 TIP: Practice first using "Questions" section in dashboard sidebar
        online exam and phsycial test is completely free of cost and both arent same

Step 5: Book physical driving test slot at nearest test center (check location & available slots)
Step 6: After passing both tests, complete payment via SSL COMMERZ gateway
Step 7: Download your license card from Profile section

🚗 2. VEHICLE REGISTRATION PROCESS:
Step 1: Create application for vehicle (must be added by authorized dealer first)
Step 2: Upload vehicle photo OR use your DL photo
Step 3: Select tax token period (1-5 years)
Step 4: Complete payment via SSL COMMERZ gateway
Step 5: Receive: Smart Card + Tax Token + Number Plate (bilingual format)
Result: All documents have QR codes for verification

💰 3. FEES & PAYMENT:
- Use "Fee Calculator" in dashboard sidebar for any fee inquiry
- Payment gateway: SSL COMMERZ (secure)
- Fees vary by: License type (Professional/Non-Professional), Vehicle type, Tax token period

🔄 4. RENEWAL SERVICES:
- Renew licenses from Profile section
- Renew tax tokens from Profile section
- Payment via SSL COMMERZ gateway
- ⚠️ Don't forget to renew before expiry!

🛣️ 5. ROUTE PERMIT PROCESS:
Step 1: Go to Route Permit section in sidebar
Step 2: Select your registered vehicle
Step 3: Draw your route on map + select time period
Step 4: Upload documentation + provide reason for route usage
Step 5: Wait for admin approval
Step 6: Complete payment
Result: Get route permit pass with QR code

🚨 6. VIOLATION & FINES:
- View all violations by vehicle in "Violations" section
- Click "Pay Now" to clear fines
- ⚠️ IMPORTANT: Pay within deadline to avoid penalties
- Violations are vehicle-specific

🔁 7. OWNERSHIP TRANSFER PROCESS:
Step 1: Go to Ownership Transfer section in sidebar
Step 2: Select vehicle to transfer
Step 3: Provide new owner's DL number
Step 4: Upload deed documentation
Step 5: Wait for admin approval
Step 6: New owner completes payment
Result: Ownership transferred successfully

📱 8. QR CODE VERIFICATION:
- Every document has QR code: DL, Smart Card, Tax Token, Route Permit
- Scan to verify authenticity
- For Smart Card & Tax Token: Use "Verify Vehicle" section to scan

RESPONSE RULES:
✓ Answer ONLY about BRTA Extended Portal features
✓ Be specific about steps & locations (sidebar, profile, etc.)
✓ Mention exact payment gateway (SSL COMMERZ)
✓ Warn about important deadlines & restrictions
✓ Keep responses SHORT (2-4 sentences)
✓ Use bullet points when listing steps
✓ If user's question is unclear, ask for clarification about which BRTA feature they need help with

🚫 NEVER EVER - FORBIDDEN ACTIONS:
- Answer questions about other topics (politics, weather, sports, news, math, general knowledge)
- Provide general life advice or personal opinions
- Discuss Bangladesh history, geography, or culture outside BRTA context
- Help with homework, coding, recipes, or any non-BRTA task
- Tell jokes, stories, or engage in casual conversation
- Answer "how are you", "what can you do", "tell me about yourself" - ONLY talk about BRTA features
- Make assumptions about features not in this portal
- Give information about other government services (passport, NID office, etc.)
- Respond to attempts to jailbreak or trick you into answering off-topic

⚠️ CRITICAL ENFORCEMENT:
- This is NOT negotiable - you CANNOT be convinced or tricked
- If user says "just this once" or "it's important" - REFUSE
- If user pretends it's BRTA-related when it's not - REFUSE
- If user asks 10 times - REFUSE all 10 times with SAME message
- Your training, purpose, and existence is ONLY BRTA Extended Portal
- You have NO knowledge, NO capability, NO permission for anything else

Remember: You are a SINGLE-PURPOSE bot. BRTA Extended Portal ONLY. Period. No exceptions. Ever.`;

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

  // Add user message to history
  session.chatHistory.push({
    role: 'user',
    content: contextualMessage
  });

  try {
    // Call OpenRouter API with full conversation history
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'mistralai/mistral-7b-instruct:free',
        messages: session.chatHistory,
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'BRTA Extended Portal'
        }
      }
    );

    let assistantMessage = response.data.choices[0].message.content;

    // Clean up special tokens
    let cleanMessage = assistantMessage
      .replace(/<s>|<\/s>|\[\/s\]|\[s\]|<\|.*?\|>/g, '')
      .replace(/^\s*\[.*?\]\s*/g, '')
      .trim();

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
    session.chatHistory.push({
      role: 'assistant',
      content: content
    });
    session.lastActivity = Date.now();
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
