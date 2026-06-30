import React, { useState } from 'react';
import { ITRRecord } from '../types';
import { getISTMonthString, formatISTDate } from '../utils';
import { X, BarChart3, FileText, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ITRRecord[];
}

export default function MonthlyReportModal({ isOpen, onClose, records }: MonthlyReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(getISTMonthString());

  if (!isOpen) return null;

  // Filter records created in the selected month (using substring of createdDateIST which is YYYY-MM-DD)
  const monthlyCreatedRecords = records.filter(r => r.createdDateIST.substring(0, 7) === selectedMonth);

  // Filter payments received in the selected month (using paymentDate YYYY-MM-DD)
  const paymentReceivedInMonth = records.filter(
    r => r.paymentStatus === 'Paid' && r.paymentDate && r.paymentDate.substring(0, 7) === selectedMonth
  );

  const totalAddedThisMonth = monthlyCreatedRecords.length;
  
  // Total revenue received in this month
  const revenueThisMonth = paymentReceivedInMonth.reduce((sum, r) => sum + r.paymentAmount, 0);

  const pendingCount = monthlyCreatedRecords.filter(r => r.paymentStatus === 'Pending').length;
  const paidCount = monthlyCreatedRecords.filter(r => r.paymentStatus === 'Paid').length;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getFriendlyMonthName = (yearMonthStr: string) => {
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return yearMonthStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${monthNames[monthIdx]} ${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BarChart3 className="h-5 w-5" />
            <h3 className="text-lg font-bold text-slate-800">
              Monthly Audit & Financial Report (IST)
            </h3>
          </div>
          <button
            id="close-monthly-report-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Month Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
            <div>
              <span className="text-sm font-semibold text-indigo-900 block">Select Audit Month</span>
              <span className="text-xs text-indigo-600/80">Aggregation of client registrations and revenue within the chosen month cycle.</span>
            </div>
            <input
              id="monthly-report-picker"
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Total ITR Added</span>
              <span className="text-xl font-bold text-slate-800 block mt-1">{totalAddedThisMonth}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100/50 text-center">
              <span className="text-xs font-semibold text-emerald-600 uppercase block tracking-wider">Total Revenue</span>
              <span className="text-xl font-bold text-emerald-800 block mt-1">₹{revenueThisMonth.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-green-50 p-3 rounded-xl border border-green-100/50 text-center">
              <span className="text-xs font-semibold text-green-600 uppercase block tracking-wider">Clients Paid</span>
              <span className="text-xl font-bold text-green-800 block mt-1">{paidCount}</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50 text-center">
              <span className="text-xs font-semibold text-amber-600 uppercase block tracking-wider">Clients Pending</span>
              <span className="text-xl font-bold text-amber-800 block mt-1">{pendingCount}</span>
            </div>
          </div>

          {/* Breakdown lists */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-500" />
                Clients Registered in {getFriendlyMonthName(selectedMonth)} ({monthlyCreatedRecords.length})
              </h4>
              
              {monthlyCreatedRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 py-3 text-center rounded-lg border border-dashed border-slate-200">
                  No clients were registered during this month.
                </p>
              ) : (
                <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                        <th className="px-4 py-2">Client Name</th>
                        <th className="px-4 py-2">PAN</th>
                        <th className="px-4 py-2">ITR Type</th>
                        <th className="px-4 py-2">Filing Date</th>
                        <th className="px-4 py-2 text-right font-bold">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {monthlyCreatedRecords.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium">{r.clientName}</td>
                          <td className="px-4 py-2.5 font-mono">{r.pan}</td>
                          <td className="px-4 py-2.5">{r.itrType}</td>
                          <td className="px-4 py-2.5 text-slate-500">{formatISTDate(r.createdDateIST)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.paymentStatus === 'Paid' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              ₹{r.paymentAmount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Revenue Breakdown for {getFriendlyMonthName(selectedMonth)} ({paymentReceivedInMonth.length})
              </h4>
              
              {paymentReceivedInMonth.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 py-3 text-center rounded-lg border border-dashed border-slate-200">
                  No revenue was recorded during this month.
                </p>
              ) : (
                <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                        <th className="px-4 py-2">Client Name</th>
                        <th className="px-4 py-2">PAN</th>
                        <th className="px-4 py-2">Payment Date</th>
                        <th className="px-4 py-2 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paymentReceivedInMonth.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium">{r.clientName}</td>
                          <td className="px-4 py-2.5 font-mono">{r.pan}</td>
                          <td className="px-4 py-2.5 text-slate-500">{formatISTDate(r.paymentDate)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                            ₹{r.paymentAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="close-monthly-report-footer-btn"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </motion.div>
    </div>
  );
}
