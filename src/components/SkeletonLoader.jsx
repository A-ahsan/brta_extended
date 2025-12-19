import React from 'react';
import { motion } from 'framer-motion';

// Reusable skeleton loader components with shimmer effect

export const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded skeleton-shimmer"></div>
  </div>
);

// Card skeleton for dashboard cards
export const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
    <div className="animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2 skeleton-shimmer"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 skeleton-shimmer"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/6 skeleton-shimmer"></div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
      </div>
    </div>
  </div>
);

// License card skeleton
export const LicenseCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl shadow-xl"
  >
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 w-32 bg-gray-400 dark:bg-gray-600 rounded skeleton-shimmer"></div>
        <div className="h-6 w-24 bg-gray-400 dark:bg-gray-600 rounded skeleton-shimmer"></div>
      </div>
      <div className="flex gap-4">
        <div className="w-24 h-32 bg-gray-400 dark:bg-gray-600 rounded skeleton-shimmer"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-400 dark:bg-gray-600 rounded w-3/4 skeleton-shimmer"></div>
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-1/2 skeleton-shimmer"></div>
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-2/3 skeleton-shimmer"></div>
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-1/3 skeleton-shimmer"></div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 bg-gray-400 dark:bg-gray-600 rounded skeleton-shimmer"></div>
        <div className="h-10 flex-1 bg-gray-400 dark:bg-gray-600 rounded skeleton-shimmer"></div>
      </div>
    </div>
  </motion.div>
);

// Table row skeleton
export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse flex items-center gap-4 w-full">
      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4 skeleton-shimmer"></div>
      </div>
      <div className="w-24 h-8 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
    </div>
  </div>
);

// Table skeleton with multiple rows
export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </div>
);

// Application progress tracker skeleton
export const ProgressTrackerSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-48 skeleton-shimmer"></div>
      </div>
      
      {/* Progress steps */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 skeleton-shimmer"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3 skeleton-shimmer"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 h-10 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
    </div>
  </div>
);

// Vehicle card skeleton
export const VehicleCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
          <div>
            <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-2 skeleton-shimmer"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 skeleton-shimmer"></div>
          </div>
        </div>
        <div className="w-20 h-8 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/6 skeleton-shimmer"></div>
      </div>
      
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
        <div className="h-10 flex-1 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
      </div>
    </div>
  </div>
);

// Stats card skeleton (for admin dashboard)
export const StatsCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg skeleton-shimmer"></div>
        <div className="w-16 h-6 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
      </div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2 skeleton-shimmer"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32 skeleton-shimmer"></div>
    </div>
  </div>
);

// Notification item skeleton
export const NotificationSkeleton = () => (
  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse flex gap-3">
      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full skeleton-shimmer"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/3 skeleton-shimmer"></div>
      </div>
    </div>
  </div>
);

// Chart skeleton
export const ChartSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-6 skeleton-shimmer"></div>
      <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded skeleton-shimmer"></div>
    </div>
  </div>
);

// Full page skeleton loader with logo
export const FullPageLoader = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-20 h-20 mb-6 mx-auto">
        <img src="/brta.png" alt="BRTA" className="w-full h-full object-contain animate-pulse" />
      </div>
      <div className="space-y-3">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xl font-semibold text-primary"
        >
          {message}
        </motion.div>
        <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-green-500"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ width: '50%' }}
          />
        </div>
      </div>
    </motion.div>
  </div>
);

export default {
  CardSkeleton,
  LicenseCardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  ProgressTrackerSkeleton,
  VehicleCardSkeleton,
  StatsCardSkeleton,
  NotificationSkeleton,
  ChartSkeleton,
  FullPageLoader,
  SkeletonPulse
};
