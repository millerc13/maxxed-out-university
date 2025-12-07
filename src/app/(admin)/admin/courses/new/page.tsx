import { CourseForm } from '@/components/admin/CourseForm';

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600 mt-1">
          Fill in the details to create a new course
        </p>
      </div>

      <CourseForm />
    </div>
  );
}
