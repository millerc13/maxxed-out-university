'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Play, Eye, EyeOff, Unlock, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  content: string | null;
  isFree: boolean;
  isPublished: boolean;
  order: number;
  moduleId: string;
}

export default function LessonEditPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    async function fetchLesson() {
      try {
        // We need moduleId — fetch via lesson directly using a search approach
        const res = await fetch(`/api/admin/lessons/${params.lessonId}`);
        if (!res.ok) throw new Error('Failed to load lesson');
        const data: Lesson = await res.json();
        setLesson(data);
        setTitle(data.title);
        setVideoUrl(data.videoUrl ?? '');
        setVideoDuration(data.videoDuration ? String(data.videoDuration) : '');
        setDescription(data.description ?? '');
        setContent(data.content ?? '');
        setIsFree(data.isFree);
        setIsPublished(data.isPublished);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLesson();
  }, [params.lessonId]);

  async function handleSave() {
    if (!lesson) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(
        `/api/admin/courses/${params.id}/modules/${lesson.moduleId}/lessons/${lesson.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            videoUrl: videoUrl.trim() || null,
            videoDuration: videoDuration ? parseInt(videoDuration, 10) : null,
            description: description.trim() || null,
            content: content.trim() || null,
            isFree,
            isPublished,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !lesson) {
    return (
      <div className="py-10 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href={`/admin/courses/${params.id}`} className="text-maxxed-blue hover:underline text-sm">
          ← Back to course
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/courses/${params.id}`}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{lesson?.title}</h1>
          <p className="text-sm text-gray-500">Edit lesson</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Video URL — most prominent since that's what user needs */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-maxxed-blue" />
            <h2 className="font-semibold text-gray-900">Video</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL
            </label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://iframe.mediadelivery.net/embed/..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Bunny.net, Cloudflare Stream, Vimeo, or any embed URL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <Input
              type="number"
              value={videoDuration}
              onChange={(e) => setVideoDuration(e.target.value)}
              placeholder="e.g. 3600 for 1 hour"
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Lesson Info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this lesson..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (below video)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Additional notes, resources, or text content for this lesson..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-transparent resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Visibility</h2>

          <button
            onClick={() => setIsPublished((v) => !v)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg border-2 text-left transition-colors ${
              isPublished
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {isPublished ? (
              <Eye className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400 shrink-0" />
            )}
            <div>
              <p className={`font-medium text-sm ${isPublished ? 'text-green-700' : 'text-gray-600'}`}>
                {isPublished ? 'Published' : 'Draft'}
              </p>
              <p className="text-xs text-gray-500">
                {isPublished ? 'Visible to enrolled students' : 'Hidden from students'}
              </p>
            </div>
          </button>

          <button
            onClick={() => setIsFree((v) => !v)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg border-2 text-left transition-colors ${
              isFree
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {isFree ? (
              <Unlock className="w-5 h-5 text-blue-600 shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-gray-400 shrink-0" />
            )}
            <div>
              <p className={`font-medium text-sm ${isFree ? 'text-blue-700' : 'text-gray-600'}`}>
                {isFree ? 'Free Preview' : 'Enrolled Only'}
              </p>
              <p className="text-xs text-gray-500">
                {isFree ? 'Anyone can view this lesson for free' : 'Requires enrollment'}
              </p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Save button at bottom too */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
