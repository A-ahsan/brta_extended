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
    if (user) fetchPayments();
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

  async function handlePay() {
    setInitiating(true);
    const tran_id = `DL${Date.now()}${Math.floor(Math.random()*1000)}`;
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
    await supabase.from('payments').insert({
      user_id: user.id,
      application_id: application.id,
      amount: LICENSE_FEE,
      currency: 'BDT',
      tran_id,
      status: 'initiated',
    });
    // Call backend to get payment URL
    const res = await fetch('http://localhost:5000/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: LICENSE_FEE,
        customerName: user.user_metadata?.full_name || user.email,
        customerEmail: user.email,
        tran_id,
        application_id: application.id,
        user_id: user.id,
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
    <div className="max-w-3xl mx-auto p-6">
      <motion.h2 initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        {language === 'en' ? 'My Payments' : 'আমার পেমেন্টসমূহ'}
      </motion.h2>
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{language === 'en' ? 'License Fee' : 'লাইসেন্স ফি'}</span>
          <span className="text-lg font-bold text-primary">৳ {LICENSE_FEE}</span>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePay}
            disabled={initiating}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold shadow hover:bg-primary-dark transition disabled:opacity-60"
          >
            {initiating ? (language === 'en' ? 'Processing...' : 'প্রসেস হচ্ছে...') : (language === 'en' ? 'Pay Now' : 'এখনই পরিশোধ করুন')}
          </motion.button>
        </div>
      </div>
      <div className="mb-4 flex flex-col md:flex-row gap-2 items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={language === 'en' ? 'Search by ID, amount, date...' : 'আইডি, পরিমাণ, তারিখ দিয়ে খুঁজুন...'}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white w-full md:w-1/3"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
        >
          <option value="date">{language === 'en' ? 'Sort by Date' : 'তারিখ অনুযায়ী সাজান'}</option>
          <option value="amount">{language === 'en' ? 'Sort by Amount' : 'পরিমাণ অনুযায়ী সাজান'}</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
        >
          <option value="success">{language === 'en' ? 'Successful' : 'সফল'}</option>
          <option value="pending">{language === 'en' ? 'Pending' : 'অপেক্ষমাণ'}</option>
          <option value="failed">{language === 'en' ? 'Failed' : 'ব্যর্থ'}</option>
          <option value="all">{language === 'en' ? 'All' : 'সব'}</option>
        </select>
      </div>
      <motion.h3 initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
        {language === 'en' ? 'Payment History' : 'পেমেন্ট হিস্ট্রি'}
      </motion.h3>
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300">Date</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300">Transaction ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8">{language === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">{language === 'en' ? 'No payments found' : 'কোনো পেমেন্ট পাওয়া যায়নি'}</td></tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3">{new Date(p.created_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}</td>
                  <td className="px-4 py-3 font-mono">{p.tran_id}</td>
                  <td className="px-4 py-3">৳ {p.amount}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${p.status === 'success' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
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
