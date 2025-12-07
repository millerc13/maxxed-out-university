'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  text: string;
  explanation: string | null;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE';
  points: number;
  order: number;
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

interface QuizQuestionBuilderProps {
  quiz: Quiz;
}

export function QuizQuestionBuilder({ quiz }: QuizQuestionBuilderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(quiz.questions.map((q) => q.id))
  );
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{
    text: string;
    type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE';
    explanation: string;
    answers: { text: string; isCorrect: boolean }[];
  }>({
    text: '',
    type: 'MULTIPLE_CHOICE',
    explanation: '',
    answers: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.text.trim()) return;

    // Filter out empty answers
    const validAnswers = newQuestion.answers.filter((a) => a.text.trim());
    if (validAnswers.length < 2) {
      alert('Please add at least 2 answers');
      return;
    }

    if (!validAnswers.some((a) => a.isCorrect)) {
      alert('Please mark at least one answer as correct');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/quizzes/${quiz.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newQuestion.text,
          type: newQuestion.type,
          explanation: newQuestion.explanation || null,
          answers: validAnswers,
        }),
      });

      if (response.ok) {
        setNewQuestion({
          text: '',
          type: 'MULTIPLE_CHOICE',
          explanation: '',
          answers: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
        });
        setShowNewQuestion(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to create question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    setIsLoading(true);
    try {
      await fetch(`/api/admin/quizzes/${quiz.id}/questions/${questionId}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to delete question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNewAnswer = (index: number, field: string, value: any) => {
    setNewQuestion((prev) => ({
      ...prev,
      answers: prev.answers.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  const setCorrectAnswer = (index: number) => {
    if (newQuestion.type === 'MULTIPLE_SELECT') {
      // Toggle for multiple select
      updateNewAnswer(index, 'isCorrect', !newQuestion.answers[index].isCorrect);
    } else {
      // Single correct for multiple choice
      setNewQuestion((prev) => ({
        ...prev,
        answers: prev.answers.map((a, i) => ({ ...a, isCorrect: i === index })),
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Questions</h2>
        <button
          onClick={() => setShowNewQuestion(true)}
          className="flex items-center gap-2 px-3 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium hover:bg-maxxed-blue-dark"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* New Question Form */}
      {showNewQuestion && (
        <Card className="border-maxxed-blue border-2">
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <textarea
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                placeholder="Enter your question..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Type
                </label>
                <select
                  value={newQuestion.type}
                  onChange={(e) =>
                    setNewQuestion({
                      ...newQuestion,
                      type: e.target.value as any,
                      answers:
                        e.target.value === 'TRUE_FALSE'
                          ? [
                              { text: 'True', isCorrect: true },
                              { text: 'False', isCorrect: false },
                            ]
                          : newQuestion.answers,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="MULTIPLE_SELECT">Multiple Select</option>
                  <option value="TRUE_FALSE">True/False</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explanation (shown after answer)
                </label>
                <Input
                  value={newQuestion.explanation}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, explanation: e.target.value })
                  }
                  placeholder="Optional explanation..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answers (click checkmark to mark correct)
              </label>
              <div className="space-y-2">
                {newQuestion.answers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(index)}
                      className={`p-2 rounded-lg transition-colors ${
                        answer.isCorrect
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <Input
                      value={answer.text}
                      onChange={(e) => updateNewAnswer(index, 'text', e.target.value)}
                      placeholder={`Answer ${index + 1}`}
                      className="flex-1"
                      disabled={newQuestion.type === 'TRUE_FALSE'}
                    />
                  </div>
                ))}
              </div>
              {newQuestion.type !== 'TRUE_FALSE' && newQuestion.answers.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    setNewQuestion({
                      ...newQuestion,
                      answers: [...newQuestion.answers, { text: '', isCorrect: false }],
                    })
                  }
                  className="mt-2 text-sm text-maxxed-blue hover:underline"
                >
                  + Add another answer
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowNewQuestion(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuestion}
                disabled={isLoading || !newQuestion.text.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Question
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Questions */}
      {quiz.questions.length === 0 && !showNewQuestion ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No questions yet</p>
            <button
              onClick={() => setShowNewQuestion(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Question
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quiz.questions.map((question, index) => (
            <Card key={question.id}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleQuestion(question.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                {expandedQuestions.has(question.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm text-gray-400 w-6">Q{index + 1}</span>
                <span className="flex-1 font-medium text-gray-900 truncate">
                  {question.text}
                </span>
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                  {question.type.replace('_', ' ')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(question.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedQuestions.has(question.id) && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  <div className="pt-3 space-y-2">
                    {question.answers.map((answer, aIndex) => (
                      <div
                        key={answer.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          answer.isCorrect ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        {answer.isCorrect ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300" />
                        )}
                        <span className={answer.isCorrect ? 'text-green-700' : ''}>
                          {answer.text}
                        </span>
                      </div>
                    ))}
                    {question.explanation && (
                      <p className="text-sm text-gray-500 mt-2 pt-2 border-t">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
