'use client';

import { useMemo, useState } from 'react';
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
  RefreshCw,
  GripVertical,
  Edit,
  ExternalLink,
  ImageOff,
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

// Virtual container for courses with no homepageSectionId. Shown at the
// bottom so admins can see what's currently NOT on the public site, and
// drag courses into a section to publish them there.
const UNASSIGNED_ID = '__unassigned__';

interface CourseLite {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
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

export function CourseSectionsBoard({
  initialSections,
  initialUnassigned,
}: {
  initialSections: SectionWithCourses[];
  initialUnassigned: CourseLite[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionWithCourses[]>(initialSections);
  const [unassigned, setUnassigned] = useState<CourseLite[]>(initialUnassigned);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CourseLite | null>(null);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [previewKey, setPreviewKey] = useState(0);

  // Container = a section OR the virtual "Unassigned" pile.
  const containers = useMemo(
    () => [
      ...sections.map((s) => ({ id: s.id, courses: s.courses })),
      { id: UNASSIGNED_ID, courses: unassigned },
    ],
    [sections, unassigned]
  );

  function findContainerOfCourse(courseId: string): string | null {
    for (const c of containers) {
      if (c.courses.some((course) => course.id === courseId)) return c.id;
    }
    return null;
  }

  function getCoursesIn(containerId: string): CourseLite[] {
    if (containerId === UNASSIGNED_ID) return unassigned;
    return sections.find((s) => s.id === containerId)?.courses ?? [];
  }

  function setCoursesIn(containerId: string, courses: CourseLite[]) {
    if (containerId === UNASSIGNED_ID) {
      setUnassigned(courses);
    } else {
      setSections((prev) =>
        prev.map((s) => (s.id === containerId ? { ...s, courses } : s))
      );
    }
  }

  // ── API helpers ────────────────────────────────────────────
  async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
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

  async function persistContainer(containerId: string) {
    if (containerId === UNASSIGNED_ID) {
      // No section to PUT — courses are unassigned because their
      // homepageSectionId got nulled by some other section's PUT.
      return;
    }
    const courses = getCoursesIn(containerId);
    await api(`/api/admin/homepage-sections/${containerId}/courses`, {
      method: 'PUT',
      body: JSON.stringify({ courseIds: courses.map((c) => c.id) }),
    });
  }

  // ── Section CRUD ───────────────────────────────────────────
  function createSection() {
    withBusy('create', async () => {
      await api('/api/admin/homepage-sections', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New section',
          iconName: 'BookOpen',
          iconColor: 'text-[#0000CC]',
        }),
      });
      router.refresh();
    });
  }

  function deleteSection(id: string) {
    if (!confirm('Delete this section? Courses in it will move to "Unassigned" (not deleted).')) return;
    withBusy(`delete:${id}`, async () => {
      await api(`/api/admin/homepage-sections/${id}`, { method: 'DELETE' });
      router.refresh();
    });
  }

  function updateSection(id: string, patch: Partial<SectionWithCourses>) {
    withBusy(`update:${id}`, async () => {
      await api(`/api/admin/homepage-sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      // Optimistic local update so the form closes without a full refresh
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      setEditingSectionId(null);
      router.refresh();
    });
  }

  // ── Drag & drop ────────────────────────────────────────────
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

  // While dragging across sections, optimistically move the course in
  // local state so the user gets instant visual feedback.
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceContainer = findContainerOfCourse(activeId);
    // The over.id can be either a course ID or a container ID (when
    // hovering on an empty section's drop zone).
    let destContainer = findContainerOfCourse(overId);
    if (!destContainer && containers.some((c) => c.id === overId)) destContainer = overId;
    if (!sourceContainer || !destContainer || sourceContainer === destContainer) return;

    const sourceCourses = getCoursesIn(sourceContainer);
    const destCourses = getCoursesIn(destContainer);
    const movingIdx = sourceCourses.findIndex((c) => c.id === activeId);
    if (movingIdx === -1) return;
    const moving = sourceCourses[movingIdx];

    // Where in dest? If hovering over a specific course, insert before it;
    // otherwise append.
    const overIdx = destCourses.findIndex((c) => c.id === overId);
    const newDestCourses = [...destCourses];
    if (overIdx === -1) newDestCourses.push(moving);
    else newDestCourses.splice(overIdx, 0, moving);

    const newSourceCourses = sourceCourses.filter((c) => c.id !== activeId);
    setCoursesIn(sourceContainer, newSourceCourses);
    setCoursesIn(destContainer, newDestCourses);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCourse(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceContainer = findContainerOfCourse(activeId);
    let destContainer = findContainerOfCourse(overId);
    if (!destContainer && containers.some((c) => c.id === overId)) destContainer = overId;
    if (!sourceContainer || !destContainer) return;

    // Within-container reorder: arrayMove and persist that one container.
    if (sourceContainer === destContainer && activeId !== overId) {
      const courses = getCoursesIn(sourceContainer);
      const oldIdx = courses.findIndex((c) => c.id === activeId);
      const newIdx = courses.findIndex((c) => c.id === overId);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(courses, oldIdx, newIdx);
      setCoursesIn(sourceContainer, reordered);
      withBusy(`save:${sourceContainer}`, async () => {
        await persistContainer(sourceContainer);
      });
      return;
    }

    // Cross-container drop — onDragOver already updated state.
    // Persist both containers (skips Unassigned automatically).
    if (sourceContainer !== destContainer) {
      withBusy(`save:cross`, async () => {
        await Promise.all([persistContainer(destContainer!), persistContainer(sourceContainer)]);
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Header + Tabs */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6 px-4 sm:px-6 pt-5 pb-0 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Courses & Homepage Sections</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Drag courses between sections to change how they appear on{' '}
              <span className="font-mono">/</span>, <span className="font-mono">/courses</span>, and{' '}
              <span className="font-mono">/dashboard</span>. Click a course to edit its details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createSection}
              disabled={busy === 'create'}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'create' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New Section
            </button>
            <Link
              href="/admin/courses/new"
              className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark"
            >
              <Plus className="w-4 h-4" />
              New Course
            </Link>
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

      {tab === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Live page at <span className="font-mono">/?previewAs=customer</span>. Click reload after editing.
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

      {tab === 'editor' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="space-y-4">
            {sections.map((section) => (
              <SectionContainer
                key={section.id}
                section={section}
                isEditing={editingSectionId === section.id}
                busy={busy}
                onEdit={() =>
                  setEditingSectionId(editingSectionId === section.id ? null : section.id)
                }
                onSaveMeta={(patch) => updateSection(section.id, patch)}
                onCancelEdit={() => setEditingSectionId(null)}
                onDelete={() => deleteSection(section.id)}
                onTogglePublished={() =>
                  updateSection(section.id, { published: !section.published })
                }
              />
            ))}

            {/* Unassigned virtual container */}
            <UnassignedContainer courses={unassigned} />
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
      )}
    </div>
  );
}

// ── Section container (sortable list of courses inside) ──
function SectionContainer({
  section,
  isEditing,
  busy,
  onEdit,
  onSaveMeta,
  onCancelEdit,
  onDelete,
  onTogglePublished,
}: {
  section: SectionWithCourses;
  isEditing: boolean;
  busy: string | null;
  onEdit: () => void;
  onSaveMeta: (patch: Partial<SectionWithCourses>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
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

      {isEditing && (
        <SectionMetaForm section={section} onSave={onSaveMeta} onCancel={onCancelEdit} />
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

// ── Single course row (sortable) ──
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

// ── Inline section meta form (title, description, icon, color) ──
function SectionMetaForm({
  section,
  onSave,
  onCancel,
}: {
  section: SectionWithCourses;
  onSave: (patch: Partial<SectionWithCourses>) => void;
  onCancel: () => void;
}) {
  // Local state shadows section meta for snappy text input (avoids
  // re-keystroke jitter from waiting on server). Saves fire on blur for
  // text fields and immediately for icon/color picks. No explicit Save
  // button — the editor view always reflects the latest persisted state.
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === section.title) {
      setTitle(section.title);
      return;
    }
    onSave({ title: trimmed });
  }

  function commitDescription() {
    const trimmed = description.trim();
    const current = section.description ?? '';
    if (trimmed === current) return;
    onSave({ description: trimmed || null });
  }

  return (
    <div className="px-4 py-4 bg-blue-50/30 border-b border-blue-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setTitle(section.title);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDescription(section.description ?? '');
                (e.target as HTMLInputElement).blur();
              }
            }}
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
                onClick={() => {
                  if (name !== section.iconName) onSave({ iconName: name });
                }}
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
                onClick={() => {
                  if (c.value !== section.iconColor) onSave({ iconColor: c.value });
                }}
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

      <div className="flex justify-between items-center pt-1">
        <p className="text-xs text-gray-500 italic">Changes save automatically.</p>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
