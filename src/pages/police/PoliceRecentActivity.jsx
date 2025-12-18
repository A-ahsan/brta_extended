import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Warning,
  User,
  Clock,
  Car,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const PoliceRecentActivity = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [recentChecks, setRecentChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch recent police inspections
      const { data: inspections, error: inspectionsError } = await supabase
        .from('police_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (inspectionsError) throw inspectionsError;

      // Fetch all registered vehicles
      const { data: allVehicles } = await supabase
        .from('registered_vehicles')
        .select('*');

      // Fetch all licenses
      const { data: allLicenses } = await supabase
        .from('licenses')
        .select('*');

      // Fetch all profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*');

      let error = null;

      // Process inspections with vehicle data
      const formattedChecks = await Promise.all((inspections || []).map(async (inspection) => {
        const vehicle = allVehicles?.find(v => v.id === inspection.registered_vehicle_id);
        if (!vehicle) return null;

        const officer = allProfiles?.find(p => p.id === inspection.police_user_id);
        const userLicense = allLicenses?.find(l => l.user_id === vehicle.user_id);

        // Fetch unpaid violations for this vehicle
        const { data: violations } = await supabase
          .from('traffic_violations')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('payment_status', 'Unpaid');

        const unpaidFines = violations?.length || 0;

        // Determine status
        let status = 'Valid';
        if (unpaidFines > 0) {
          status = 'Fined';
        } else if (userLicense) {
          const expiryDate = new Date(userLicense.expiry_date);
          const today = new Date();
          if (expiryDate < today || userLicense.expired === 1) {
            status = 'Expired';
          }
        } else {
          status = 'Expired'; // No license found
        }

        // Format time and date
        const inspectionTime = new Date(inspection.created_at);
        const timeString = inspectionTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const dateString = inspectionTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        return {
          id: inspection.id,
          type: 'inspection',
          plate: language === 'bn' ? vehicle.registration_plate?.bn : vehicle.registration_plate?.en,
          model: `${vehicle.vehicle_name} ${vehicle.model}`,
          status: status,
          time: timeString,
          date: dateString,
          officer: officer ? (language === 'bn' ? (officer.full_name_bn || officer.full_name) : officer.full_name) : 'Unknown Officer',
          location: language === 'bn' 
            ? (inspection.location_bn || inspection.location)
            : inspection.location,
          remarks: inspection.remarks || null,
          inspectionType: inspection.inspection_type,
          createdAt: inspection.created_at
        };
      }));

      // Filter out null entries
      const filteredInspections = formattedChecks.filter(check => check !== null);

      // Fetch recent violations added by police
      const { data: violations, error: violationsError } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          registered_vehicles!inner(
            id,
            registration_plate,
            vehicle_name,
            model,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (violationsError) throw violationsError;

      // Format violations for display
      const formattedViolations = (violations || []).map(violation => {
        const vehicle = violation.registered_vehicles;
        if (!vehicle) return null;

        const officer = allProfiles?.find(p => p.id === violation.police_user_id);
        
        const violationTime = new Date(violation.created_at);
        const timeString = violationTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const dateString = violationTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        return {
          id: violation.id,
          type: 'violation',
          plate: language === 'bn' ? vehicle.registration_plate?.bn : vehicle.registration_plate?.en,
          model: `${vehicle.vehicle_name} ${vehicle.model}`,
          status: 'Fined',
          time: timeString,
          date: dateString,
          officer: officer ? (language === 'bn' ? (officer.full_name_bn || officer.full_name) : officer.full_name) : 'Unknown Officer',
          location: language === 'bn' 
            ? (violation.location_bn || violation.location)
            : violation.location,
          violationNumber: violation.violation_number,
          violationType: language === 'bn' ? violation.violation_name_bn : violation.violation_name_en,
          fineAmount: violation.total_amount,
          createdAt: violation.created_at
        };
      }).filter(v => v !== null);

      // Fetch recent impoundments
      const { data: impoundments, error: impoundmentsError } = await supabase
        .from('vehicle_impoundments')
        .select(`
          *,
          registered_vehicles!inner(
            id,
            registration_plate,
            vehicle_name,
            model,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (impoundmentsError) throw impoundmentsError;

      // Format impoundments for display
      const formattedImpoundments = (impoundments || []).map(impoundment => {
        const vehicle = impoundment.registered_vehicles;
        if (!vehicle) return null;

        const officer = allProfiles?.find(p => p.id === impoundment.police_user_id);
        
        const impoundTime = new Date(impoundment.created_at);
        const timeString = impoundTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const dateString = impoundTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        return {
          id: impoundment.id,
          type: 'impoundment',
          plate: language === 'bn' ? vehicle.registration_plate?.bn : vehicle.registration_plate?.en,
          model: `${vehicle.vehicle_name} ${vehicle.model}`,
          status: 'Impounded',
          time: timeString,
          date: dateString,
          officer: officer ? (language === 'bn' ? (officer.full_name_bn || officer.full_name) : officer.full_name) : 'Unknown Officer',
          location: language === 'bn' 
            ? (impoundment.impound_location_bn || impoundment.impound_location)
            : impoundment.impound_location,
          impoundNumber: impoundment.impound_number,
          impoundReason: language === 'bn' ? impoundment.reason_bn : impoundment.reason_en,
          impoundFee: impoundment.total_amount,
          createdAt: impoundment.created_at
        };
      }).filter(i => i !== null);

      // Merge inspections, violations, and impoundments, sort by creation date
      const allActivities = [...filteredInspections, ...formattedViolations, ...formattedImpoundments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setRecentChecks(allActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      toast.error(language === 'en' ? 'Failed to load recent activity' : 'সাম্প্রতিক কার্যকলাপ লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Valid':
        return <CheckCircle size={24} weight="fill" className="text-success" />;
      case 'Expired':
        return <XCircle size={24} weight="fill" className="text-danger" />;
      case 'Fined':
        return <Warning size={24} weight="fill" className="text-yellow-500" />;
      case 'Impounded':
        return <Car size={24} weight="fill" className="text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Valid':
        return 'bg-success/20 text-success border-success';
      case 'Impounded':
        return 'bg-orange-500/20 text-orange-600 border-orange-500';
      case 'Expired':
        return 'bg-danger/20 text-danger border-danger';
      case 'Fined':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {language === 'en' ? 'Recent Activity' : 'সাম্প্রতিক কার্যকলাপ'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Live feed of vehicle verification checks across all checkpoints' : 'সমস্ত চেকপয়েন্ট জুড়ে যানবাহন যাচাইকরণ পরীক্ষার লাইভ ফিড'}
            </p>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : recentChecks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {language === 'en' ? 'No recent activity found' : 'কোনো সাম্প্রতিক কার্যকলাপ পাওয়া যায়নি'}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-green-500 to-primary-dark"></div>

              <div className="space-y-6">
                {recentChecks.slice(0, displayCount).map((check, index) => (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-6 group"
                  >
                    {/* Timeline Dot */}
                    <div className="relative flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                        className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 border-4 border-primary shadow-lg flex items-center justify-center z-10 group-hover:scale-110 transition-transform"
                      >
                        {getStatusIcon(check.status)}
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                        className="absolute inset-0 w-11 h-11 rounded-full bg-primary"
                      />
                    </div>

                    {/* Content Card */}
                    <motion.div
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="flex-1 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-xl transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-bold text-gray-800 dark:text-white">
                              {check.plate}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(check.status)}`}>
                              {t[check.status.toLowerCase()] || check.status}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 font-medium">{check.model}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-500 dark:text-gray-400 text-sm">
                            <div className="flex items-center justify-end gap-1 mb-1">
                              <Clock size={16} />
                              <span className="font-semibold">{check.time}</span>
                            </div>
                            <div className="text-xs">{check.date}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 text-sm">
                          <User size={18} className="text-primary" />
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Officer' : 'অফিসার'}</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{check.officer}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Location' : 'অবস্থান'}</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{check.location}</p>
                          </div>
                        </div>
                      </div>

                      {/* Remarks for Inspections */}
                      {check.type === 'inspection' && check.remarks && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{language === 'en' ? 'Remarks' : 'মন্তব্য'}</p>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{check.remarks}</p>
                        </div>
                      )}

                      {/* Violation Details */}
                      {check.type === 'violation' && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Violation' : 'লঙ্ঘনের ধরন'}</p>
                              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">{check.violationType}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Fine Amount' : 'জরিমানা'}</p>
                              <p className="text-red-600 dark:text-red-400 text-sm font-bold">BDT {check.fineAmount}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Violation Number' : 'লঙ্ঘন নম্বর'}</p>
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-mono">{check.violationNumber}</p>
                          </div>
                        </div>
                      )}

                      {/* Impoundment Details */}
                      {check.type === 'impoundment' && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Car size={18} weight="bold" className="text-orange-600 dark:text-orange-400" />
                              <span className="font-bold text-orange-800 dark:text-orange-300 text-sm">
                                {language === 'en' ? 'VEHICLE IMPOUNDED' : 'গাড়ি আটক করা হয়েছে'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Reason' : 'কারণ'}</p>
                              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">{check.impoundReason}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Fee' : 'ফি'}</p>
                              <p className="text-orange-600 dark:text-orange-400 text-sm font-bold">BDT {check.impoundFee} + 200/day</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Impound Number' : 'আটক নম্বর'}</p>
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-mono">{check.impoundNumber}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Indicator */}
                      {check.status !== 'Valid' && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            check.status === 'Expired' ? 'bg-danger/10 text-danger' : 'bg-yellow-500/10 text-yellow-600'
                          }`}>
                            {check.status === 'Expired' && (language === 'en' ? 'Action Required: Documents Expired' : 'পদক্ষেপ প্রয়োজন: নথি মেয়াদ শেষ')}
                            {check.status === 'Fined' && (language === 'en' ? 'Outstanding Fines Detected' : 'বকেয়া জরিমানা সনাক্ত')}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Load More */}
          {!loading && recentChecks.length > displayCount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <button 
                onClick={() => setDisplayCount(prev => prev + 10)}
                className="px-8 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                {language === 'en' ? 'Load More Activity' : 'আরো কার্যকলাপ লোড করুন'}
              </button>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {language === 'en' ? `Showing ${displayCount} of ${recentChecks.length}` : `${recentChecks.length} এর মধ্যে ${displayCount} দেখানো হচ্ছে`}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(PoliceRecentActivity);
