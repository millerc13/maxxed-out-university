'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';

interface ProductMappingFormProps {
  courses: { id: string; title: string }[];
}

export function ProductMappingForm({ courses }: ProductMappingFormProps) {
  const [ghlProductId, setGhlProductId] = useState('');
  const [ghlProductName, setGhlProductName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [grantAll, setGrantAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ghlProductId) {
      setError('GHL Product ID is required');
      return;
    }

    if (!grantAll && !courseId) {
      setError('Please select a course or enable "Grant All Courses"');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ghlProductId,
          ghlProductName,
          courseId: grantAll ? courses[0]?.id : courseId, // Need a courseId for DB
          grantAll,
        }),
      });

      if (response.ok) {
        setGhlProductId('');
        setGhlProductName('');
        setCourseId('');
        setGrantAll(false);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create mapping');
      }
    } catch (err) {
      setError('Failed to create mapping');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GHL Product ID *
          </label>
          <Input
            value={ghlProductId}
            onChange={(e) => setGhlProductId(e.target.value)}
            placeholder="e.g., prod_abc123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name (for reference)
          </label>
          <Input
            value={ghlProductName}
            onChange={(e) => setGhlProductName(e.target.value)}
            placeholder="e.g., Real Estate Bundle"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="grantAll"
          checked={grantAll}
          onChange={(e) => setGrantAll(e.target.checked)}
          className="w-4 h-4 text-maxxed-blue rounded"
        />
        <label htmlFor="grantAll" className="text-sm text-gray-700 cursor-pointer">
          Grant access to ALL courses (bundle product)
        </label>
      </div>

      {!grantAll && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course to Grant Access
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
          >
            <option value="">Select a course...</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Add Mapping
          </>
        )}
      </button>
    </form>
  );
}
