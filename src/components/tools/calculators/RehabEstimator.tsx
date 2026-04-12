'use client';

import { useState, useMemo, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import Image from 'next/image';
import type { ToolHandle, ExportPayload } from '@/components/tools/ExportableToolShell';
import { formatCurrency } from '@/lib/calc-utils';

/* ------------------------------------------------------------------ */
/*  Inline helper components                                          */
/* ------------------------------------------------------------------ */

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    setDisplay(value === 0 ? '' : String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(display);
    const num = isNaN(parsed) ? 0 : parsed;
    onChange(num);
    if (prefix === '$') {
      setDisplay(num.toLocaleString('en-US'));
    } else {
      setDisplay(String(num));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const cleaned = raw.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const displayValue = focused
    ? display
    : prefix === '$'
      ? (value === 0 ? '0' : value.toLocaleString('en-US'))
      : String(value);

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className={`
            w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm
            focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
            outline-none transition-all
            ${prefix ? 'pl-7' : 'pl-3'}
            ${suffix ? 'pr-8' : 'pr-3'}
          `}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm
          focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
          outline-none transition-all"
      />
    </div>
  );
}

function Section({
  title,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {badge && (
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 rounded-full px-2.5 py-0.5 tabular-nums">
              {badge}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${large ? 'py-3' : 'py-2'}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${large ? 'text-lg' : 'text-sm'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Line item types                                                    */
/* ------------------------------------------------------------------ */

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
}

interface CategoryState {
  items: LineItem[];
}

const CATEGORIES = [
  { key: 'kitchen', label: 'Kitchen', defaults: ['Cabinets', 'Countertops', 'Appliances', 'Backsplash', 'Sink & Faucet'] },
  { key: 'bathroom', label: 'Bathroom', defaults: ['Vanity', 'Toilet', 'Shower/Tub', 'Tile', 'Fixtures'] },
  { key: 'flooring', label: 'Flooring', defaults: ['Hardwood / LVP', 'Carpet', 'Tile', 'Subfloor Repair'] },
  { key: 'exterior', label: 'Exterior', defaults: ['Roof', 'Siding', 'Windows', 'Doors', 'Landscaping', 'Driveway'] },
  { key: 'mechanical', label: 'Mechanical / Systems', defaults: ['HVAC', 'Plumbing', 'Electrical', 'Water Heater'] },
  { key: 'general', label: 'General / Other', defaults: ['Dumpster', 'Permits', 'Cleaning', 'Staging'] },
  { key: 'cosmetic', label: 'Cosmetic', defaults: ['Interior Paint', 'Exterior Paint', 'Trim & Molding', 'Light Fixtures', 'Hardware'] },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultCategory(defaults: readonly string[]): CategoryState {
  return {
    items: defaults.map((d) => ({
      id: makeId(),
      description: d,
      quantity: 1,
      unitCost: 0,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const RehabEstimator = forwardRef<ToolHandle>(function RehabEstimator(_, ref) {
  // -- Property Info --
  const [address, setAddress] = useState('');
  const [sqFt, setSqFt] = useState(0);
  const [beds, setBeds] = useState(0);
  const [baths, setBaths] = useState(0);

  // -- Category states --
  const [categories, setCategories] = useState<Record<CategoryKey, CategoryState>>(() => {
    const init: Record<string, CategoryState> = {};
    CATEGORIES.forEach((cat) => {
      init[cat.key] = defaultCategory(cat.defaults);
    });
    return init as Record<CategoryKey, CategoryState>;
  });

  // -- Contingency --
  const [contingencyPct, setContingencyPct] = useState(10);

  // -- Mobile summary toggle --
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(true);

  /* ---------------------------------------------------------------- */
  /*  Category update helpers                                          */
  /* ---------------------------------------------------------------- */

  const updateItem = useCallback(
    (catKey: CategoryKey, itemId: string, field: keyof LineItem, val: string | number) => {
      setCategories((prev) => {
        const cat = { ...prev[catKey] };
        cat.items = cat.items.map((item) =>
          item.id === itemId ? { ...item, [field]: val } : item,
        );
        return { ...prev, [catKey]: cat };
      });
    },
    [],
  );

  const addItem = useCallback(
    (catKey: CategoryKey) => {
      setCategories((prev) => {
        const cat = { ...prev[catKey] };
        cat.items = [
          ...cat.items,
          { id: makeId(), description: '', quantity: 1, unitCost: 0 },
        ];
        return { ...prev, [catKey]: cat };
      });
    },
    [],
  );

  const removeItem = useCallback(
    (catKey: CategoryKey, itemId: string) => {
      setCategories((prev) => {
        const cat = { ...prev[catKey] };
        cat.items = cat.items.filter((item) => item.id !== itemId);
        return { ...prev, [catKey]: cat };
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Computed values                                                  */
  /* ---------------------------------------------------------------- */

  const computed = useMemo(() => {
    const categoryTotals: Record<CategoryKey, number> = {} as Record<CategoryKey, number>;
    let grandTotal = 0;

    CATEGORIES.forEach((cat) => {
      const total = categories[cat.key].items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0,
      );
      categoryTotals[cat.key] = total;
      grandTotal += total;
    });

    const contingency = grandTotal * (contingencyPct / 100);
    const finalTotal = grandTotal + contingency;
    const costPerSqFt = sqFt > 0 ? finalTotal / sqFt : 0;

    return { categoryTotals, grandTotal, contingency, finalTotal, costPerSqFt };
  }, [categories, contingencyPct, sqFt]);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const resetAll = () => {
    setAddress(''); setSqFt(0); setBeds(0); setBaths(0);
    setContingencyPct(10);
    const init: Record<string, CategoryState> = {};
    CATEGORIES.forEach((cat) => {
      init[cat.key] = defaultCategory(cat.defaults);
    });
    setCategories(init as Record<CategoryKey, CategoryState>);
  };

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  useImperativeHandle(ref, () => ({
    getExportData: (): ExportPayload => {
      const sections: ExportPayload['sections'] = [
        {
          heading: 'Property Information',
          rows: [
            { label: 'Address', value: address || '-' },
            { label: 'Square Footage', value: sqFt > 0 ? sqFt.toLocaleString() : '-' },
            { label: 'Beds', value: String(beds) },
            { label: 'Baths', value: String(baths) },
          ],
        },
      ];

      CATEGORIES.forEach((cat) => {
        const items = categories[cat.key].items.filter(
          (item) => item.description || item.unitCost > 0,
        );
        if (items.length > 0) {
          sections.push({
            heading: cat.label,
            table: {
              headers: ['Description', 'Qty', 'Unit Cost', 'Total'],
              rows: [
                ...items.map((item) => [
                  item.description || '-',
                  String(item.quantity),
                  formatCurrency(item.unitCost),
                  formatCurrency(item.quantity * item.unitCost),
                ]),
                ['Subtotal', '', '', formatCurrency(computed.categoryTotals[cat.key])],
              ],
            },
          });
        }
      });

      sections.push({
        heading: 'Summary',
        rows: [
          { label: 'Grand Total (before contingency)', value: formatCurrency(computed.grandTotal) },
          { label: `Contingency (${contingencyPct}%)`, value: formatCurrency(computed.contingency) },
          { label: 'Final Total', value: formatCurrency(computed.finalTotal) },
          { label: 'Cost Per Sq Ft', value: computed.costPerSqFt > 0 ? formatCurrency(computed.costPerSqFt) : '-' },
        ],
      });

      return {
        title: address ? `Rehab Estimate — ${address}` : 'Rehab Estimator Worksheet',
        type: 'calculator',
        sections,
      };
    },
  }));

  /* ---------------------------------------------------------------- */
  /*  Results Card                                                     */
  /* ---------------------------------------------------------------- */

  const resultsContent = (
    <div className="space-y-1 divide-y divide-gray-100">
      <div className="pb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Final Total
        </p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(computed.finalTotal)}
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <MetricRow
          key={cat.key}
          label={cat.label}
          value={formatCurrency(computed.categoryTotals[cat.key])}
        />
      ))}

      <MetricRow
        label="Subtotal"
        value={formatCurrency(computed.grandTotal)}
        large
      />
      <MetricRow
        label={`Contingency (${contingencyPct}%)`}
        value={formatCurrency(computed.contingency)}
        color="#ca8a04"
      />
      {sqFt > 0 && (
        <MetricRow
          label="Cost / Sq Ft"
          value={formatCurrency(computed.costPerSqFt)}
        />
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Line Item Table                                                  */
  /* ---------------------------------------------------------------- */

  function LineItemTable({ catKey }: { catKey: CategoryKey }) {
    const cat = categories[catKey];
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit Cost</span>
          <span>Total</span>
          <span />
        </div>
        {cat.items.map((item) => {
          const total = item.quantity * item.unitCost;
          return (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(catKey, item.id, 'description', e.target.value)}
                placeholder="Item description"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm
                  focus:border-[#0000CC] focus:ring-2 focus:ring-[#0000CC]/20 focus:bg-white
                  outline-none transition-all"
              />
              <NumberInput
                label=""
                value={item.quantity}
                onChange={(v) => updateItem(catKey, item.id, 'quantity', v)}
              />
              <NumberInput
                label=""
                value={item.unitCost}
                onChange={(v) => updateItem(catKey, item.id, 'unitCost', v)}
                prefix="$"
              />
              <div className="text-sm font-semibold text-gray-700 tabular-nums py-2 px-1">
                {formatCurrency(total)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(catKey, item.id)}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                title="Remove item"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => addItem(catKey)}
          className="text-xs text-[#0000CC] hover:text-[#0000AA] font-medium transition-colors"
        >
          + Add Item
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Image
          src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
          alt="Maxxed Out"
          width={120}
          height={47}
          className="h-10 w-auto hidden sm:block"
        />
        <h2 className="text-2xl font-bold text-gray-900">Rehab Estimator Worksheet</h2>
      </div>
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Inputs */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Reset */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Mobile Summary Toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full flex items-center justify-between rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Estimate Summary
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${mobileSummaryOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileSummaryOpen && (
            <div className="mt-2 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
              {resultsContent}
            </div>
          )}
        </div>

        <Section title="Property Information">
          <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, ST" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="Square Footage" value={sqFt} onChange={setSqFt} suffix="sq ft" />
            <NumberInput label="Bedrooms" value={beds} onChange={setBeds} />
            <NumberInput label="Bathrooms" value={baths} onChange={setBaths} />
          </div>
        </Section>

        {CATEGORIES.map((cat) => (
          <Section
            key={cat.key}
            title={cat.label}
            defaultOpen={cat.key === 'kitchen'}
            badge={computed.categoryTotals[cat.key] > 0 ? formatCurrency(computed.categoryTotals[cat.key]) : undefined}
          >
            <LineItemTable catKey={cat.key} />
          </Section>
        ))}

        <Section title="Contingency">
          <NumberInput
            label="Contingency Percentage"
            value={contingencyPct}
            onChange={setContingencyPct}
            suffix="%"
            hint="Buffer for unexpected costs (10-20% recommended)"
          />
          <div className="rounded-lg bg-yellow-50 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-yellow-900">Contingency Amount</span>
            <span className="text-sm font-bold text-yellow-900 tabular-nums">{formatCurrency(computed.contingency)}</span>
          </div>
        </Section>
      </div>

      {/* Right: Results Sidebar (desktop) */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-6 rounded-xl bg-white shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Estimate Summary
          </h3>
          {resultsContent}
        </div>
      </div>
    </div>
    </div>
  );
});

export default RehabEstimator;
