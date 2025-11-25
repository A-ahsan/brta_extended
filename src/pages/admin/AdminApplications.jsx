import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  FunnelSimple,
  Eye,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';

const AdminApplications = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const pendingApplications = [
    { id: 1, name: 'Ahmed Khan', type: 'New License', date: '2025-11-12', applicationNo: 'DL2025010', status: 'pending' },
    { id: 2, name: 'Fatima Rahman', type: 'Renewal', date: '2025-11-11', applicationNo: 'DL2025011', status: 'pending' },
    { id: 3, name: 'Karim Hossain', type: 'Duplicate', date: '2025-11-10', applicationNo: 'DL2025012', status: 'pending' },
    { id: 4, name: 'Ayesha Begum', type: 'New License', date: '2025-11-09', applicationNo: 'DL2025013', status: 'pending' },
    { id: 5, name: 'Rahim Uddin', type: 'Renewal', date: '2025-11-08', applicationNo: 'DL2025014', status: 'pending' },
    { id: 6, name: 'Nasrin Akter', type: 'New License', date: '2025-11-07', applicationNo: 'DL2025015', status: 'pending' },
  ];

  const filteredApplications = pendingApplications.filter(app => {
    const matchesType = filterType === 'all' || app.type === filterType;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.applicationNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {language === 'en' ? 'Pending Applications' : 'মুলতুবি আবেদন'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'Review and manage license applications' : 'লাইসেন্স আবেদন পর্যালোচনা এবং পরিচালনা করুন'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Pending' : 'মোট মুলতুবি'}</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'en' ? 'Search by name or application no...' : 'নাম বা আবেদন নম্বর দিয়ে অনুসন্ধান করুন...'}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FunnelSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">{language === 'en' ? 'All Types' : 'সকল ধরন'}</option>
                <option value="New License">{language === 'en' ? 'New License' : 'নতুন লাইসেন্স'}</option>
                <option value="Renewal">{language === 'en' ? 'Renewal' : 'নবায়ন'}</option>
                <option value="Duplicate">{language === 'en' ? 'Duplicate' : 'প্রতিলিপি'}</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Showing' : 'দেখানো হচ্ছে'} <span className="font-bold text-primary">{filteredApplications.length}</span> {language === 'en' ? 'of' : 'এর মধ্যে'} <span className="font-bold">{pendingApplications.length}</span> {language === 'en' ? 'applications' : 'আবেদন'}
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
              >
                {language === 'en' ? 'Clear Filters' : 'ফিল্টার সাফ করুন'}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Application No' : 'আবেদন নং'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Applicant Name' : 'আবেদনকারীর নাম'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Type' : 'ধরন'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Date' : 'তারিখ'}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Actions' : 'কার্যক্রম'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        {language === 'en' ? 'No applications found' : 'কোনো আবেদন পাওয়া যায়নি'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app, index) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 dark:text-white">{app.applicationNo}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 dark:text-white">{app.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-semibold">
                          {app.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{app.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                            title={language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                          >
                            <Eye size={20} weight="bold" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-success/20 text-success rounded-lg hover:bg-success hover:text-white transition-colors"
                            title={language === 'en' ? 'Approve' : 'অনুমোদন'}
                          >
                            <CheckCircle size={20} weight="bold" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-danger/20 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors"
                            title={language === 'en' ? 'Reject' : 'প্রত্যাখ্যান'}
                          >
                            <XCircle size={20} weight="bold" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(AdminApplications);
