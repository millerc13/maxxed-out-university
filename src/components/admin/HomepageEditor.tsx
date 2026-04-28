'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Check,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { SECTION_ICONS, SECTION_ICON_NAMES, getSectionIcon } from '@/lib/section-icons';
import { formatPrice } from '@/lib/utils';

// Color presets that play nicely with the section icon backgrounds on
// the public pages. Admins pick from this fixed list to avoid arbitrary
// hex color soup.
const COLOR_PRESETS = [
  { label: 'Blue', value: 'text-[#0000CC]' },
  { label: 'Gold', value: 'text-[#D4AF37]' },
  { label: 'Amber', value: 'text-amber-500' },
  { label: 'Orange', value: 'text-orange-500' },
  { label: 'Purple', value: 'text-purple-500' },
  { label: 'Green', value: 'text-green-500' },
  { label: 'Red', value: 'text-red-500' },
  { label: 'Slate', value: 'text-slate-700' },
];

interface CourseLite {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  price: number | null;
  published: boolean;
  comingSoon: boolean;
  externalUrl: string | null;
  homepageOrder?: number;
}

interface SectionWithCourses {
  id: string;
  title: string;
  description: string | null;
  iconName: string;
  iconColor: string | null;
  order: number;
  published: boolean;
  courses: CourseLite[];
}

interface AllCourse extends CourseLite {
  homepageSectionId: string | null;
}

export function HomepageEditor({
  initialSections,
  allCourses,
}: {
  initialSections: SectionWithCourses[];
  allCourses: AllCourse[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionWithCourses[]>(initialSections);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [pickerOpenForSection, setPickerOpenForSection] = useState<string | null>(null);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [previewKey, setPreviewKey] = useState(0);

  // Single source of truth for which section a course currently belongs to —
  // recomputed from `sections` so the picker stays in sync after every edit.
  const courseSectionMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sections) for (const c of s.courses) m.set(c.id, s.id);
    return m;
  }, [sections]);

  async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function reload() {
    const data = await api<{ sections: SectionWithCourses[] }>('/api/admin/homepage-sections');
    setSections(data.sections);
    router.refresh();
  }

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  // ── Section CRUD ───────────────────────────────────────────
  function createSection() {
    withBusy('create', async () => {
      await api('/api/admin/homepage-sections', {
        method: 'POST',
        body: JSON.stringify({ title: 'New section', iconName: 'BookOpen', iconColor: 'text-[#0000CC]' }),
      });
      await reload();
    });
  }

  function deleteSection(id: string) {
    if (!confirm('Delete this section? Courses in it will be unassigned (but not deleted).')) return;
    withBusy(`delete:${id}`, async () => {
      await api(`/api/admin/homepage-sections/${id}`, { method: 'DELETE' });
      await reload();
    });
  }

  function updateSection(id: string, patch: Partial<SectionWithCourses>) {
    withBusy(`update:${id}`, async () => {
      await api(`/api/admin/homepage-sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      await reload();
    });
  }

  function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= sections.length) return;
    const reordered = [...sections];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    setSections(reordered); // optimistic
    withBusy(`reorder`, async () => {
      await api('/api/admin/homepage-sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      await reload();
    });
  }

  // ── Course assignment ──────────────────────────────────────
  function setSectionCourses(sectionId: string, courseIds: string[]) {
    withBusy(`courses:${sectionId}`, async () => {
      await api(`/api/admin/homepage-sections/${sectionId}/courses`, {
        method: 'PUT',
        body: JSON.stringify({ courseIds }),
      });
      await reload();
    });
  }

  function removeCourseFromSection(sectionId: string, courseId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const remaining = section.courses.filter((c) => c.id !== courseId).map((c) => c.id);
    setSectionCourses(sectionId, remaining);
  }

  function moveCourseInSection(sectionId: string, courseId: string, dir: -1 | 1) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const idx = section.courses.findIndex((c) => c.id === courseId);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= section.courses.length) return;
    const reordered = [...section.courses];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    setSectionCourses(
      sectionId,
      reordered.map((c) => c.id)
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Header + Tabs ── */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Homepage Sections</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Curate which courses appear in which group across <span className="font-mono">/</span>,{' '}
              <span className="font-mono">/courses</span>, and{' '}
              <span className="font-mono">/dashboard</span>. Drag-free reordering with up/down arrows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={createSection}
              disabled={busy === 'create'}
              className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark disabled:opacity-50"
            >
              {busy === 'create' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Section
            </button>
          </div>
        </div>

        <div className="flex gap-0 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          {(
            [
              { key: 'editor' as const, label: 'Editor', icon: Pencil },
              { key: 'preview' as const, label: 'Preview', icon: Eye },
            ]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                tab === t.key ? 'text-maxxed-blue' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-maxxed-blue rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* ── EDITOR ── */}
      {tab === 'editor' && (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
              <p className="text-gray-500 mb-4">No sections yet.</p>
              <button
                type="button"
                onClick={createSection}
                className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark"
              >
                <Plus className="w-4 h-4" /> Create first section
              </button>
            </div>
          ) : (
            sections.map((section, idx) => (
              <SectionRow
                key={section.id}
                section={section}
                position={idx}
                total={sections.length}
                isEditing={editingSectionId === section.id}
                isPickerOpen={pickerOpenForSection === section.id}
                allCourses={allCourses}
                courseSectionMap={courseSectionMap}
                busy={busy}
                onMove={(dir) => moveSection(section.id, dir)}
                onEdit={() =>
                  setEditingSectionId(editingSectionId === section.id ? null : section.id)
                }
                onSaveMeta={(patch) => {
                  updateSection(section.id, patch);
                  setEditingSectionId(null);
                }}
                onDelete={() => deleteSection(section.id)}
                onTogglePublished={() =>
                  updateSection(section.id, { published: !section.published })
                }
                onOpenPicker={() =>
                  setPickerOpenForSection(pickerOpenForSection === section.id ? null : section.id)
                }
                onClosePicker={() => setPickerOpenForSection(null)}
                onSetCourses={(ids) => setSectionCourses(section.id, ids)}
                onRemoveCourse={(courseId) => removeCourseFromSection(section.id, courseId)}
                onMoveCourse={(courseId, dir) => moveCourseInSection(section.id, courseId, dir)}
              />
            ))
          )}
        </div>
      )}

      {/* ── PREVIEW ── */}
      {tab === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Live page at <span className="font-mono">/?previewAs=customer</span>. Click reload after editing to refresh.
            </p>
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <iframe
              key={previewKey}
              src="/?previewAs=customer"
              title="Homepage preview"
              className="w-full block"
              style={{ height: 'calc(100vh - 220px)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single section row (collapsible meta editor + course list + picker) ──
function SectionRow({
  section,
  position,
  total,
  isEditing,
  isPickerOpen,
  allCourses,
  courseSectionMap,
  busy,
  onMove,
  onEdit,
  onSaveMeta,
  onDelete,
  onTogglePublished,
  onOpenPicker,
  onClosePicker,
  onSetCourses,
  onRemoveCourse,
  onMoveCourse,
}: {
  section: SectionWithCourses;
  position: number;
  total: number;
  isEditing: boolean;
  isPickerOpen: boolean;
  allCourses: AllCourse[];
  courseSectionMap: Map<string, string>;
  busy: string | null;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onSaveMeta: (patch: Partial<SectionWithCourses>) => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSetCourses: (ids: string[]) => void;
  onRemoveCourse: (courseId: string) => void;
  onMoveCourse: (courseId: string, dir: -1 | 1) => void;
}) {
  const Icon = getSectionIcon(section.iconName);
  const sectionBusy = busy?.startsWith('update:') && busy.endsWith(section.id);

  return (
    <div className={`bg-white rounded-xl border ${section.published ? 'border-gray-200' : 'border-gray-300 border-dashed'} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        {/* Reorder */}
        <div className="flex flex-col">
          <button
            type="button"
            disabled={position === 0}
            onClick={() => onMove(-1)}
            className="p-0.5 text-gray-400 hover:text-maxxed-blue disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={position === total - 1}
            onClick={() => onMove(1)}
            className="p-0.5 text-gray-400 hover:text-maxxed-blue disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Icon + Title + Description */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${section.iconColor || 'text-[#0000CC]'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">
            {section.title}
            {!section.published && (
              <span className="ml-2 text-[10px] uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold">
                Hidden
              </span>
            )}
          </h3>
          {section.description && (
            <p className="text-sm text-gray-500 truncate">{section.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePublished}
            disabled={!!sectionBusy}
            className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title={section.published ? 'Hide section' : 'Show section'}
          >
            {section.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg"
            title="Edit section details"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy === `delete:${section.id}`}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
            title="Delete section"
          >
            {busy === `delete:${section.id}` ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Inline meta editor */}
      {isEditing && (
        <SectionMetaForm
          section={section}
          onSave={onSaveMeta}
          onCancel={onEdit}
        />
      )}

      {/* Courses list */}
      <div className="px-4 py-3 space-y-2">
        {section.courses.length === 0 && !isPickerOpen && (
          <div className="text-sm text-gray-400 italic py-4 text-center">
            No courses in this section yet.
          </div>
        )}
        {section.courses.map((course, idx) => (
          <CourseRow
            key={course.id}
            course={course}
            position={idx}
            total={section.courses.length}
            disabled={busy === `courses:${section.id}`}
            onMoveUp={() => onMoveCourse(course.id, -1)}
            onMoveDown={() => onMoveCourse(course.id, 1)}
            onRemove={() => onRemoveCourse(course.id)}
          />
        ))}

        {/* Picker */}
        {isPickerOpen ? (
          <CoursePicker
            allCourses={allCourses}
            currentIds={section.courses.map((c) => c.id)}
            courseSectionMap={courseSectionMap}
            sectionId={section.id}
            disabled={busy === `courses:${section.id}`}
            onSave={(ids) => {
              onSetCourses(ids);
              onClosePicker();
            }}
            onCancel={onClosePicker}
          />
        ) : (
          <button
            type="button"
            onClick={onOpenPicker}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 text-gray-500 hover:text-maxxed-blue hover:border-maxxed-blue rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Manage courses in this section
          </button>
        )}
      </div>
    </div>
  );
}

// ── Inline title/desc/icon/color form ──
function SectionMetaForm({
  section,
  onSave,
  onCancel,
}: {
  section: SectionWithCourses;
  onSave: (patch: Partial<SectionWithCourses>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');
  const [iconName, setIconName] = useState(section.iconName);
  const [iconColor, setIconColor] = useState(section.iconColor || COLOR_PRESETS[0].value);

  return (
    <div className="px-4 py-4 bg-blue-50/30 border-b border-blue-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional sub-headline shown under the title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          {SECTION_ICON_NAMES.map((name) => {
            const I = SECTION_ICONS[name];
            const selected = name === iconName;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIconName(name)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-colors ${
                  selected
                    ? 'border-maxxed-blue bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                title={name}
              >
                <I className={`w-4 h-4 ${selected ? iconColor : 'text-gray-600'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => {
            const selected = c.value === iconColor;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setIconColor(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors flex items-center gap-1.5 ${
                  selected ? 'border-maxxed-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className={`inline-block w-3 h-3 rounded-full ${c.value.replace('text-', 'bg-')}`} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() =>
            onSave({
              title: title.trim() || section.title,
              description: description.trim() || null,
              iconName,
              iconColor,
            })
          }
          className="px-4 py-1.5 bg-maxxed-blue text-white rounded-md text-sm font-medium hover:bg-maxxed-blue-dark"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── A single course row inside a section ──
function CourseRow({
  course,
  position,
  total,
  disabled,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  course: CourseLite;
  position: number;
  total: number;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
      <div className="flex flex-col">
        <button
          type="button"
          disabled={position === 0 || disabled}
          onClick={onMoveUp}
          className="p-0.5 text-gray-400 hover:text-maxxed-blue disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={position === total - 1 || disabled}
          onClick={onMoveDown}
          className="p-0.5 text-gray-400 hover:text-maxxed-blue disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-12 h-8 rounded bg-gray-200 flex-shrink-0 overflow-hidden relative">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{course.title}</p>
        <p className="text-xs text-gray-500 truncate">
          {course.externalUrl ? 'Apply Only' : course.price ? formatPrice(course.price) : 'Free'}
          {!course.published && <span className="ml-1.5 text-orange-600">· Draft</span>}
          {course.comingSoon && <span className="ml-1.5 text-purple-600">· Coming Soon</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
        title="Remove from this section"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Multi-select picker showing every course with its current section ──
function CoursePicker({
  allCourses,
  currentIds,
  courseSectionMap,
  sectionId,
  disabled,
  onSave,
  onCancel,
}: {
  allCourses: AllCourse[];
  currentIds: string[];
  courseSectionMap: Map<string, string>;
  sectionId: string;
  disabled: boolean;
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentIds));
  const [filter, setFilter] = useState('');

  const filteredCourses = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((c) => c.title.toLowerCase().includes(q));
  }, [allCourses, filter]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="bg-white border-2 border-maxxed-blue/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter courses…"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {selected.size} selected
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
        {filteredCourses.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-gray-400">
            No courses match your filter.
          </div>
        )}
        {filteredCourses.map((course) => {
          const isSelected = selected.has(course.id);
          const assignedTo = courseSectionMap.get(course.id);
          const inOtherSection = assignedTo && assignedTo !== sectionId;
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => toggle(course.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                isSelected ? 'bg-blue-50/40' : ''
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-maxxed-blue border-maxxed-blue' : 'border-gray-300'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="w-10 h-7 rounded bg-gray-200 flex-shrink-0 overflow-hidden relative">
                {course.thumbnail ? (
                  <Image src={course.thumbnail} alt="" fill sizes="40px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{course.title}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {course.externalUrl
                    ? 'Apply Only'
                    : course.price
                      ? formatPrice(course.price)
                      : 'Free'}
                  {inOtherSection && (
                    <span className="ml-1.5 text-amber-600">
                      · in another section (will move)
                    </span>
                  )}
                  {!course.published && (
                    <span className="ml-1.5 text-orange-600">· Draft</span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(Array.from(selected))}
          disabled={disabled}
          className="px-4 py-1.5 bg-maxxed-blue text-white rounded-md text-sm font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 flex items-center gap-2"
        >
          {disabled && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save selection
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
