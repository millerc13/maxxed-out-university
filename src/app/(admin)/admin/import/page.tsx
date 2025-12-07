'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Users,
  FileQuestion,
} from 'lucide-react';

type ImportType = 'courses' | 'users' | 'quizzes';

const importTypes: { type: ImportType; label: string; icon: any; description: string }[] = [
  {
    type: 'courses',
    label: 'Courses & Lessons',
    icon: BookOpen,
    description: 'Import courses with modules and lessons',
  },
  {
    type: 'users',
    label: 'Users & Enrollments',
    icon: Users,
    description: 'Bulk import users and enroll them in courses',
  },
  {
    type: 'quizzes',
    label: 'Quiz Questions',
    icon: FileQuestion,
    description: 'Import quiz questions with answers',
  },
];

export default function AdminImportPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ImportType>('courses');
  const [csvContent, setCsvContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(
    null
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setResult({ success: false, message: 'Please upload or paste CSV content' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/import/${selectedType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Import successful!',
          details: data,
        });
        setCsvContent('');
        router.refresh();
      } else {
        setResult({
          success: false,
          message: data.error || 'Import failed',
          details: data.details,
        });
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to process import' });
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateContent = (type: ImportType): string => {
    switch (type) {
      case 'courses':
        return `course_title,course_slug,course_description,module_title,lesson_title,lesson_slug,lesson_description,video_url,duration_minutes,is_free
Real Estate Fundamentals,real-estate-101,Learn the basics,Module 1: Getting Started,Introduction to Real Estate,intro-to-real-estate,Welcome to the course,,5,true
Real Estate Fundamentals,real-estate-101,,Module 1: Getting Started,Market Analysis,market-analysis,Understanding markets,,10,false
Real Estate Fundamentals,real-estate-101,,Module 2: Advanced,Deal Structuring,deal-structuring,How to structure deals,,15,false`;
      case 'users':
        return `email,name,password,role,enroll_courses
john@example.com,John Doe,temppass123,STUDENT,real-estate-101;wholesaling-101
jane@example.com,Jane Smith,temppass456,STUDENT,real-estate-101
admin@example.com,Admin User,adminpass,ADMIN,`;
      case 'quizzes':
        return `quiz_title,quiz_description,passing_score,question_text,question_type,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,explanation
Module 1 Quiz,Test your knowledge,70,What is the primary benefit of real estate?,MULTIPLE_CHOICE,Cash flow,Looks cool,It's trendy,Everyone does it,Real estate provides passive income
Module 1 Quiz,,,What does ROI stand for?,MULTIPLE_CHOICE,Return on Investment,Rate of Interest,Real Ownership Index,Revenue of Income,ROI measures profitability
Module 1 Quiz,,,Is leverage used in real estate?,TRUE_FALSE,True,False,,,Leverage allows you to control assets with less capital`;
      default:
        return '';
    }
  };

  const downloadTemplate = () => {
    const content = getTemplateContent(selectedType);
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CSV Import</h1>
        <p className="text-gray-600 mt-1">
          Bulk import data using CSV files
        </p>
      </div>

      {/* Import Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {importTypes.map((item) => (
          <Card
            key={item.type}
            className={`cursor-pointer transition-all ${
              selectedType === item.type
                ? 'ring-2 ring-maxxed-blue bg-blue-50'
                : 'hover:shadow-md'
            }`}
            onClick={() => {
              setSelectedType(item.type);
              setCsvContent('');
              setResult(null);
            }}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  selectedType === item.type ? 'bg-maxxed-blue text-white' : 'bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CSV Input Area */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              Import {importTypes.find((t) => t.type === selectedType)?.label}
            </h3>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-maxxed-blue hover:underline"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                Drop a CSV file here or <span className="text-maxxed-blue">browse</span>
              </p>
            </label>
          </div>

          {/* Or paste CSV */}
          <div className="text-center text-sm text-gray-500">- or paste CSV content below -</div>

          <textarea
            value={csvContent}
            onChange={(e) => {
              setCsvContent(e.target.value);
              setResult(null);
            }}
            placeholder="Paste your CSV content here..."
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />

          {/* Result Message */}
          {result && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </p>
                {result.details && (
                  <pre className="text-xs mt-2 overflow-auto max-h-32">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={isLoading || !csvContent.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-maxxed-blue text-white rounded-lg font-medium hover:bg-maxxed-blue-dark disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Data
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* Format Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">CSV Format Instructions</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {selectedType === 'courses' && (
              <>
                <p>• First row must be headers</p>
                <p>• Course info is repeated for each lesson row</p>
                <p>• Leave module_title blank to add to previous module</p>
                <p>• duration_minutes should be a number</p>
                <p>• is_free should be true or false</p>
              </>
            )}
            {selectedType === 'users' && (
              <>
                <p>• First row must be headers</p>
                <p>• Email is required and must be unique</p>
                <p>• Role must be STUDENT, INSTRUCTOR, or ADMIN</p>
                <p>• Separate multiple course slugs with semicolons</p>
                <p>• Users will need to change password on first login</p>
              </>
            )}
            {selectedType === 'quizzes' && (
              <>
                <p>• First row must be headers</p>
                <p>• Quiz info is repeated for each question row</p>
                <p>• question_type: MULTIPLE_CHOICE, MULTIPLE_SELECT, or TRUE_FALSE</p>
                <p>• For TRUE_FALSE, only correct_answer and wrong_answer_1 are used</p>
                <p>• Leave wrong answers blank if not needed</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
