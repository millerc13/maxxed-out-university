'use client';

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeadInfo {
  dateReceived: string;
  propertyAddress: string;
  sellerName: string;
  phone: string;
  email: string;
  leadSource: string;
}

interface SellerSituation {
  motivationLevel: string;
  reasonForSelling: string;
  timeline: string;
  mortgageBalance: string;
  monthsBehind: string;
  otherLiens: string;
}

interface PropertyOffer {
  arv: string;
  repairEstimate: string;
  offerPrice: string;
  strategy: string;
}

interface PipelineRow {
  id: string;
  stage: string;
  date: string;
  notes: string;
}

interface FollowUpRow {
  id: string;
  date: string;
  method: string;
  notes: string;
  nextAction: string;
}

const LEAD_SOURCES = ['Direct Mail', 'PPC', 'Referral', 'Driving for Dollars', 'Other'];
const TIMELINES = ['Immediate', '30 Days', '60+ Days'];
const STRATEGIES = ['Wholesale', 'Flip', 'BRRRR', 'Hold'];
const PIPELINE_STAGES = ['Lead', 'Contacted', 'Offer Made', 'Under Contract', 'Due Diligence', 'Closed', 'Dead'];
const FOLLOW_UP_METHODS = ['Call', 'Text', 'Email', 'In-Person'];

let rowId = 0;
const nextId = () => `row-${++rowId}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DealFlowTracker = forwardRef<ToolHandle>(function DealFlowTracker(_props, ref) {
  const [lead, setLead] = useState<LeadInfo>({
    dateReceived: '', propertyAddress: '', sellerName: '', phone: '', email: '', leadSource: '',
  });

  const [seller, setSeller] = useState<SellerSituation>({
    motivationLevel: '5', reasonForSelling: '', timeline: 'Immediate',
    mortgageBalance: '', monthsBehind: '', otherLiens: '',
  });

  const [property, setProperty] = useState<PropertyOffer>({
    arv: '', repairEstimate: '', offerPrice: '', strategy: 'Wholesale',
  });

  const [pipeline, setPipeline] = useState<PipelineRow[]>([
    { id: nextId(), stage: 'Lead', date: '', notes: '' },
  ]);

  const [followUps, setFollowUps] = useState<FollowUpRow[]>([
    { id: nextId(), date: '', method: 'Call', notes: '', nextAction: '' },
  ]);

  const addPipelineRow = () => {
    setPipeline((prev) => [...prev, { id: nextId(), stage: 'Lead', date: '', notes: '' }]);
  };

  const removePipelineRow = (id: string) => {
    setPipeline((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  };

  const addFollowUpRow = () => {
    setFollowUps((prev) => [...prev, { id: nextId(), date: '', method: 'Call', notes: '', nextAction: '' }]);
  };

  const removeFollowUpRow = (id: string) => {
    setFollowUps((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  };

  const resetAll = () => {
    setLead({ dateReceived: '', propertyAddress: '', sellerName: '', phone: '', email: '', leadSource: '' });
    setSeller({ motivationLevel: '5', reasonForSelling: '', timeline: 'Immediate', mortgageBalance: '', monthsBehind: '', otherLiens: '' });
    setProperty({ arv: '', repairEstimate: '', offerPrice: '', strategy: 'Wholesale' });
    setPipeline([{ id: nextId(), stage: 'Lead', date: '', notes: '' }]);
    setFollowUps([{ id: nextId(), date: '', method: 'Call', notes: '', nextAction: '' }]);
  };

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => ({
      title: 'Deal Flow Tracker',
      type: 'tracker',
      sections: [
        {
          heading: 'Lead Information',
          rows: [
            { label: 'Date Received', value: lead.dateReceived || '-' },
            { label: 'Property Address', value: lead.propertyAddress || '-' },
            { label: 'Seller Name', value: lead.sellerName || '-' },
            { label: 'Phone', value: lead.phone || '-' },
            { label: 'Email', value: lead.email || '-' },
            { label: 'Lead Source', value: lead.leadSource || '-' },
          ],
        },
        {
          heading: 'Seller Situation',
          rows: [
            { label: 'Motivation Level', value: `${seller.motivationLevel}/10` },
            { label: 'Reason for Selling', value: seller.reasonForSelling || '-' },
            { label: 'Timeline', value: seller.timeline },
            { label: 'Mortgage Balance', value: seller.mortgageBalance ? `$${seller.mortgageBalance}` : '-' },
            { label: 'Months Behind', value: seller.monthsBehind || '-' },
            { label: 'Other Liens', value: seller.otherLiens ? `$${seller.otherLiens}` : '-' },
          ],
        },
        {
          heading: 'Property & Offer',
          rows: [
            { label: 'ARV', value: property.arv ? `$${property.arv}` : '-' },
            { label: 'Repair Estimate', value: property.repairEstimate ? `$${property.repairEstimate}` : '-' },
            { label: 'Offer Price', value: property.offerPrice ? `$${property.offerPrice}` : '-' },
            { label: 'Strategy', value: property.strategy },
          ],
        },
        {
          heading: 'Pipeline Status',
          table: {
            headers: ['Stage', 'Date', 'Notes'],
            rows: pipeline.map((r) => [r.stage, r.date || '-', r.notes || '-']),
          },
        },
        {
          heading: 'Follow-Up Log',
          table: {
            headers: ['Date', 'Method', 'Notes', 'Next Action'],
            rows: followUps.map((r) => [r.date || '-', r.method, r.notes || '-', r.nextAction || '-']),
          },
        },
      ],
    }),
  }));

  const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all";
  const selectCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all appearance-none cursor-pointer";
  const dollarInputCls = "w-full bg-transparent py-2 px-2 outline-none text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const tableInputCls = "w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out"
          width={120}
          height={47}
          className="h-10 w-auto"
        />
      </div>
      {/* Lead Information */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Lead Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Date Received</span>
            <input
              type="date"
              value={lead.dateReceived}
              onChange={(e) => setLead((p) => ({ ...p, dateReceived: e.target.value }))}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-600 font-medium">Property Address</span>
            <input
              type="text"
              value={lead.propertyAddress}
              onChange={(e) => setLead((p) => ({ ...p, propertyAddress: e.target.value }))}
              className={inputCls}
              placeholder="123 Main St, City, ST 12345"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Seller Name</span>
            <input
              type="text"
              value={lead.sellerName}
              onChange={(e) => setLead((p) => ({ ...p, sellerName: e.target.value }))}
              className={inputCls}
              placeholder="John Doe"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Phone</span>
            <input
              type="tel"
              value={lead.phone}
              onChange={(e) => setLead((p) => ({ ...p, phone: e.target.value }))}
              className={inputCls}
              placeholder="(555) 123-4567"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Email</span>
            <input
              type="email"
              value={lead.email}
              onChange={(e) => setLead((p) => ({ ...p, email: e.target.value }))}
              className={inputCls}
              placeholder="seller@email.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Lead Source</span>
            <select
              value={lead.leadSource}
              onChange={(e) => setLead((p) => ({ ...p, leadSource: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select source...</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Seller Situation */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Seller Situation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-600 font-medium">
              Motivation Level: <span className="text-[#0000CC] font-bold">{seller.motivationLevel}/10</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={seller.motivationLevel}
              onChange={(e) => setSeller((p) => ({ ...p, motivationLevel: e.target.value }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0000CC]"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Low</span>
              <span>High</span>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-600 font-medium">Reason for Selling</span>
            <input
              type="text"
              value={seller.reasonForSelling}
              onChange={(e) => setSeller((p) => ({ ...p, reasonForSelling: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Foreclosure, divorce, inherited..."
            />
          </label>
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-600 font-medium">Timeline</span>
            <div className="flex gap-3">
              {TIMELINES.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timeline"
                    value={t}
                    checked={seller.timeline === t}
                    onChange={() => setSeller((p) => ({ ...p, timeline: t }))}
                    className="w-4 h-4 text-[#0000CC] focus:ring-[#0000CC]/30 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Mortgage Balance</span>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
              <span className="pl-3 text-gray-400 select-none">$</span>
              <input
                type="number"
                value={seller.mortgageBalance}
                onChange={(e) => setSeller((p) => ({ ...p, mortgageBalance: e.target.value }))}
                className={dollarInputCls}
                placeholder="0"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Months Behind</span>
            <input
              type="number"
              value={seller.monthsBehind}
              onChange={(e) => setSeller((p) => ({ ...p, monthsBehind: e.target.value }))}
              className={inputCls}
              placeholder="0"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Other Liens</span>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
              <span className="pl-3 text-gray-400 select-none">$</span>
              <input
                type="number"
                value={seller.otherLiens}
                onChange={(e) => setSeller((p) => ({ ...p, otherLiens: e.target.value }))}
                className={dollarInputCls}
                placeholder="0"
              />
            </div>
          </label>
        </div>
      </div>

      {/* Property & Offer */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
          Property & Offer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'arv' as const, label: 'ARV' },
            { key: 'repairEstimate' as const, label: 'Repair Estimate' },
            { key: 'offerPrice' as const, label: 'Offer Price' },
          ].map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 font-medium">{f.label}</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-[#0000CC] focus-within:ring-2 focus-within:ring-[#0000CC]/20 transition-all">
                <span className="pl-3 text-gray-400 select-none">$</span>
                <input
                  type="number"
                  value={property[f.key]}
                  onChange={(e) => setProperty((p) => ({ ...p, [f.key]: e.target.value }))}
                  className={dollarInputCls}
                  placeholder="0"
                />
              </div>
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600 font-medium">Strategy</span>
            <select
              value={property.strategy}
              onChange={(e) => setProperty((p) => ({ ...p, strategy: e.target.value }))}
              className={selectCls}
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Pipeline Status
          </h3>
          <button
            type="button"
            onClick={addPipelineRow}
            className="px-3 py-1.5 text-xs font-medium text-[#0000CC] bg-[#0000CC]/5 hover:bg-[#0000CC]/10 rounded-lg transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-2 font-semibold text-gray-600 w-1/4">Stage</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Notes</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {pipeline.map((row, ri) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-1">
                    <select
                      value={row.stage}
                      onChange={(e) => {
                        const next = [...pipeline];
                        next[ri] = { ...next[ri], stage: e.target.value };
                        setPipeline(next);
                      }}
                      className={`${tableInputCls} appearance-none cursor-pointer`}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const next = [...pipeline];
                        next[ri] = { ...next[ri], date: e.target.value };
                        setPipeline(next);
                      }}
                      className={tableInputCls}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => {
                        const next = [...pipeline];
                        next[ri] = { ...next[ri], notes: e.target.value };
                        setPipeline(next);
                      }}
                      className={tableInputCls}
                      placeholder="Add notes..."
                    />
                  </td>
                  <td className="py-1.5 pl-1">
                    <button
                      type="button"
                      onClick={() => removePipelineRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-Up Log */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Follow-Up Log
          </h3>
          <button
            type="button"
            onClick={addFollowUpRow}
            className="px-3 py-1.5 text-xs font-medium text-[#0000CC] bg-[#0000CC]/5 hover:bg-[#0000CC]/10 rounded-lg transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-2 font-semibold text-gray-600 w-1/6">Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/6">Method</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Notes</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600 w-1/5">Next Action</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {followUps.map((row, ri) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const next = [...followUps];
                        next[ri] = { ...next[ri], date: e.target.value };
                        setFollowUps(next);
                      }}
                      className={tableInputCls}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <select
                      value={row.method}
                      onChange={(e) => {
                        const next = [...followUps];
                        next[ri] = { ...next[ri], method: e.target.value };
                        setFollowUps(next);
                      }}
                      className={`${tableInputCls} appearance-none cursor-pointer`}
                    >
                      {FOLLOW_UP_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => {
                        const next = [...followUps];
                        next[ri] = { ...next[ri], notes: e.target.value };
                        setFollowUps(next);
                      }}
                      className={tableInputCls}
                      placeholder="What happened..."
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="text"
                      value={row.nextAction}
                      onChange={(e) => {
                        const next = [...followUps];
                        next[ri] = { ...next[ri], nextAction: e.target.value };
                        setFollowUps(next);
                      }}
                      className={tableInputCls}
                      placeholder="Next step..."
                    />
                  </td>
                  <td className="py-1.5 pl-1">
                    <button
                      type="button"
                      onClick={() => removeFollowUpRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetAll}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Reset All
        </button>
      </div>
    </div>
  );
});

export default DealFlowTracker;
