'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    passingScore: '70',
    timeLimit: '',
    published: false,
    courseId: courseId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          passingScore: parseInt(formData.passingScore) || 70,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
          courseId: formData.courseId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create quiz');
      }

      const quiz = await response.json();
      router.push(`/admin/quizzes/${quiz.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/quizzes"
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Quiz</h1>
          <p className="text-gray-600">Set up quiz details, then add questions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Module 1 Knowledge Check"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the quiz..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                  placeholder="No limit"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 text-maxxed-blue rounded"
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Link
            href="/admin/quizzes"
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading || !formData.title}
            className="flex items-center gap-2 px-6 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create & Add Questions
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
