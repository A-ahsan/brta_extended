import { supabase } from '../lib/supabaseClient';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt for the BRTA chatbot
const getSystemPrompt = (userContext) => `You are a helpful AI assistant for BRTA (Bangladesh Road Transport Authority) Extended Portal.

CURRENT USER CONTEXT:
- Name: ${userContext.name || 'User'}
- Name (Bangla): ${userContext.name_bn || 'ব্যবহারকারী'}
- User ID: ${userContext.userId}
- Email: ${userContext.email || 'Not provided'}
- Role: ${userContext.role || 'user'}

USER'S CURRENT DATA:
- Total Applications: ${userContext.applications || 0}
- Active Licenses: ${userContext.licenses || 0}
- Registered Vehicles: ${userContext.vehicles || 0}
- Pending Payments: ${userContext.pendingPayments || 0}
- Active Violations: ${userContext.violations || 0}

YOUR CAPABILITIES:
1. **Application Assistance**: Guide users through license applications (Professional/Non-Professional, Light/Motor/Both)
2. **Vehicle Services**: Help with vehicle registration, route permits, tax token renewals
3. **Payment Queries**: Check payment status, calculate fees, explain payment processes
4. **Violations & Fines**: Show traffic violations, explain fine amounts, guide payment
5. **Document Verification**: Verify licenses, vehicles, route permits
6. **Renewal Services**: Check expiry dates, guide renewal processes
7. **Exam & Test Support**: Access question bank, book exam slots, explain test requirements
8. **General Information**: Answer questions about BRTA services, office hours, requirements

COMMUNICATION GUIDELINES:
- Be friendly, professional, and helpful
- Respond in the user's preferred language (English or Bangla)
- Use simple, clear language
- Provide step-by-step guidance when needed
- Offer quick action buttons when appropriate
- If you don't know something, admit it and suggest alternatives

IMPORTANT RULES:
- Never share sensitive information like passwords or full payment details
- Always verify user identity for sensitive operations
- Guide users to proper channels for official processes
- Be concise but thorough in responses
- Use emojis sparingly to enhance readability

When users ask about their specific data (applications, vehicles, payments, etc.), I will provide real-time information from the database.`;

export class ChatbotService {
  constructor() {
    this.chatHistory = [];
  }

  // Initialize chat with user context
  async initializeChat(userContext) {
    this.userContext = userContext;
    
    // Initialize conversation with system message
    const systemMessage = getSystemPrompt(userContext);
    this.chatHistory = [
      {
        role: 'system',
        content: systemMessage
      }
    ];
  }

  // Send message and get response
  async sendMessage(message, language = 'en') {
    try {
      // Add language context to the message with clear instructions
      const contextualMessage = `${message}\n\n[IMPORTANT: Respond in ${language === 'en' ? 'English' : 'Bangla (Bengali)'} language. Provide a helpful, complete answer.]`;
      
      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        content: contextualMessage
      });

      // Call OpenRouter API
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'BRTA Extended Portal'
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: this.chatHistory,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenRouter error details:', errorData);
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let assistantMessage = data.choices[0].message.content;
      
      // Clean up any special tokens
      let cleanMessage = assistantMessage.replace(/<s>|<\/s>|<\|.*?\|>/g, '').trim();
      
      // If message is empty after cleaning, provide a fallback
      if (!cleanMessage) {
        cleanMessage = language === 'en' 
          ? "I'm here to help! Could you please rephrase your question?"
          : "আমি সাহায্য করতে এখানে আছি! অনুগ্রহ করে আপনার প্রশ্নটি আবার বলুন?";
      }
      
      // Add assistant response to history
      this.chatHistory.push({
        role: 'assistant',
        content: cleanMessage
      });
      
      return cleanMessage;
    } catch (error) {
      console.error('Chatbot error:', error);
      throw error;
    }
  }

  // Get user's application data
  async getUserApplications(userId) {
    const { data, error } = await supabase
      .from('license_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get user's vehicles
  async getUserVehicles(userId) {
    const { data, error } = await supabase
      .from('registered_vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get user's payments
  async getUserPayments(userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    return data;
  }

  // Get user's violations
  async getUserViolations(userId) {
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
    return data;
  }

  // Get user's licenses
  async getUserLicenses(userId) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .order('issue_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get user's route permits
  async getUserRoutePermits(userId) {
    const { data, error } = await supabase
      .from('route_permits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Calculate license fee
  calculateLicenseFee(licenseType, licenseCategory) {
    const fees = {
      'Light': { 'Professional': 2387, 'Non-Professional': 4212 },
      'Motor': { 'Professional': 2387, 'Non-Professional': 4212 },
      'Light+Motor': { 'Professional': 3387, 'Non-Professional': 5212 }
    };
    
    return fees[licenseType]?.[licenseCategory] || 0;
  }

  // Generate quick action suggestions
  getQuickActions(userContext, language = 'en') {
    const actions = {
      en: [
        { id: 'check_applications', label: 'Check My Applications', icon: '📋' },
        { id: 'check_vehicles', label: 'My Vehicles', icon: '🚗' },
        { id: 'check_violations', label: 'Traffic Violations', icon: '🚨' },
        { id: 'calculate_fee', label: 'Calculate Fee', icon: '💰' },
        { id: 'renewal_status', label: 'Renewal Status', icon: '🔄' },
        { id: 'exam_help', label: 'Exam Help', icon: '📚' },
      ],
      bn: [
        { id: 'check_applications', label: 'আমার আবেদন দেখুন', icon: '📋' },
        { id: 'check_vehicles', label: 'আমার যানবাহন', icon: '🚗' },
        { id: 'check_violations', label: 'ট্রাফিক লঙ্ঘন', icon: '🚨' },
        { id: 'calculate_fee', label: 'ফি গণনা করুন', icon: '💰' },
        { id: 'renewal_status', label: 'নবায়ন স্থিতি', icon: '🔄' },
        { id: 'exam_help', label: 'পরীক্ষা সাহায্য', icon: '📚' },
      ]
    };
    
    return actions[language] || actions.en;
  }

  // Handle quick action clicks
  async handleQuickAction(actionId, userId, language = 'en') {
    const responses = {
      en: {
        check_applications: async () => {
          const apps = await this.getUserApplications(userId);
          if (apps.length === 0) {
            return "You don't have any license applications yet. Would you like to apply for a driving license?";
          }
          const appList = apps.map(app => 
            `• ${app.application_number} - ${app.license_type} ${app.license_category} (${app.status})`
          ).join('\n');
          return `Here are your license applications:\n\n${appList}\n\nWould you like details about any specific application?`;
        },
        check_vehicles: async () => {
          const vehicles = await this.getUserVehicles(userId);
          if (vehicles.length === 0) {
            return "You don't have any registered vehicles yet. Would you like to register a vehicle?";
          }
          const vehicleList = vehicles.map(v => 
            `• ${v.registration_plate} - ${v.vehicle_type} (${v.status})`
          ).join('\n');
          return `Here are your registered vehicles:\n\n${vehicleList}\n\nHow can I help with your vehicles?`;
        },
        check_violations: async () => {
          const violations = await this.getUserViolations(userId);
          if (violations.length === 0) {
            return "Great news! You don't have any traffic violations. Keep driving safely! 🎉";
          }
          const unpaid = violations.filter(v => v.payment_status === 'unpaid');
          return `You have ${violations.length} violation(s), ${unpaid.length} unpaid.\n\nWould you like to see details or make a payment?`;
        },
        calculate_fee: () => {
          return "I can help calculate fees for:\n• Driving License (Professional/Non-Professional)\n• Vehicle Registration\n• Route Permit\n• Tax Token Renewal\n\nWhich fee would you like to calculate?";
        },
        renewal_status: async () => {
          const licenses = await this.getUserLicenses(userId);
          if (licenses.length === 0) {
            return "You don't have any licenses yet. Apply for one first!";
          }
          const license = licenses[0];
          const daysUntilExpiry = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 0) {
            return `Your license ${license.license_number} has expired ${Math.abs(daysUntilExpiry)} days ago. You need to renew it immediately!`;
          }
          return `Your license ${license.license_number} expires in ${daysUntilExpiry} days (${license.expiry_date}). ${daysUntilExpiry < 30 ? 'Consider renewing soon!' : ''}`;
        },
        exam_help: () => {
          return "I can help with:\n• Practice questions\n• Test center information\n• Booking exam slots\n• Exam requirements\n• Passing criteria\n\nWhat would you like to know?";
        }
      },
      bn: {
        check_applications: async () => {
          const apps = await this.getUserApplications(userId);
          if (apps.length === 0) {
            return "আপনার এখনও কোনো লাইসেন্স আবেদন নেই। আপনি কি ড্রাইভিং লাইসেন্সের জন্য আবেদন করতে চান?";
          }
          const appList = apps.map(app => 
            `• ${app.application_number} - ${app.license_type} ${app.license_category} (${app.status})`
          ).join('\n');
          return `এখানে আপনার লাইসেন্স আবেদন:\n\n${appList}\n\nকোনো নির্দিষ্ট আবেদনের বিবরণ চান?`;
        },
        check_vehicles: async () => {
          const vehicles = await this.getUserVehicles(userId);
          if (vehicles.length === 0) {
            return "আপনার এখনও কোনো নিবন্ধিত যানবাহন নেই। আপনি কি একটি যানবাহন নিবন্ধন করতে চান?";
          }
          const vehicleList = vehicles.map(v => 
            `• ${v.registration_plate} - ${v.vehicle_type} (${v.status})`
          ).join('\n');
          return `এখানে আপনার নিবন্ধিত যানবাহন:\n\n${vehicleList}\n\nআপনার যানবাহন নিয়ে কীভাবে সাহায্য করতে পারি?`;
        },
        check_violations: async () => {
          const violations = await this.getUserViolations(userId);
          if (violations.length === 0) {
            return "দুর্দান্ত খবর! আপনার কোনো ট্রাফিক লঙ্ঘন নেই। নিরাপদে গাড়ি চালাতে থাকুন! 🎉";
          }
          const unpaid = violations.filter(v => v.payment_status === 'unpaid');
          return `আপনার ${violations.length}টি লঙ্ঘন আছে, ${unpaid.length}টি অপরিশোধিত।\n\nবিবরণ দেখতে বা পেমেন্ট করতে চান?`;
        },
        calculate_fee: () => {
          return "আমি এই ফি গণনা করতে পারি:\n• ড্রাইভিং লাইসেন্স (পেশাদার/অ-পেশাদার)\n• যানবাহন নিবন্ধন\n• রুট পারমিট\n• ট্যাক্স টোকেন নবায়ন\n\nকোন ফি গণনা করতে চান?";
        },
        renewal_status: async () => {
          const licenses = await this.getUserLicenses(userId);
          if (licenses.length === 0) {
            return "আপনার এখনও কোনো লাইসেন্স নেই। প্রথমে একটির জন্য আবেদন করুন!";
          }
          const license = licenses[0];
          const daysUntilExpiry = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 0) {
            return `আপনার লাইসেন্স ${license.license_number} ${Math.abs(daysUntilExpiry)} দিন আগে মেয়াদোত্তীর্ণ হয়েছে। অবিলম্বে নবায়ন করুন!`;
          }
          return `আপনার লাইসেন্স ${license.license_number} ${daysUntilExpiry} দিনে মেয়াদোত্তীর্ণ হবে (${license.expiry_date})। ${daysUntilExpiry < 30 ? 'শীঘ্রই নবায়ন করার কথা বিবেচনা করুন!' : ''}`;
        },
        exam_help: () => {
          return "আমি সাহায্য করতে পারি:\n• অনুশীলন প্রশ্ন\n• পরীক্ষা কেন্দ্রের তথ্য\n• পরীক্ষার স্লট বুকিং\n• পরীক্ষার প্রয়োজনীয়তা\n• পাস করার মানদণ্ড\n\nআপনি কী জানতে চান?";
        }
      }
    };
    
    const handler = responses[language]?.[actionId];
    if (handler) {
      return await handler();
    }
    
    return language === 'en' 
      ? "I'm here to help! What would you like to know?"
      : "আমি সাহায্য করতে এখানে আছি! আপনি কী জানতে চান?";
  }

  // Get chat history
  getHistory() {
    return this.chatHistory.filter(msg => msg.role !== 'system');
  }

  // Clear chat history
  clearHistory() {
    const systemMessage = this.chatHistory.find(msg => msg.role === 'system');
    this.chatHistory = systemMessage ? [systemMessage] : [];
  }
}

export const chatbotService = new ChatbotService();
