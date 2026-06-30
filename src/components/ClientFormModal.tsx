import React, { useState, useEffect } from 'react';
import { ITRRecord, FilingStatus, PaymentStatus } from '../types';
import { getISTDateString, validateMobile } from '../utils';
import { X, AlertCircle, Save, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INDIAN_STATES_UT: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
].sort();

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<ITRRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdDateIST' | 'updatedDateIST'> & { id?: string }) => void;
  recordToEdit: ITRRecord | null;
  existingRecords: ITRRecord[];
}

const ASSESSMENT_YEARS = ['2026-27', '2025-26', '2024-25', '2023-24'];
const ITR_TYPES = ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'];
const FILING_STATUSES: FilingStatus[] = [
  'Pending Documents',
  'In Progress',
  'Prepared',
  'Filed',
  'E-Verified',
  'Processed'
];

export default function ClientFormModal({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
  existingRecords
}: ClientFormModalProps) {
  const [clientName, setClientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('');
  const [assessmentYear, setAssessmentYear] = useState('2026-27');
  const [itrType, setItrType] = useState('ITR-1');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('Pending Documents');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  // Load existing record data if editing
  useEffect(() => {
    if (recordToEdit) {
      setClientName(recordToEdit.clientName);
      setMobile(recordToEdit.mobile);
      setAssessmentYear(recordToEdit.assessmentYear);
      setItrType(recordToEdit.itrType);
      setFilingStatus(recordToEdit.filingStatus);
      setPaymentStatus(recordToEdit.paymentStatus);
      setPaymentAmount(String(recordToEdit.paymentAmount));
      setPaymentDate(recordToEdit.paymentDate || '');
      setNotes(recordToEdit.notes || '');
      setState(recordToEdit.state || 'Maharashtra');
      setCity(recordToEdit.city || '');
    } else {
      // Clear for new record
      setClientName('');
      setMobile('');
      setState('Maharashtra');
      setCity('');
      setAssessmentYear('2026-27');
      setItrType('ITR-1');
      setFilingStatus('Pending Documents');
      setPaymentStatus('Pending');
      setPaymentAmount('0');
      setPaymentDate('');
      setNotes('');
    }
    setError(null);
  }, [recordToEdit, isOpen]);

  // Handle Payment Status changes (auto-fill date)
  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setPaymentStatus(status);
    if (status === 'Paid' && !paymentDate) {
      setPaymentDate(getISTDateString());
    } else if (status === 'Pending') {
      setPaymentDate('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Check for empty fields
    if (!clientName.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile Number is required.');
      return;
    }

    // 2. Validate Mobile format
    const formattedMobile = mobile.trim();
    if (!validateMobile(formattedMobile)) {
      setError('Invalid Mobile Number. Must be a 10-digit number starting with 6-9.');
      return;
    }

    // 3. Validate State and City
    const finalState = state.trim();
    const finalCity = city.trim();

    if (!finalState) {
      setError('Please select a State.');
      return;
    }
    if (!finalCity) {
      setError('City is required.');
      return;
    }

    // 4. Validate Payment Amount
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setError('Payment Amount must be a valid number greater than or equal to 0.');
      return;
    }

    // Form is fully validated! Send data to parent component
    onSave({
      id: recordToEdit?.id,
      clientName: clientName.trim(),
      mobile: formattedMobile,
      state: finalState,
      city: finalCity,
      assessmentYear,
      itrType,
      filingStatus,
      paymentStatus,
      paymentAmount: amountNum,
      paymentDate: paymentStatus === 'Paid' ? (paymentDate || getISTDateString()) : null,
      notes: notes.trim()
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {recordToEdit ? 'Edit Client Record' : 'Add New Client Record'}
          </h3>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Client Name *
              </label>
              <input
                id="client-name-input"
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* State selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                State *
              </label>
              <select
                id="state-select"
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {!INDIAN_STATES_UT.includes(state) && (
                  <option value={state}>{state}</option>
                )}
                {INDIAN_STATES_UT.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* City selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                City *
              </label>
              <input
                id="city-input"
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Enter city name"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Mobile Number *
              </label>
              <input
                id="mobile-input"
                type="text"
                required
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit number"
                maxLength={10}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Assessment Year *
              </label>
              <select
                id="ay-select"
                value={assessmentYear}
                onChange={e => setAssessmentYear(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ASSESSMENT_YEARS.map(ay => (
                  <option key={ay} value={ay}>{ay}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                ITR Type *
              </label>
              <select
                id="itr-type-select"
                value={itrType}
                onChange={e => setItrType(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ITR_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Filing Status *
              </label>
              <select
                id="filing-status-select"
                value={filingStatus}
                onChange={e => setFilingStatus(e.target.value as FilingStatus)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FILING_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Payment Status *
              </label>
              <div className="flex gap-2">
                <button
                  id="pay-pending-btn"
                  type="button"
                  onClick={() => handlePaymentStatusChange('Pending')}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium cursor-pointer ${
                    paymentStatus === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Pending
                </button>
                <button
                  id="pay-paid-btn"
                  type="button"
                  onClick={() => handlePaymentStatusChange('Paid')}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium cursor-pointer ${
                    paymentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                <span>Payment Amount (₹)</span>
                {paymentStatus === 'Paid' && <span className="text-emerald-600 font-bold text-[10px]">Overpayments accepted</span>}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-sm">₹</span>
                </div>
                <input
                  id="payment-amount-input"
                  type="number"
                  min="0"
                  step="any"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {paymentStatus === 'Paid' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Date (IST) *
                </label>
                <input
                  id="payment-date-input"
                  type="date"
                  required={paymentStatus === 'Paid'}
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Notes
              </label>
              <textarea
                id="notes-textarea"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes about filing or payments..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-client-btn"
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Record
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
