'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Course {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  thumbnail: string | null;
  published: boolean;
  featured: boolean;
  price: number | null;
}

interface CourseFormProps {
  course?: Course;
}

export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: course?.title || '',
    slug: course?.slug || '',
    description: course?.description || '',
    shortDesc: course?.shortDesc || '',
    thumbnail: course?.thumbnail || '',
    published: course?.published || false,
    featured: course?.featured || false,
    price: course?.price ? String(course.price / 100) : '',
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug for new courses
      slug: course?.id ? prev.slug : generateSlug(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = course?.id
        ? `/api/admin/courses/${course.id}`
        : '/api/admin/courses';

      const response = await fetch(url, {
        method: course?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? Math.round(parseFloat(formData.price) * 100) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save course');
      }

      const savedCourse = await response.json();
      router.push(`/admin/courses/${savedCourse.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Real Estate Fundamentals"
                  required
                  className="mt-1"
                />
              </div>

              {/* Slug */}
              <div className="md:col-span-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center mt-1">
                  <span className="text-gray-500 text-sm mr-2">/courses/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="real-estate-fundamentals"
                    required
                  />
                </div>
              </div>

              {/* Short Description */}
              <div className="md:col-span-2">
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input
                  id="shortDesc"
                  value={formData.shortDesc}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortDesc: e.target.value }))
                  }
                  placeholder="A brief tagline for course cards"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Label htmlFor="description">Full Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detailed course description..."
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-transparent"
                />
              </div>

              {/* Thumbnail */}
              <div className="md:col-span-2">
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              {/* Price */}
              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <div className="flex items-center mt-1">
                  <span className="text-gray-500 mr-2">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="0.00 (free)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty if price is handled by GoHighLevel
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, published: e.target.checked }))
                    }
                    className="w-4 h-4 text-maxxed-blue rounded"
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Published (visible to students)
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, featured: e.target.checked }))
                    }
                    className="w-4 h-4 text-maxxed-blue rounded"
                  />
                  <Label htmlFor="featured" className="cursor-pointer">
                    Featured (highlighted on homepage)
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/courses"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {course?.id ? 'Save Changes' : 'Create Course'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
