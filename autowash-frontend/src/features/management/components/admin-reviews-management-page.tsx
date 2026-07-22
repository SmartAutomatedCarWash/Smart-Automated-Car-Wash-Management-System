"use client";

import {
  Megaphone,
  Ticket,
  Plus,
  RefreshCw,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  Calendar,
  X,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function AdminReviewManagementPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-screen font-sans">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
          Promotion Management
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Review promotions, discounts, tier voucher offers, and redemption oversight
        </p>
      </div>

      {/* 2. Control Console Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
        <div className="flex items-center">
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
            Admin Growth Console
          </span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm shadow-orange-200">
                <Megaphone className="text-white h-6 w-6" />
              </div>
              <span className="font-black text-xl text-[#0f172a] tracking-tight">
                Promotions
              </span>
            </div>
            
            {/* Toggle */}
            <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-lg hidden sm:flex">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-md shadow-sm">
                <Megaphone className="h-4 w-4" /> Promotions
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-slate-500 text-sm font-bold rounded-md hover:bg-slate-100 transition">
                <Ticket className="h-4 w-4" /> Vouchers
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition">
              <Plus className="h-4 w-4" /> Create promotion
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 3. 4 Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                Total Campaigns
              </div>
              <div className="text-3xl font-black text-[#0f172a] mt-0.5 leading-none">
                1
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-4 font-medium">
            Visible in the current view
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                Running Now
              </div>
              <div className="text-3xl font-black text-[#0f172a] mt-0.5 leading-none">
                1
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-4 font-medium">
            Active and currently in date range
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                Active
              </div>
              <div className="text-3xl font-black text-[#0f172a] mt-0.5 leading-none">
                1
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-4 font-medium">
            Ready to be applied by customers
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider">
                Ending Soon
              </div>
              <div className="text-3xl font-black text-[#0f172a] mt-0.5 leading-none">
                0
              </div>
            </div>
          </div>
          <div className="text-xs text-rose-400 mt-4 font-medium">
            Need a quick review this week
          </div>
        </div>
      </div>

      {/* 4. Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by promotion name..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 transition"
          />
        </div>
        <div className="relative w-full md:w-56 shrink-0">
          <select className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 appearance-none outline-none focus:border-blue-500 transition">
            <option>All status</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative w-full md:w-56 shrink-0">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pick a date"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 transition"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-100 shrink-0 w-full md:w-auto transition">
          <X className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* 5. Table & Pagination */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0f172a]">Promotion list</h2>
          <span className="px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold rounded-full">
            1 active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Campaign
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Discount
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Audience
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Schedule
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-4 py-4 font-bold text-[#0f172a]">Summer 10%</td>
                <td className="px-4 py-4">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
                    % 10%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">
                    All tiers
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-600 font-medium text-sm">
                  07/13/2026 &rarr; 09/18/2026
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100 w-fit">
                      Active
                    </span>
                    <span className="text-xs font-medium text-slate-500">Running</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 shadow-sm transition">
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-sm font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">1</span> to{" "}
            <span className="font-bold text-slate-900">1</span> of{" "}
            <span className="font-bold text-slate-900">1</span> results
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 border border-slate-200 bg-white text-slate-300 rounded-md shadow-sm cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="min-w-[32px] h-8 bg-blue-600 text-white rounded-md shadow-sm font-bold text-sm flex items-center justify-center">
              1
            </button>
            <button className="min-w-[32px] h-8 border border-slate-200 bg-white text-slate-600 rounded-md shadow-sm font-bold text-sm hover:bg-slate-50 flex items-center justify-center transition">
              2
            </button>
            <button className="min-w-[32px] h-8 border border-slate-200 bg-white text-slate-600 rounded-md shadow-sm font-bold text-sm hover:bg-slate-50 flex items-center justify-center transition">
              3
            </button>
            <span className="px-1 text-slate-400 font-bold">...</span>
            <button className="p-1.5 border border-slate-200 bg-white text-slate-600 rounded-md shadow-sm hover:bg-slate-50 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

