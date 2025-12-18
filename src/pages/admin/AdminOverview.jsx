import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminOverview = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApplications: 0,
    registeredVehicles: 0,
    monthlyRevenue: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [testCenterData, setTestCenterData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch pending license applications
      const { count: pendingCount, error: pendingError } = await supabase
        .from('license_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Fetch total registered vehicles
      const { count: vehiclesCount, error: vehiclesError } = await supabase
        .from('registered_vehicles')
        .select('*', { count: 'exact', head: true });

      if (vehiclesError) throw vehiclesError;

      // Calculate monthly revenue from payments (excluding violation fines)
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'success')
        .neq('payment_type', 'violation_fine')
        .gte('created_at', startOfMonth);

      if (paymentsError) throw paymentsError;

      const monthlyRevenue = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        pendingApplications: pendingCount || 0,
        registeredVehicles: vehiclesCount || 0,
        monthlyRevenue: monthlyRevenue
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error(language === 'en' ? 'Failed to load statistics' : 'পরিসংখ্যান লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      // Fetch monthly applications data for last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const monthlyStats = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const year = currentMonth - i < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        const startDate = new Date(year, monthIndex, 1).toISOString();
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

        // Get license applications
        const { count: licenseApps } = await supabase
          .from('license_applications')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Get route permits
        const { count: routePermits } = await supabase
          .from('route_permits')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Get ownership transfers
        const { count: ownershipTransfers } = await supabase
          .from('ownership_transfer_applications')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Get vehicle registrations
        const { count: vehicleRegs } = await supabase
          .from('registered_vehicles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const totalApps = (licenseApps || 0) + (routePermits || 0) + (ownershipTransfers || 0) + (vehicleRegs || 0);

        monthlyStats.push({
          month: months[monthIndex],
          total: totalApps,
          license: licenseApps || 0,
          routePermit: routePermits || 0,
          ownership: ownershipTransfers || 0,
          vehicle: vehicleRegs || 0
        });
      }

      setMonthlyData(monthlyStats);

      // Fetch test center distribution by division
      const { data: centers, error: centersError } = await supabase
        .from('test_centers')
        .select('division, is_active')
        .eq('is_active', true);

      if (centersError) {
        console.error('Error fetching test centers:', centersError);
        setTestCenterData([{ name: 'No Data', value: 100 }]);
        return;
      }

      // Count centers per division
      const divisionCounts = {};
      centers?.forEach(center => {
        const division = center.division || 'Others';
        divisionCounts[division] = (divisionCounts[division] || 0) + 1;
      });

      // Convert to percentage data
      const total = centers?.length || 0;
      if (total === 0) {
        setTestCenterData([{ name: 'No Data', value: 100 }]);
        return;
      }

      const divisionData = Object.entries(divisionCounts).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100)
      }));

      setTestCenterData(divisionData);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Set empty data on error
      setMonthlyData([]);
      setTestCenterData([{ name: 'No Data', value: 100 }]);
    }
  };

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
          value={loading ? '...' : stats.totalUsers.toLocaleString()}
          color="primary"
        />
        <StatCard
          icon={<IdentificationCard size={48} weight="duotone" />}
          title={t.dlRequests}
          value={loading ? '...' : stats.pendingApplications.toLocaleString()}
          color="warning"
        />
        <StatCard
          icon={<Car size={48} weight="duotone" />}
          title={t.vehiclesRegistered}
          value={loading ? '...' : stats.registeredVehicles.toLocaleString()}
          color="success"
        />
        <StatCard
          icon={<ChartLine size={48} weight="duotone" />}
          title={language === 'en' ? 'Monthly Revenue' : 'মাসিক আয়'}
          value={loading ? '...' : `৳ ${(stats.monthlyRevenue / 1000).toFixed(1)}K`}
          color="info"
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
                <Bar dataKey="license" fill="#14B8A6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="routePermit" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                <Bar dataKey="ownership" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="vehicle" fill="#EC4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#14B8A6]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'License' : 'লাইসেন্স'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Route Permit' : 'রুট পারমিট'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Ownership' : 'মালিকানা'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EC4899]"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Vehicle Reg' : 'গাড়ি রেজি'}</span>
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
                {language === 'en' ? 'Test Centers by Division' : 'বিভাগ অনুযায়ী পরীক্ষা কেন্দ্র'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {language === 'en' ? 'Distribution of test centers across divisions' : 'বিভাগ জুড়ে পরীক্ষা কেন্দ্রের বিতরণ'}
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
