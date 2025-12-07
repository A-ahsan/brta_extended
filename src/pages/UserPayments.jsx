import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/AppContext';
import { translations } from '../utils/translations';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const LICENSE_FEE = 2230; // Set your driving license fee here

export default function UserPayments() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("success");

  useEffect(() => {
    if (user) {
      fetchPayments();

      // Subscribe to realtime payment updates
      const paymentSubscription = supabase
        .channel('user-payments-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Payment realtime update:', payload);
            fetchPayments();
            
            // Show toast for new payments
            if (payload.eventType === 'UPDATE' && payload.new.status === 'success') {
              toast.success('Payment confirmed!');
            }
          }
        )
        .subscribe();

      return () => {
        paymentSubscription.unsubscribe();
      };
    }
  }, [user]);

  async function fetchPayments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load payments');
    setPayments(data || []);
    setLoading(false);
  }

  // Get dynamic backend URL based on current hostname
  const getBackendUrl = () => {
    const hostname = window.location.hostname;
    const port = 5000;
    return `http://${hostname}:${port}`;
  };

  async function handlePay() {
    setInitiating(true);
    const tran_id = `DL${Date.now()}${Math.floor(Math.random()*1000)}`;
    const backendUrl = getBackendUrl();
    
    // Find the user's latest application
    const { data: apps } = await supabase
      .from('license_applications')
      .select('id, application_number, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const application = apps && apps[0];
    if (!application) {
      toast.error('No license application found');
      setInitiating(false);
      return;
    }
    // Insert payment record as initiated
    const { data: paymentData, error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      application_id: application.id,
      amount: LICENSE_FEE,
      currency: 'BDT',
      tran_id,
      status: 'initiated',
      payment_type: 'application', // Explicitly set payment type
    }).select().single();
    
    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      toast.error('Failed to create payment record');
      setInitiating(false);
      return;
    }
    
    console.log('Payment record created:', paymentData);
    
    // Call backend to get payment URL
    const res = await fetch(`${backendUrl}/api/payment/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: LICENSE_FEE,
        customerName: user.user_metadata?.full_name || user.email,
        customerEmail: user.email,
        tran_id,
        application_id: application.id,
        user_id: user.id,
        frontend_url: window.location.origin, // Pass frontend origin
      }),
    });
    const data = await res.json();
    setInitiating(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error('Failed to initiate payment');
    }
  }

  // Filter, search, and sort payments
  const filteredPayments = payments
    .filter(p => filterStatus === 'all' ? true : p.status === filterStatus)
    .filter(p => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.tran_id?.toLowerCase().includes(s) ||
        String(p.amount).includes(s) ||
        new Date(p.created_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'amount') return b.amount - a.amount;
      return 0;
    });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <motion.h2 initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        {language === 'en' ? 'My Payments' : 'আমার পেমেন্টসমূহ'}
      </motion.h2>
      <div className="mb-6 flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={language === 'en' ? 'Search by ID, amount, date...' : 'আইডি, পরিমাণ, তারিখ দিয়ে খুঁজুন...'}
          className="px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full md:w-1/3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        >
          <option value="date">{language === 'en' ? 'Sort by Date' : 'তারিখ অনুযায়ী সাজান'}</option>
          <option value="amount">{language === 'en' ? 'Sort by Amount' : 'পরিমাণ অনুযায়ী সাজান'}</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        >
          <option value="success">{language === 'en' ? 'Successful' : 'সফল'}</option>
          <option value="failed">{language === 'en' ? 'Failed' : 'ব্যর্থ'}</option>
          <option value="all">{language === 'en' ? 'All' : 'সব'}</option>
        </select>
      </div>
      <motion.h3 initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        {language === 'en' ? 'Payment History' : 'পেমেন্ট হিস্ট্রি'}
      </motion.h3>
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-primary/10 to-green-600/10 dark:from-primary/20 dark:to-green-600/20">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Date</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Transaction ID</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Amount</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-600 dark:text-gray-400">{language === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500 dark:text-gray-400">{language === 'en' ? 'No payments found' : 'কোনো পেমেন্ট পাওয়া যায়নি'}</td></tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{new Date(p.created_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}</td>
                  <td className="px-6 py-4 font-mono text-gray-800 dark:text-gray-300">{p.tran_id}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">৳ {p.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${p.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : p.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
