import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { ITRRecord, FilingStatus, PaymentStatus } from '../types';
import { getISTDateString, formatISTDate, exportToCSV } from '../utils';
import { 
  Search, 
  Plus, 
  Download, 
  Calendar, 
  BarChart3, 
  LogOut, 
  User as UserIcon, 
  Landmark, 
  IndianRupee, 
  FileSpreadsheet, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Phone,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClientFormModal from './ClientFormModal';
import DailyReportModal from './DailyReportModal';
import MonthlyReportModal from './MonthlyReportModal';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [records, setRecords] = useState<ITRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [filterAY, setFilterAY] = useState<string>('All');

  // Modal Open/Close States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);

  // Edit / Delete State
  const [recordToEdit, setRecordToEdit] = useState<ITRRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Setup Real-time Firestore Sync
  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const recordsCol = collection(db, 'itr_records');
      const q = query(recordsCol, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const fetchedRecords: ITRRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedRecords.push({
              id: docSnap.id,
              ...data,
            } as ITRRecord);
          });
          setRecords(fetchedRecords);
          setLoading(false);
        },
        (err) => {
          console.error('Firestore Error:', err);
          setError('Failed to establish Firestore connection. Please check your network or Firestore security rules.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message || 'Error initializing database reader.');
      setLoading(false);
    }
  }, []);

  // Handle Save (Add or Edit)
  const handleSaveRecord = async (
    formData: Omit<ITRRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdDateIST' | 'updatedDateIST'> & { id?: string }
  ) => {
    setError(null);
    const dateIST = getISTDateString();
    
    try {
      if (formData.id) {
        // Edit flow
        const docRef = doc(db, 'itr_records', formData.id);
        await updateDoc(docRef, {
          clientName: formData.clientName,
          pan: formData.pan,
          mobile: formData.mobile,
          assessmentYear: formData.assessmentYear,
          itrType: formData.itrType,
          filingStatus: formData.filingStatus,
          paymentStatus: formData.paymentStatus,
          paymentAmount: formData.paymentAmount,
          paymentDate: formData.paymentDate,
          notes: formData.notes,
          updatedAt: new Date().toISOString(),
          updatedDateIST: dateIST
        });
      } else {
        // Create flow
        const recordsCol = collection(db, 'itr_records');
        await addDoc(recordsCol, {
          clientName: formData.clientName,
          pan: formData.pan,
          mobile: formData.mobile,
          assessmentYear: formData.assessmentYear,
          itrType: formData.itrType,
          filingStatus: formData.filingStatus,
          paymentStatus: formData.paymentStatus,
          paymentAmount: formData.paymentAmount,
          paymentDate: formData.paymentDate,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdDateIST: dateIST,
          updatedDateIST: dateIST
        });
      }
    } catch (err: any) {
      console.error('Save Error:', err);
      setError('Could not write record to the database. Verify connection settings.');
    }
  };

  // Handle Delete
  const handleDeleteRecord = async (id: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, 'itr_records', id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Delete Error:', err);
      setError('Could not delete record from database.');
    }
  };

  // Log out
  const handleSignOut = () => {
    signOut(auth).catch(err => console.error('Sign Out Error', err));
  };

  // Calculation Metrics (over entire dataset, responsive & reactive)
  const totalRecords = records.length;
  
  // Total Revenue (Sum of paymentAmount where status is Paid)
  const totalRevenue = records
    .filter(r => r.paymentStatus === 'Paid')
    .reduce((sum, r) => sum + r.paymentAmount, 0);

  // Pending Payments count
  const pendingPaymentsCount = records.filter(r => r.paymentStatus === 'Pending').length;

  // Paid Filing Rate (%)
  const paidFilingRate = totalRecords > 0 
    ? Math.round((records.filter(r => r.paymentStatus === 'Paid').length / totalRecords) * 100) 
    : 0;

  // Filtered dataset for table display
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.mobile.includes(searchTerm);

    const matchesPayment = 
      filterPayment === 'All' || 
      record.paymentStatus === filterPayment;

    const matchesAY = 
      filterAY === 'All' || 
      record.assessmentYear === filterAY;

    return matchesSearch && matchesPayment && matchesAY;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      
      {/* Sidebar - Desktop Only */}
      <aside className="w-[220px] bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0 hidden md:flex border-r border-slate-800">
        <div className="py-6 flex flex-col gap-1">
          {/* Logo */}
          <div className="px-6 pb-8 flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Landmark id="sidebar-logo-icon" className="h-5 w-5" />
            </div>
            <div className="font-extrabold text-white text-lg tracking-tight">
              Flip<span className="text-blue-500">Money</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-0.5">
            <button
              id="nav-dashboard-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterPayment('All');
                setFilterAY('All');
              }}
              className="flex items-center gap-3 px-6 py-3 text-xs font-semibold text-white bg-white/5 border-r-4 border-blue-500 transition-all text-left cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              Records Dashboard
            </button>

            <button
              id="nav-clients-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterPayment('All');
                setFilterAY('All');
                const searchEl = document.getElementById('client-search-input');
                if (searchEl) searchEl.focus();
              }}
              className="flex items-center gap-3 px-6 py-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <UserIcon className="h-4 w-4" />
              Clients Directory
            </button>

            <button
              id="nav-revenue-btn"
              onClick={() => setIsMonthlyOpen(true)}
              className="flex items-center gap-3 px-6 py-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <BarChart3 className="h-4 w-4" />
              Revenue Reports
            </button>

            <button
              id="nav-daily-btn"
              onClick={() => setIsDailyOpen(true)}
              className="flex items-center gap-3 px-6 py-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              Daily IST Log
            </button>
          </nav>
        </div>

        {/* User Account / Signout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="px-2 py-1 bg-slate-800/50 rounded-lg flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
              {user.email ? user.email.substring(0, 1).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            id="sidebar-signout-btn"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout Account
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4 flex-1">
            {/* Simple logo for mobile header */}
            <div className="flex items-center gap-1.5 md:hidden">
              <div className="bg-blue-600 p-1 rounded">
                <Landmark className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">FlipMoney</span>
            </div>

            {/* Quick Global Search Bar */}
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                id="client-search-input"
                type="text"
                placeholder="Search by client, PAN, or mobile..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Clock Indicator */}
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium font-mono hidden sm:inline-block bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              {formatISTDate(getISTDateString())} | IST Active
            </span>

            {/* User Initial Circle and Signout on mobile */}
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-extrabold border border-blue-500 shadow-sm shrink-0">
                {user.email ? user.email.substring(0, 1).toUpperCase() : 'A'}
              </div>
              <button
                id="mobile-signout-btn"
                onClick={handleSignOut}
                className="md:hidden p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Error notice banner */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 text-xs">Ledger Error State</p>
                <p className="text-red-700 text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Core Dashboard Title & Action Block */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                ITR Filing Manager
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Real-time status for assessment year {filterAY === 'All' ? '2026-27' : filterAY} • Operating strictly in Indian Standard Time
              </p>
            </div>

            {/* Main Action Callout */}
            <button
              id="add-new-client-btn"
              onClick={() => {
                setRecordToEdit(null);
                setIsFormOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Client Record
            </button>
          </div>

          {/* Stately High-Density Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 mt-2 block">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Pending Payments card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Payments</span>
              <span className="text-xl sm:text-2xl font-black text-amber-500 mt-2 block">
                {pendingPaymentsCount}
              </span>
            </div>

            {/* Completion rate card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paid Filing Rate</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-500 mt-2 block">
                {paidFilingRate}%
              </span>
            </div>

            {/* Total count card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clients</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 mt-2 block">
                {totalRecords}
              </span>
            </div>

          </div>

          {/* Primary Data Table container */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col overflow-hidden">
            
            {/* Filter and Action Header Bar */}
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                
                {/* Assessment Year Select */}
                <select
                  id="filter-assessment-year"
                  value={filterAY}
                  onChange={e => setFilterAY(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="All">All Assessment Years</option>
                  <option value="2026-27">AY 2026-27</option>
                  <option value="2025-26">AY 2025-26</option>
                  <option value="2024-25">AY 2024-25</option>
                  <option value="2023-24">AY 2023-24</option>
                </select>

                {/* Payment Status Select */}
                <select
                  id="filter-payment-status"
                  value={filterPayment}
                  onChange={e => setFilterPayment(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Pending">Pending Only</option>
                </select>

              </div>

              {/* Secondary operations */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Mobile visible report logs */}
                <button
                  id="mobile-daily-btn"
                  onClick={() => setIsDailyOpen(true)}
                  className="md:hidden flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Daily Statement"
                >
                  <Calendar className="h-4 w-4" />
                </button>
                <button
                  id="mobile-monthly-btn"
                  onClick={() => setIsMonthlyOpen(true)}
                  className="md:hidden flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Monthly Ledger"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>

                <button
                  id="export-csv-btn"
                  onClick={() => exportToCSV(filteredRecords)}
                  disabled={filteredRecords.length === 0}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Synchronizing record ledger from cloud...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-400 font-semibold text-xs">No client records found matching search filters.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Refine your query or tap 'Add Client Record' to register a new filer.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Client Name</th>
                      <th className="px-5 py-3">PAN Number</th>
                      <th className="px-5 py-3">ITR Type</th>
                      <th className="px-5 py-3">Filing Status</th>
                      <th className="px-5 py-3">Payment</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredRecords.map((record) => {
                      const isDeleting = deleteConfirmId === record.id;
                      
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Client Name */}
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-900">{record.clientName}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{record.mobile}</span>
                            </div>
                          </td>

                          {/* PAN */}
                          <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-600">
                            {record.pan}
                          </td>

                          {/* ITR Type */}
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                            {record.itrType}
                          </td>

                          {/* Filing Status */}
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              record.filingStatus === 'Processed' ? 'bg-emerald-100 text-emerald-800' :
                              record.filingStatus === 'E-Verified' ? 'bg-teal-100 text-teal-800' :
                              record.filingStatus === 'Filed' ? 'bg-blue-100 text-blue-800' :
                              record.filingStatus === 'Prepared' ? 'bg-purple-100 text-purple-800' :
                              record.filingStatus === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {record.filingStatus}
                            </span>
                          </td>

                          {/* Payment badge */}
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              record.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.paymentStatus}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-3 font-bold font-mono text-slate-800">
                            ₹{record.paymentAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3 text-right">
                            <AnimatePresence mode="wait">
                              {isDeleting ? (
                                <motion.div 
                                  key="confirm"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 10 }}
                                  className="flex items-center justify-end gap-1.5"
                                >
                                  <span className="text-[10px] font-extrabold text-red-600">Delete?</span>
                                  <button
                                    id={`delete-confirm-btn-${record.id}`}
                                    onClick={() => handleDeleteRecord(record.id!)}
                                    className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    id={`delete-cancel-btn-${record.id}`}
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.div 
                                  key="actions"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex items-center justify-end gap-1"
                                >
                                  <button
                                    id={`edit-btn-${record.id}`}
                                    onClick={() => {
                                      setRecordToEdit(record);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    title="Edit Client"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    id={`delete-trigger-btn-${record.id}`}
                                    onClick={() => setDeleteConfirmId(record.id!)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    title="Delete Client"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>

        {/* Dynamic Compact Footer */}
        <footer className="py-3 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white shrink-0">
          FlipMoney ITR Ledger • Operational Loop Active • OPERATING IN INDIAN STANDARD TIME (IST)
        </footer>

      </div>

      {/* Embedded Modals */}
      <AnimatePresence>
        {isFormOpen && (
          <ClientFormModal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveRecord}
            recordToEdit={recordToEdit}
            existingRecords={records}
          />
        )}
        
        {isDailyOpen && (
          <DailyReportModal
            isOpen={isDailyOpen}
            onClose={() => setIsDailyOpen(false)}
            records={records}
          />
        )}

        {isMonthlyOpen && (
          <MonthlyReportModal
            isOpen={isMonthlyOpen}
            onClose={() => setIsMonthlyOpen(false)}
            records={records}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
