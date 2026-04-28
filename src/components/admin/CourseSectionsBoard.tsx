'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  GripVertical,
  Edit,
  ExternalLink,
  ImageOff,
  Save as SaveIcon,
  Undo2,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SECTION_ICONS, SECTION_ICON_NAMES, getSectionIcon } from '@/lib/section-icons';
import { formatPrice } from '@/lib/utils';
import { DeleteCourseButton } from '@/components/admin/DeleteCourseButton';
import { SectionsCatalogPreview } from '@/components/admin/SectionsCatalogPreview';

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

const UNASSIGNED_ID = '__unassigned__';
const TEMP_ID_PREFIX = 'temp_';

interface CourseLite {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  shortDesc: string | null;
  price: number | null;
  published: boolean;
  comingSoon: boolean;
  externalUrl: string | null;
  totalLessons: number;
  enrollmentCount: number;
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

interface BoardState {
  sections: SectionWithCourses[];
  unassigned: CourseLite[];
}

// ── Pure helpers ──────────────────────────────────────────────
function deepEqualState(a: BoardState, b: BoardState): boolean {
  if (a.sections.length !== b.sections.length) return false;
  if (a.unassigned.length !== b.unassigned.length) return false;
  for (let i = 0; i < a.sections.length; i++) {
    const x = a.sections[i];
    const y = b.sections[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      (x.description ?? null) !== (y.description ?? null) ||
      x.iconName !== y.iconName ||
      (x.iconColor ?? null) !== (y.iconColor ?? null) ||
      x.published !== y.published ||
      x.courses.length !== y.courses.length
    ) {
      return false;
    }
    for (let j = 0; j < x.courses.length; j++) {
      if (x.courses[j].id !== y.courses[j].id) return false;
    }
  }
  for (let i = 0; i < a.unassigned.length; i++) {
    if (a.unassigned[i].id !== b.unassigned[i].id) return false;
  }
  return true;
}

function cloneState(s: BoardState): BoardState {
  return {
    sections: s.sections.map((sec) => ({ ...sec, courses: [...sec.courses] })),
    unassigned: [...s.unassigned],
  };
}

export function CourseSectionsBoard({
  initialSections,
  initialUnassigned,
}: {
  initialSections: SectionWithCourses[];
  initialUnassigned: CourseLite[];
}) {
  const router = useRouter();

  // ── Snapshot (last saved state) + draft (in-progress edits) ──
  // All editor mutations modify `draft` only; nothing hits the API
  // until Todd clicks Save. Discard rolls back to snapshot.
  const [snapshot, setSnapshot] = useState<BoardState>({
    sections: initialSections,
    unassigned: initialUnassigned,
  });
  const [draft, setDraft] = useState<BoardState>(() => cloneState({
    sections: initialSections,
    unassigned: initialUnassigned,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseLite | null>(null);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');

  // When the server data refreshes (e.g. after a course delete from a
  // child route, or after our own save -> router.refresh), sync the
  // baseline. Only do this if the user has no pending edits — never
  // clobber a dirty draft.
  const initialKey = useMemo(
    () =>
      initialSections.map((s) => s.id).join(',') +
      '|' +
      initialUnassigned.map((c) => c.id).join(','),
    [initialSections, initialUnassigned]
  );
  const lastSyncedKey = useRef(initialKey);
  useEffect(() => {
    if (initialKey === lastSyncedKey.current) return;
    lastSyncedKey.current = initialKey;
    const incoming = { sections: initialSections, unassigned: initialUnassigned };
    setSnapshot(incoming);
    if (deepEqualState(draft, snapshot)) {
      setDraft(cloneState(incoming));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const isDirty = useMemo(() => !deepEqualState(snapshot, draft), [snapshot, draft]);

  // Coming-Soon courses for the preview — pulled from across the entire
  // draft (assigned + unassigned). Mirrors how the public homepage
  // builds its dedicated Coming Soon section.
  const previewComingSoon = useMemo(() => {
    const all = [...draft.unassigned, ...draft.sections.flatMap((s) => s.courses)];
    return all.filter((c) => c.comingSoon);
  }, [draft]);

  // ── Container helpers (treats Unassigned as a virtual container) ──
  function findContainerOfCourse(courseId: string): string | null {
    if (draft.unassigned.some((c) => c.id === courseId)) return UNASSIGNED_ID;
    for (const s of draft.sections) {
      if (s.courses.some((c) => c.id === courseId)) return s.id;
    }
    return null;
  }

  function getCoursesIn(containerId: string): CourseLite[] {
    if (containerId === UNASSIGNED_ID) return draft.unassigned;
    return draft.sections.find((s) => s.id === containerId)?.courses ?? [];
  }

  function setCoursesIn(d: BoardState, containerId: string, courses: CourseLite[]): BoardState {
    if (containerId === UNASSIGNED_ID) {
      return { ...d, unassigned: courses };
    }
    return {
      ...d,
      sections: d.sections.map((s) => (s.id === containerId ? { ...s, courses } : s)),
    };
  }

  // ── Draft mutations (no API calls) ─────────────────────────
  function patchSection(id: string, patch: Partial<SectionWithCourses>) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function addSection() {
    const tempId = `${TEMP_ID_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
    setDraft((d) => ({
      ...d,
      sections: [
        ...d.sections,
        {
          id: tempId,
          title: 'New section',
          description: null,
          iconName: 'BookOpen',
          iconColor: 'text-[#0000CC]',
          order: d.sections.length,
          published: true,
          courses: [],
        },
      ],
    }));
    setEditingSectionId(tempId);
  }

  function removeSection(id: string) {
    if (
      !confirm(
        'Delete this section? Any courses inside will move to "Unassigned" until you save.'
      )
    )
      return;
    setDraft((d) => {
      const removed = d.sections.find((s) => s.id === id);
      if (!removed) return d;
      return {
        sections: d.sections.filter((s) => s.id !== id),
        // Courses from the deleted section spill into Unassigned in the
        // draft so the admin can see them and re-assign before saving.
        unassigned: [...removed.courses, ...d.unassigned],
      };
    });
    if (editingSectionId === id) setEditingSectionId(null);
  }

  function toggleSectionPublished(id: string) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id === id ? { ...s, published: !s.published } : s
      ),
    }));
  }

  // ── Drag & drop (mutates draft only) ───────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const containerId = findContainerOfCourse(id);
    if (!containerId) return;
    const course = getCoursesIn(containerId).find((c) => c.id === id);
    if (course) setActiveCourse(course);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceContainer = findContainerOfCourse(activeId);
    let destContainer = findContainerOfCourse(overId);
    if (
      !destContainer &&
      (overId === UNASSIGNED_ID || draft.sections.some((s) => s.id === overId))
    ) {
      destContainer = overId;
    }
    if (!sourceContainer || !destContainer || sourceContainer === destContainer) return;

    setDraft((d) => {
      const sourceCourses = (
        sourceContainer === UNASSIGNED_ID
          ? d.unassigned
          : d.sections.find((s) => s.id === sourceContainer)?.courses
      ) ?? [];
      const destCourses = (
        destContainer === UNASSIGNED_ID
          ? d.unassigned
          : d.sections.find((s) => s.id === destContainer)?.courses
      ) ?? [];

      const moving = sourceCourses.find((c) => c.id === activeId);
      if (!moving) return d;

      const overIdx = destCourses.findIndex((c) => c.id === overId);
      const newDest = [...destCourses];
      if (overIdx === -1) newDest.push(moving);
      else newDest.splice(overIdx, 0, moving);

      const newSource = sourceCourses.filter((c) => c.id !== activeId);

      let next = setCoursesIn(d, sourceContainer!, newSource);
      next = setCoursesIn(next, destContainer!, newDest);
      return next;
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCourse(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceContainer = findContainerOfCourse(activeId);
    if (!sourceContainer || activeId === overId) return;

    // Within-container: arrayMove for reorder.
    let destContainer = findContainerOfCourse(overId);
    if (
      !destContainer &&
      (overId === UNASSIGNED_ID || draft.sections.some((s) => s.id === overId))
    ) {
      destContainer = overId;
    }
    if (sourceContainer === destContainer) {
      setDraft((d) => {
        const courses = getCoursesInDraft(d, sourceContainer!);
        const oldIdx = courses.findIndex((c) => c.id === activeId);
        const newIdx = courses.findIndex((c) => c.id === overId);
        if (oldIdx === -1 || newIdx === -1) return d;
        return setCoursesIn(d, sourceContainer!, arrayMove(courses, oldIdx, newIdx));
      });
    }
    // Cross-container: onDragOver already updated the draft.
  }

  // ── Save / Discard ─────────────────────────────────────────
  async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function saveAll() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // Step 1 — Delete sections that exist in snapshot but not in draft.
      const draftIds = new Set(draft.sections.map((s) => s.id));
      for (const s of snapshot.sections) {
        if (!draftIds.has(s.id)) {
          await api(`/api/admin/homepage-sections/${s.id}`, { method: 'DELETE' });
        }
      }

      // Step 2 — Create any temp_ sections, mapping temp ids to real ids.
      const idRemap = new Map<string, string>();
      for (const s of draft.sections) {
        if (s.id.startsWith(TEMP_ID_PREFIX)) {
          const result = await api<{ section: { id: string } }>(
            '/api/admin/homepage-sections',
            {
              method: 'POST',
              body: JSON.stringify({
                title: s.title,
                description: s.description,
                iconName: s.iconName,
                iconColor: s.iconColor,
                published: s.published,
              }),
            }
          );
          idRemap.set(s.id, result.section.id);
        }
      }

      const realId = (id: string) => idRemap.get(id) ?? id;

      // Step 3 — Reorder all sections (cheap; idempotent).
      await api('/api/admin/homepage-sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ids: draft.sections.map((s) => realId(s.id)) }),
      });

      // Step 4 — For each section: update meta if changed; always sync
      // course list (cheap and ensures course order matches the draft).
      for (const s of draft.sections) {
        const id = realId(s.id);
        const snap = snapshot.sections.find((x) => x.id === s.id);
        const metaChanged =
          !snap ||
          snap.title !== s.title ||
          (snap.description ?? null) !== (s.description ?? null) ||
          snap.iconName !== s.iconName ||
          (snap.iconColor ?? null) !== (s.iconColor ?? null) ||
          snap.published !== s.published;
        // Skip meta PUT for newly-created sections — POST already set it.
        if (metaChanged && !s.id.startsWith(TEMP_ID_PREFIX)) {
          await api(`/api/admin/homepage-sections/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: s.title,
              description: s.description,
              iconName: s.iconName,
              iconColor: s.iconColor,
              published: s.published,
            }),
          });
        }
        await api(`/api/admin/homepage-sections/${id}/courses`, {
          method: 'PUT',
          body: JSON.stringify({ courseIds: s.courses.map((c) => c.id) }),
        });
      }

      // Step 5 — Snapshot now matches what's on the server.
      const newDraft: BoardState = {
        ...draft,
        sections: draft.sections.map((s) => ({ ...s, id: realId(s.id) })),
      };
      setSnapshot(cloneState(newDraft));
      setDraft(newDraft);
      // Refresh the server props for any side effects (e.g. course
      // detail pages that read homepageSectionId).
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    if (!confirm('Discard all unsaved changes?')) return;
    setDraft(cloneState(snapshot));
    setEditingSectionId(null);
    setError(null);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Courses & Homepage Sections
              {isDirty && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  Unsaved changes
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Drag courses between sections, edit section details. Nothing hits the public site
              until you click <span className="font-semibold">Save</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              New Section
            </button>
            <Link
              href="/admin/courses/new"
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              New Course
            </Link>
            {isDirty && (
              <button
                type="button"
                onClick={discardChanges}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={saveAll}
              disabled={!isDirty || saving}
              className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SaveIcon className="w-4 h-4" />
              )}
              Save Changes
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

      {/* Both panels stay mounted so editor state and the in-page
          preview both retain their content across tab switches. */}
      <div className={tab === 'preview' ? 'block' : 'hidden'}>
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-[#f5f5f7]">
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <span className="font-semibold">Preview</span>
            <span>Reflects your current draft (unsaved). Click Save above to publish.</span>
          </div>
          <div className="bg-background">
            <SectionsCatalogPreview
              sections={draft.sections}
              comingSoonCourses={previewComingSoon}
            />
          </div>
        </div>
      </div>

      <div className={tab === 'editor' ? 'block' : 'hidden'}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="space-y-4">
            {draft.sections.map((section) => (
              <SectionContainer
                key={section.id}
                section={section}
                isEditing={editingSectionId === section.id}
                onEdit={() =>
                  setEditingSectionId(editingSectionId === section.id ? null : section.id)
                }
                onPatch={(patch) => patchSection(section.id, patch)}
                onClose={() => setEditingSectionId(null)}
                onDelete={() => removeSection(section.id)}
                onTogglePublished={() => toggleSectionPublished(section.id)}
                onShowPreview={() => setTab('preview')}
              />
            ))}
            <UnassignedContainer courses={draft.unassigned} />
          </div>

          <DragOverlay>
            {activeCourse ? (
              <div className="bg-white border-2 border-maxxed-blue rounded-lg shadow-2xl px-3 py-2 max-w-md flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div className="w-12 h-8 rounded bg-gray-200 flex-shrink-0 overflow-hidden relative">
                  {activeCourse.thumbnail ? (
                    <Image src={activeCourse.thumbnail} alt="" fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <p className="font-medium text-sm text-gray-900 truncate">{activeCourse.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function getCoursesInDraft(d: BoardState, containerId: string): CourseLite[] {
  if (containerId === UNASSIGNED_ID) return d.unassigned;
  return d.sections.find((s) => s.id === containerId)?.courses ?? [];
}

// ── Section container ─────────────────────────────────────────
function SectionContainer({
  section,
  isEditing,
  onEdit,
  onPatch,
  onClose,
  onDelete,
  onTogglePublished,
  onShowPreview,
}: {
  section: SectionWithCourses;
  isEditing: boolean;
  onEdit: () => void;
  onPatch: (patch: Partial<SectionWithCourses>) => void;
  onClose: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onShowPreview: () => void;
}) {
  const Icon = getSectionIcon(section.iconName);
  const courseIds = section.courses.map((c) => c.id);

  return (
    <div
      className={`bg-white rounded-xl border ${section.published ? 'border-gray-200' : 'border-gray-300 border-dashed'} overflow-hidden`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${section.iconColor || 'text-[#0000CC]'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate flex items-center gap-2">
            {section.title}
            {!section.published && (
              <span className="text-[10px] uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold">
                Hidden
              </span>
            )}
            <span className="text-xs font-normal text-gray-400">
              · {section.courses.length} {section.courses.length === 1 ? 'course' : 'courses'}
            </span>
          </h3>
          {section.description && (
            <p className="text-sm text-gray-500 truncate">{section.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePublished}
            className="p-2 text-gray-500 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg"
            title={section.published ? 'Hide section' : 'Show section'}
          >
            {section.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={`p-2 rounded-lg ${
              isEditing
                ? 'text-maxxed-blue bg-blue-50'
                : 'text-gray-500 hover:text-maxxed-blue hover:bg-gray-100'
            }`}
            title="Edit section details"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <SectionMetaForm
          section={section}
          onPatch={onPatch}
          onClose={onClose}
          onShowPreview={onShowPreview}
        />
      )}

      <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
        <div className="px-4 py-3 space-y-2 min-h-[60px]" data-droppable-id={section.id}>
          {section.courses.length === 0 && (
            <div className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg">
              Drop courses here
            </div>
          )}
          {section.courses.map((course) => (
            <SortableCourseRow key={course.id} course={course} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Unassigned virtual container ──
function UnassignedContainer({ courses }: { courses: CourseLite[] }) {
  const courseIds = courses.map((c) => c.id);

  return (
    <div className="bg-amber-50/30 rounded-xl border-2 border-dashed border-amber-200">
      <div className="px-4 py-3 border-b border-amber-200/60">
        <h3 className="font-bold text-amber-900 flex items-center gap-2">
          <ImageOff className="w-4 h-4" />
          Unassigned
          <span className="text-xs font-normal text-amber-700">
            · {courses.length} not on public pages
          </span>
        </h3>
        <p className="text-xs text-amber-700/80 mt-0.5">
          Courses without a section don&apos;t appear on /, /courses, or /dashboard. Drag into a
          section above to publish them there.
        </p>
      </div>
      <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
        <div className="px-4 py-3 space-y-2 min-h-[60px]" data-droppable-id={UNASSIGNED_ID}>
          {courses.length === 0 ? (
            <div className="text-sm text-amber-700/60 italic py-4 text-center">
              All courses are assigned to a section.
            </div>
          ) : (
            courses.map((course) => <SortableCourseRow key={course.id} course={course} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCourseRow({ course }: { course: CourseLite }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg group"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:text-maxxed-blue cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="w-12 h-8 rounded bg-gray-200 flex-shrink-0 overflow-hidden relative">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt="" fill sizes="48px" className="object-cover" />
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 truncate">{course.title}</p>
          {!course.published && (
            <span className="text-[10px] uppercase tracking-wider bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
              Draft
            </span>
          )}
          {course.comingSoon && (
            <span className="text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {course.externalUrl
            ? 'Apply Only · external'
            : course.price
              ? formatPrice(course.price)
              : 'Free'}
          {' · '}
          {course.totalLessons} {course.totalLessons === 1 ? 'lesson' : 'lessons'}
          {' · '}
          {course.enrollmentCount} {course.enrollmentCount === 1 ? 'enrollment' : 'enrollments'}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/admin/courses/${course.id}`}
          className="p-1.5 text-gray-500 hover:text-maxxed-blue hover:bg-white rounded"
          title="Edit course"
        >
          <Edit className="w-4 h-4" />
        </Link>
        <Link
          href={course.externalUrl || `/courses/${course.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-white rounded"
          title="View course"
        >
          {course.externalUrl ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Link>
        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
      </div>
    </div>
  );
}

// ── Inline section meta form (draft-only — no API calls) ──
function SectionMetaForm({
  section,
  onPatch,
  onClose,
  onShowPreview,
}: {
  section: SectionWithCourses;
  onPatch: (patch: Partial<SectionWithCourses>) => void;
  onClose: () => void;
  onShowPreview: () => void;
}) {
  return (
    <div className="px-4 py-4 bg-blue-50/30 border-b border-blue-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={section.description ?? ''}
            onChange={(e) =>
              onPatch({ description: e.target.value === '' ? null : e.target.value })
            }
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
            const selected = name === section.iconName;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onPatch({ iconName: name })}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-colors ${
                  selected
                    ? 'border-maxxed-blue bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                title={name}
              >
                <I className={`w-4 h-4 ${selected ? section.iconColor || 'text-[#0000CC]' : 'text-gray-600'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((c) => {
            const selected = c.value === (section.iconColor || COLOR_PRESETS[0].value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onPatch({ iconColor: c.value })}
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

      <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
        <p className="text-xs text-gray-500 italic">
          Edits stay local until you click <span className="font-semibold">Save Changes</span> at the top.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-maxxed-blue/30 text-maxxed-blue rounded-md text-xs font-semibold hover:bg-maxxed-blue/10"
          >
            <Eye className="w-3.5 h-3.5" />
            See Preview
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
