import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  IdentificationCard,
  Car,
  ChartLine,
  TrendUp,
} from 'phosphor-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../../components/StatCard';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';

const AdminOverview = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const monthlyData = [
    { month: 'Jan', applications: 120, approved: 100, rejected: 20 },
    { month: 'Feb', applications: 150, approved: 130, rejected: 20 },
    { month: 'Mar', applications: 180, approved: 160, rejected: 20 },
    { month: 'Apr', applications: 200, approved: 175, rejected: 25 },
    { month: 'May', applications: 220, approved: 190, rejected: 30 },
    { month: 'Jun', applications: 250, approved: 220, rejected: 30 },
  ];

  const testCenterData = [
    { name: 'Mirpur', value: 35 },
    { name: 'Banani', value: 25 },
    { name: 'Uttara', value: 20 },
    { name: 'Dhanmondi', value: 15 },
    { name: 'Others', value: 5 },
  ];

  const COLORS = ['#006A4E', '#28A745', '#FFB020', '#DC3545', '#6C757D'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          icon={<Users size={48} weight="duotone" />}
          title={t.totalUsers}
          value="12,450"
          color="primary"
          trend={15}
        />
        <StatCard
          icon={<IdentificationCard size={48} weight="duotone" />}
          title={t.dlRequests}
          value="856"
          color="warning"
          trend={8}
        />
        <StatCard
          icon={<Car size={48} weight="duotone" />}
          title={t.vehiclesRegistered}
          value="8,234"
          color="success"
          trend={12}
        />
        <StatCard
          icon={<ChartLine size={48} weight="duotone" />}
          title={language === 'en' ? 'Monthly Revenue' : 'মাসিক আয়'}
          value="৳ 2.5M"
          color="info"
          trend={20}
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Applications Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {language === 'en' ? 'Monthly Applications' : 'মাসিক আবেদন'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'en' ? 'Trend over the last 6 months' : 'গত ৬ মাসের প্রবণতা'}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-primary to-green-600 rounded-xl">
                <TrendUp size={28} weight="bold" className="text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                <XAxis dataKey="month" stroke="#6C757D" />
                <YAxis stroke="#6C757D" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E9ECEF',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="applications" fill="#006A4E" radius={[8, 8, 0, 0]} />
                <Bar dataKey="approved" fill="#28A745" radius={[8, 8, 0, 0]} />
                <Bar dataKey="rejected" fill="#DC3545" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#006A4E]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Applications' : 'আবেদন'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#28A745]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Approved' : 'অনুমোদিত'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#DC3545]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Rejected' : 'প্রত্যাখ্যাত'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Test Center Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                {language === 'en' ? 'Test Center Distribution' : 'পরীক্ষা কেন্দ্র বিতরণ'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {language === 'en' ? 'Percentage of rush per center' : 'প্রতি কেন্দ্রে রাশের শতাংশ'}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={testCenterData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {testCenterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default React.memo(AdminOverview);
