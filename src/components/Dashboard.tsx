import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { ITRRecord, FilingStatus, PaymentStatus } from '../types';
import { 
  getISTDateString, 
  formatISTDate, 
  exportToCSV, 
  exportToExcel, 
  exportToPDF 
} from '../utils';
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
  Layers,
  TrendingUp,
  MapPin,
  ChevronRight,
  Filter,
  FileText,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClientFormModal from './ClientFormModal';

interface DashboardProps {
  user: User;
}

type TabType = 'overview' | 'clients' | 'reports' | 'activity';

export default function Dashboard({ user }: DashboardProps) {
  const [records, setRecords] = useState<ITRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Directory Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [filterAY, setFilterAY] = useState<string>('All');
  const [filterState, setFilterState] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');

  // Modal Open/Close States
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Historical day reports date picker
  const [reportDate, setReportDate] = useState<string>('');

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
          setError('Failed to establish Firestore connection. Please verify your internet or Firestore config.');
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
        const updateData: any = {
          clientName: formData.clientName,
          mobile: formData.mobile,
          state: formData.state || 'Maharashtra',
          city: formData.city || 'Mumbai',
          assessmentYear: formData.assessmentYear,
          itrType: formData.itrType,
          filingStatus: formData.filingStatus,
          paymentStatus: formData.paymentStatus,
          paymentAmount: formData.paymentAmount,
          paymentDate: formData.paymentDate,
          notes: formData.notes,
          updatedAt: new Date().toISOString(),
          updatedDateIST: dateIST
        };
        if (formData.pan) {
          updateData.pan = formData.pan;
        }
        await updateDoc(docRef, updateData);
      } else {
        // Create flow
        const recordsCol = collection(db, 'itr_records');
        const createData: any = {
          clientName: formData.clientName,
          mobile: formData.mobile,
          state: formData.state || 'Maharashtra',
          city: formData.city || 'Mumbai',
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
        };
        if (formData.pan) {
          createData.pan = formData.pan;
        }
        await addDoc(recordsCol, createData);
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

  // State / City helper extractors for filters
  const uniqueStates = Array.from(new Set(records.map(r => r.state).filter(Boolean))).sort();
  const uniqueCities = Array.from(
    new Set(
      records
        .filter(r => filterState === 'All' || r.state === filterState)
        .map(r => r.city)
        .filter(Boolean)
    )
  ).sort();

  // Metrics (over entire dataset, recalculated Reactively)
  const totalRevenue = records
    .filter(r => r.paymentStatus === 'Paid')
    .reduce((sum, r) => sum + r.paymentAmount, 0);

  const todayRevenue = records
    .filter(r => r.paymentStatus === 'Paid' && r.paymentDate === getISTDateString())
    .reduce((sum, r) => sum + r.paymentAmount, 0);

  const todayITRCount = records.filter(r => r.createdDateIST === getISTDateString()).length;

  // Isolated today's dataset for dashboard metrics
  const todayRecords = records.filter(r => r.createdDateIST === getISTDateString());
  const todayCount = todayRecords.length;
  const todayStatusCounts = todayRecords.reduce((acc, r) => {
    acc[r.filingStatus] = (acc[r.filingStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtered dataset for clients directory
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.pan && record.pan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      record.mobile.includes(searchTerm) ||
      (record.state && record.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.city && record.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPayment = 
      filterPayment === 'All' || 
      record.paymentStatus === filterPayment;

    const matchesAY = 
      filterAY === 'All' || 
      record.assessmentYear === filterAY;

    const matchesState =
      filterState === 'All' ||
      record.state === filterState;

    const matchesCity =
      filterCity === 'All' ||
      record.city === filterCity;

    return matchesSearch && matchesPayment && matchesAY && matchesState && matchesCity;
  });

  // Today's timeline logs calculation (filings or payments)
  const todayTimeline = [...todayRecords]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 15);

  // Recent timeline logs calculation (across all history)
  const recentTimeline = [...records]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 15);

  // Status distributions (fallback for general status if needed, but we use today's)
  const totalCount = records.length;
  const statusCounts = records.reduce((acc, r) => {
    acc[r.filingStatus] = (acc[r.filingStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      
      {/* Sidebar - Desktop Only */}
      <aside className="w-[240px] bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0 hidden md:flex border-r border-slate-800">
        <div className="py-6 flex flex-col gap-1">
          {/* Logo */}
          <div className="px-6 pb-8 flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="font-extrabold text-white text-lg tracking-tight">
              Flip<span className="text-blue-500">Money</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-white bg-blue-600 shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="h-4 w-4" />
              Overview Dashboard
            </button>

            <button
              id="nav-clients-btn"
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'clients'
                  ? 'text-white bg-blue-600 shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Clients Directory
            </button>

            <button
              id="nav-revenue-btn"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-white bg-blue-600 shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Revenue Reports
            </button>

            <button
              id="nav-activity-btn"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'activity'
                  ? 'text-white bg-blue-600 shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="h-4 w-4" />
              Recent Activity Feed
            </button>
          </nav>
        </div>

        {/* User Account / Signout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="px-2 py-1 bg-slate-800/50 rounded-lg flex items-center gap-2 overflow-hidden">
            <div className="w-6.5 h-6.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0">
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
                placeholder="Search by name, location, mobile..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Clock Indicator */}
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium font-mono hidden sm:inline-block bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              {formatISTDate(getISTDateString())} | IST Loop
            </span>

            {/* Navigation Tabs on Mobile header */}
            <div className="flex items-center md:hidden border-l border-slate-200 pl-3 gap-1">
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`p-1.5 rounded ${activeTab === 'overview' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                title="Overview"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setActiveTab('clients')} 
                className={`p-1.5 rounded ${activeTab === 'clients' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                title="Clients"
              >
                <UserIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setActiveTab('reports')} 
                className={`p-1.5 rounded ${activeTab === 'reports' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                title="Reports"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setActiveTab('activity')} 
                className={`p-1.5 rounded ${activeTab === 'activity' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                title="Activity Feed"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>

            {/* User Initial Circle and Signout on mobile */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
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

          {/* DYNAMIC SCREEN LAYOUT BY ACTIVE TAB */}
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW DASHBOARD SCREEN */}
            {activeTab === 'overview' && (
              <motion.div
                key="tab-overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Greeting & Quick Action trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                      ITR Filing Overview
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Operational Ledger summary & indicators for current assessment cycles.
                    </p>
                  </div>
                  <button
                    id="add-new-client-btn-overview"
                    onClick={() => {
                      setRecordToEdit(null);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    New Client Record
                  </button>
                </div>

                {/* Highly Polished High-Density Cards Grid (Today's ITR Count and Today's Revenue) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Today's ITR Count */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow transition-all relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Today's Filings</span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-500 block font-mono">
                        {todayITRCount} <span className="text-xs text-slate-400 font-bold uppercase">Files</span>
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium block mt-1">
                        Registered on {getISTDateString()} (IST)
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-1 bg-amber-500" />
                  </div>

                  {/* Today Revenue */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow transition-all relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Today Revenue</span>
                      <span className="text-2xl sm:text-3xl font-black text-blue-600 block font-mono">
                        ₹{todayRevenue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium block mt-1">
                        Settled in the last 24 hours (IST)
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-1 bg-blue-500" />
                  </div>
                </div>

                {/* Splits bento grid: Left=Filing stats & export controls, Right=Recent activities timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column (Stats distribution + Export station) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Filing Status Progress Bars */}
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Filing Status Distribution</h3>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded uppercase">Today</span>
                      </div>
                      
                      {todayCount === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">No filings registered today.</p>
                      ) : (
                        <div className="space-y-3.5">
                          {Object.entries({
                            'Processed': 'bg-emerald-500',
                            'E-Verified': 'bg-teal-500',
                            'Filed': 'bg-blue-500',
                            'Prepared': 'bg-purple-500',
                            'In Progress': 'bg-amber-500',
                            'Pending Documents': 'bg-slate-400'
                          }).map(([status, color]) => {
                            const count = todayStatusCounts[status] || 0;
                            const percentage = Math.round((count / todayCount) * 100);
                            return (
                              <div key={status} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                  <span>{status}</span>
                                  <span className="font-mono text-[11px] text-slate-500">{count} ({percentage}%)</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Export Terminal */}
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3.5">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-blue-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Export Center</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Generate and download your complete client ledger in standard reporting formats. Downloads are processed instantaneously on-client.
                      </p>

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <button
                          id="export-excel-btn"
                          onClick={() => exportToExcel(records)}
                          disabled={records.length === 0}
                          className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-700 disabled:opacity-50 cursor-pointer transition-all"
                        >
                          <FileSpreadsheet className="h-5 w-5 text-emerald-600 mb-1" />
                          <span className="text-[10px] font-bold">Excel</span>
                        </button>

                        <button
                          id="export-pdf-btn"
                          onClick={() => exportToPDF(records)}
                          disabled={records.length === 0}
                          className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-700 disabled:opacity-50 cursor-pointer transition-all"
                        >
                          <FileText className="h-5 w-5 text-red-500 mb-1" />
                          <span className="text-[10px] font-bold">PDF Report</span>
                        </button>

                        <button
                          id="export-csv-btn"
                          onClick={() => exportToCSV(records)}
                          disabled={records.length === 0}
                          className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-700 disabled:opacity-50 cursor-pointer transition-all"
                        >
                          <Download className="h-5 w-5 text-blue-500 mb-1" />
                          <span className="text-[10px] font-bold">CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Recent Activities Timeline widget) */}
                  <div className="lg:col-span-7 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" /> Recent Operations Log
                        </h3>
                        <button 
                          onClick={() => setActiveTab('activity')}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          View Full Feed <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1 mt-2.5 space-y-0.5">
                        {loading ? (
                          <div className="py-20 text-center text-slate-400 text-xs">Loading activity ledger...</div>
                        ) : todayTimeline.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-10 text-center">No active logs registered today.</p>
                        ) : (
                          todayTimeline.map((item) => {
                            const isPaid = item.paymentStatus === 'Paid';
                            return (
                              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                                    isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {isPaid ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800">{item.clientName}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Filing Status: <span className="font-semibold text-slate-700">{item.filingStatus}</span> • 
                                      Type: <span className="font-semibold text-slate-700">{item.itrType}</span> ({item.assessmentYear})
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold text-slate-700 text-[11px]">
                                    ₹{item.paymentAmount.toLocaleString('en-IN')}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    {item.updatedDateIST || item.createdDateIST}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* CLIENTS DIRECTORY TAB */}
            {activeTab === 'clients' && (
              <motion.div
                key="tab-clients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Heading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                      Clients Filing Directory
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Search and filter all registered clients and manage their state files.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="export-excel-btn-dir"
                      onClick={() => exportToExcel(filteredRecords)}
                      disabled={filteredRecords.length === 0}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Excel
                    </button>
                    <button
                      id="export-pdf-btn-dir"
                      onClick={() => exportToPDF(filteredRecords)}
                      disabled={filteredRecords.length === 0}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-red-500" />
                      PDF
                    </button>
                    <button
                      id="add-new-client-btn-dir"
                      onClick={() => {
                        setRecordToEdit(null);
                        setIsFormOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Record
                    </button>
                  </div>
                </div>

                {/* Multitask Multi-Filter Panel */}
                <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    <Filter className="h-3.5 w-3.5 text-slate-400" /> Search Filters
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {/* Filter Assessment Year */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assessment Year</label>
                      <select
                        id="filter-ay"
                        value={filterAY}
                        onChange={e => setFilterAY(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="All">All Years</option>
                        <option value="2026-27">AY 2026-27</option>
                        <option value="2025-26">AY 2025-26</option>
                        <option value="2024-25">AY 2024-25</option>
                        <option value="2023-24">AY 2023-24</option>
                      </select>
                    </div>

                    {/* Filter Payment Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Status</label>
                      <select
                        id="filter-payment"
                        value={filterPayment}
                        onChange={e => setFilterPayment(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid Only</option>
                        <option value="Pending">Pending Only</option>
                      </select>
                    </div>

                    {/* Filter State */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter State</label>
                      <select
                        id="filter-state"
                        value={filterState}
                        onChange={e => {
                          setFilterState(e.target.value);
                          setFilterCity('All'); // reset city
                        }}
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="All">All States</option>
                        {uniqueStates.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter City */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter City</label>
                      <select
                        id="filter-city"
                        value={filterCity}
                        onChange={e => setFilterCity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="All">All Cities</option>
                        {uniqueCities.map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Clear Button */}
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterAY('All');
                          setFilterPayment('All');
                          setFilterState('All');
                          setFilterCity('All');
                        }}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Data Grid Master Table */}
                <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Filer Listings ({filteredRecords.length} records matching)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
                        <p className="text-xs text-slate-500">Refreshing records...</p>
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="py-20 text-center">
                        <p className="text-slate-400 font-bold text-xs">No records found matching current query parameters.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Refine filters or click 'Add Record' to append a new filer.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <th className="px-5 py-3.5">Client Name</th>
                            <th className="px-5 py-3.5">State & City</th>
                            <th className="px-5 py-3.5">AY & Type</th>
                            <th className="px-5 py-3.5">Filing Status</th>
                            <th className="px-5 py-3.5">Payment</th>
                            <th className="px-5 py-3.5">Amount</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {filteredRecords.map((record) => {
                            const isDeleting = deleteConfirmId === record.id;
                            
                            return (
                              <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                                {/* Name */}
                                <td className="px-5 py-3.5">
                                  <div className="font-bold text-slate-900">{record.clientName}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{record.mobile}</span>
                                  </div>
                                </td>

                                {/* State / City */}
                                <td className="px-5 py-3.5">
                                  <div className="text-slate-700 font-semibold">{record.state || 'Maharashtra'}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{record.city || 'Mumbai'}</div>
                                </td>

                                {/* AY & Type */}
                                <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                                  <div className="font-bold">{record.itrType}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{record.assessmentYear}</div>
                                </td>

                                {/* Filing Status */}
                                <td className="px-5 py-3.5">
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
                                <td className="px-5 py-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    record.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {record.paymentStatus}
                                  </span>
                                </td>

                                {/* Amount */}
                                <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                                  ₹{record.paymentAmount.toLocaleString('en-IN')}
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-3.5 text-right">
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
              </motion.div>
            )}

            {/* REVENUE REPORTS TAB (Analytics Screen) */}
            {activeTab === 'reports' && (
              <motion.div
                key="tab-reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Heading & Date Picker Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                      Financial Ledger & Reports
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Live analytics of processed fees, receivables, and filing volume trends.
                    </p>
                  </div>

                  {/* Historical Date Picker */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start lg:self-auto bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-sm">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Historical Date Picker:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="report-date-picker"
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        max={getISTDateString()}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {reportDate && (
                        <button
                          onClick={() => setReportDate('')}
                          className="px-2 py-1 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                        >
                          Clear Date
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {reportDate ? (
                  /* SINGLE DAY REPORT VIEW */
                  <div className="space-y-6">
                    {/* Date title */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Isolated Ledger Performance</p>
                          <h3 className="text-base font-black text-slate-900">{formatISTDate(reportDate)}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Day Export */}
                        {(() => {
                          const dayRecords = records.filter(r => r.createdDateIST === reportDate);
                          return (
                            <>
                              <button
                                onClick={() => exportToExcel(dayRecords)}
                                disabled={dayRecords.length === 0}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <FileSpreadsheet className="h-3 w-3" /> Excel
                              </button>
                              <button
                                onClick={() => exportToPDF(dayRecords)}
                                disabled={dayRecords.length === 0}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <FileText className="h-3 w-3" /> PDF
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Isolated Day Metrics */}
                    {(() => {
                      const dayRecords = records.filter(r => r.createdDateIST === reportDate);
                      const dayRevenue = records
                        .filter(r => r.paymentStatus === 'Paid' && r.paymentDate === reportDate)
                        .reduce((sum, r) => sum + r.paymentAmount, 0);
                      const dayReceivables = dayRecords
                        .filter(r => r.paymentStatus === 'Pending')
                        .reduce((sum, r) => sum + r.paymentAmount, 0);
                      const dayExpected = dayRevenue + dayReceivables;
                      const dayEfficiency = dayExpected > 0 ? Math.round((dayRevenue / dayExpected) * 100) : 0;

                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Day Filings</span>
                            <span className="text-xl font-black text-slate-900 mt-1.5 block font-mono">
                              {dayRecords.length} Files
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1">ITR registrations logged</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Day Revenue</span>
                            <span className="text-xl font-black text-blue-600 mt-1.5 block font-mono">
                              ₹{dayRevenue.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1">Paid on {formatISTDate(reportDate)}</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Expected Receivables</span>
                            <span className="text-xl font-black text-amber-500 mt-1.5 block font-mono">
                              ₹{dayReceivables.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1">Pending for day's additions</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans font-bold">Realized Rate</span>
                            <span className="text-xl font-black text-emerald-500 mt-1.5 block font-mono">
                              {dayEfficiency}%
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1">Ratio of collections</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Day Records Table */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Filings Logged on {formatISTDate(reportDate)}
                        </h3>
                        <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600 font-mono">
                          {records.filter(r => r.createdDateIST === reportDate).length} entries
                        </span>
                      </div>

                      {(() => {
                        const dayRecords = records.filter(r => r.createdDateIST === reportDate);
                        if (dayRecords.length === 0) {
                          return (
                            <div className="py-16 text-center text-slate-400 text-xs italic">
                              No filings were added to the ledger on this date.
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                  <th className="px-5 py-3">Client Details</th>
                                  <th className="px-5 py-3">Filing Context</th>
                                  <th className="px-5 py-3">Filing Status</th>
                                  <th className="px-5 py-3">Fee Status</th>
                                  <th className="px-5 py-3 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {dayRecords.map(record => (
                                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <p className="font-extrabold text-slate-900">{record.clientName}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{record.mobile}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <p className="font-semibold text-slate-700">{record.itrType}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">AY {record.assessmentYear}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                                        {record.filingStatus}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        record.paymentStatus === 'Paid' 
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                                      }`}>
                                        {record.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-bold font-mono text-slate-800">
                                      ₹{record.paymentAmount.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* OVERALL TRENDS AND HISTORICAL CUMULATIVE VIEWS */
                  <>
                    {/* Sub Cards with expectations */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Realized Cash */}
                  <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Collected Fees</span>
                    <span className="text-xl font-black text-slate-900 mt-1.5 block font-mono">
                      ₹{totalRevenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Settled payments in hand</span>
                  </div>

                  {/* Pending cash */}
                  {(() => {
                    const pendingRevenue = records
                      .filter(r => r.paymentStatus === 'Pending')
                      .reduce((sum, r) => sum + r.paymentAmount, 0);
                    const totalExpected = totalRevenue + pendingRevenue;
                    const efficiency = totalExpected > 0 ? Math.round((totalRevenue / totalExpected) * 100) : 0;

                    return (
                      <>
                        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Receivables</span>
                          <span className="text-xl font-black text-amber-500 mt-1.5 block font-mono">
                            ₹{pendingRevenue.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Pending expected fees</span>
                        </div>

                        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Expected Value</span>
                          <span className="text-xl font-black text-slate-900 mt-1.5 block font-mono">
                            ₹{totalExpected.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Full portfolios potential value</span>
                        </div>

                        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Collection rate</span>
                          <span className="text-xl font-black text-emerald-500 mt-1.5 block font-mono">
                            {efficiency}%
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Realized ratio of expectations</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Monthly ledger list with Horizonal bars */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Monthly report card */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Revenue Stream</h3>
                    
                    {(() => {
                      // Process months dynamically
                      const monthlyStats: Record<string, { revenue: number; count: number }> = {};
                      records.forEach(r => {
                        const date = r.paymentDate || r.createdDateIST || '2026-06';
                        const monthKey = date.substring(0, 7); // YYYY-MM
                        if (!monthlyStats[monthKey]) {
                          monthlyStats[monthKey] = { revenue: 0, count: 0 };
                        }
                        if (r.paymentStatus === 'Paid') {
                          monthlyStats[monthKey].revenue += r.paymentAmount;
                        }
                        monthlyStats[monthKey].count += 1;
                      });

                      const sortedMonths = Object.entries(monthlyStats)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .slice(0, 12);

                      const maxRevenue = sortedMonths.reduce((max, [_, stat]) => Math.max(max, stat.revenue), 1);

                      if (sortedMonths.length === 0) {
                        return <p className="text-xs text-slate-400 italic">No revenue logged yet.</p>;
                      }

                      return (
                        <div className="space-y-4">
                          {sortedMonths.map(([month, stats]) => {
                            const barPercent = Math.min(100, Math.round((stats.revenue / maxRevenue) * 100));
                            // Format Year-Month
                            const [year, mNum] = month.split('-');
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const monthStr = monthNames[parseInt(mNum) - 1] || mNum;

                            return (
                              <div key={month} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                  <span>{monthStr} {year}</span>
                                  <span className="font-mono text-slate-700">₹{stats.revenue.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-400">({stats.count} files)</span></span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-lg overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-lg" style={{ width: `${barPercent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ITR Type Distribution bar chart */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenue by Product Type (ITR Types)</h3>

                    {(() => {
                      const itrStats: Record<string, { revenue: number; count: number }> = {};
                      records.forEach(r => {
                        const type = r.itrType || 'ITR-1';
                        if (!itrStats[type]) {
                          itrStats[type] = { revenue: 0, count: 0 };
                        }
                        if (r.paymentStatus === 'Paid') {
                          itrStats[type].revenue += r.paymentAmount;
                        }
                        itrStats[type].count += 1;
                      });

                      const sortedTypes = Object.entries(itrStats).sort((a, b) => b[1].revenue - a[1].revenue);
                      const maxRevenue = sortedTypes.reduce((max, [_, v]) => Math.max(max, v.revenue), 1);

                      if (sortedTypes.length === 0) {
                        return <p className="text-xs text-slate-400 italic">No records to analyze.</p>;
                      }

                      return (
                        <div className="space-y-4">
                          {sortedTypes.map(([type, stats]) => {
                            const barPercent = Math.min(100, Math.round((stats.revenue / maxRevenue) * 100));
                            return (
                              <div key={type} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                  <span className="font-mono">{type}</span>
                                  <span className="font-mono text-slate-700">₹{stats.revenue.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-400">({stats.count} files)</span></span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-lg overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-lg" style={{ width: `${barPercent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </>
            )}
              </motion.div>
            )}

            {/* FULL RECENT ACTIVITY FEED TAB */}
            {activeTab === 'activity' && (
              <motion.div
                key="tab-activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 max-w-3xl"
              >
                {/* Heading */}
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                    Recent Activity Logs
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Audited timeline of latest filings registration and updates.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                  <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                    {loading ? (
                      <p className="text-xs text-slate-400">Loading timeline data...</p>
                    ) : recentTimeline.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No records to trace activity.</p>
                    ) : (
                      recentTimeline.map((item, index) => {
                        const isPaid = item.paymentStatus === 'Paid';
                        return (
                          <div key={item.id || index} className="relative text-xs">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${
                              isPaid ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-amber-500 ring-4 ring-amber-50'
                            }`} />

                            <div className="space-y-1">
                              <span className="font-mono text-[10px] text-slate-400 font-bold block">{item.updatedDateIST || item.createdDateIST}</span>
                              <p className="text-slate-800 font-extrabold text-[13px]">{item.clientName}</p>
                              
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                Filing status updated to <span className="font-bold text-slate-800">{item.filingStatus}</span> for <span className="font-semibold text-slate-700">{item.itrType}</span> (AY {item.assessmentYear}). State file located in <span className="font-bold text-slate-800">{item.state}, {item.city}</span>.
                              </p>

                              <div className="flex items-center gap-1.5 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                  Payment: {item.paymentStatus}
                                </span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₹{item.paymentAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* Dynamic Compact Footer */}
        <footer className="py-3 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white shrink-0">
          FlipMoney ITR Ledger • Operational Loop Active • OPERATING IN INDIAN STANDARD TIME (IST)
        </footer>

      </div>

      {/* Embedded Client Entry & Edit Modal */}
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
      </AnimatePresence>

    </div>
  );
}
