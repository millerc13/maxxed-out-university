'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Save,
  X,
  Play,
  Clock,
  Eye,
  Loader2,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  isFree: boolean;
  isPublished: boolean;
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  modules: Module[];
}

interface ModuleManagerProps {
  course: Course;
}

export function ModuleManager({ course }: ModuleManagerProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [showNewModule, setShowNewModule] = useState(false);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newModuleTitle }),
      });

      if (response.ok) {
        setNewModuleTitle('');
        setShowNewModule(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to create module:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/courses/${course.id}/modules/${moduleId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete module:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLesson = async (moduleId: string) => {
    const title = prompt('Lesson title:');
    if (!title?.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/courses/${course.id}/modules/${moduleId}/lessons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }
      );

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to create lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/courses/${course.id}/modules/${moduleId}/lessons/${lessonId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Modules & Lessons</h2>
        <button
          onClick={() => setShowNewModule(true)}
          className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Module
        </button>
      </div>

      {/* New Module Form */}
      {showNewModule && (
        <Card className="border-maxxed-blue border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="Module title..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateModule();
                  if (e.key === 'Escape') setShowNewModule(false);
                }}
              />
              <button
                onClick={handleCreateModule}
                disabled={isLoading || !newModuleTitle.trim()}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setShowNewModule(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module List */}
      {course.modules.length === 0 && !showNewModule ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No modules yet</p>
            <button
              onClick={() => setShowNewModule(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Module
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {course.modules.map((module, moduleIndex) => (
            <Card key={module.id} className="overflow-hidden">
              {/* Module Header */}
              <div
                className="flex items-center gap-3 p-4 bg-gray-50 border-b cursor-pointer"
                onClick={() => toggleModule(module.id)}
              >
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                {expandedModules.has(module.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    Module {moduleIndex + 1}: {module.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {module.lessons.length} lessons
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleCreateLesson(module.id)}
                    className="p-2 text-maxxed-blue hover:bg-blue-50 rounded-lg"
                    title="Add Lesson"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteModule(module.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lessons */}
              {expandedModules.has(module.id) && (
                <div className="divide-y">
                  {module.lessons.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No lessons yet.{' '}
                      <button
                        onClick={() => handleCreateLesson(module.id)}
                        className="text-maxxed-blue hover:underline"
                      >
                        Add one
                      </button>
                    </div>
                  ) : (
                    module.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50"
                      >
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                        <span className="text-sm text-gray-400 w-8">
                          {moduleIndex + 1}.{lessonIndex + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {lesson.title}
                            </span>
                            {lesson.isFree && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Free
                              </span>
                            )}
                            {!lesson.isPublished && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {lesson.videoUrl && (
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                Video
                              </span>
                            )}
                            {lesson.videoDuration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(lesson.videoDuration / 60)}m
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                            className="p-2 text-gray-400 hover:text-maxxed-blue hover:bg-gray-100 rounded-lg"
                            title="Edit Lesson"
                          >
                            <Edit className="w-4 h-4" />
                          </a>
                          <a
                            href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded-lg"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteLesson(module.id, lesson.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
