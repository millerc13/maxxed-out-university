'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Answer {
  id: string;
  text: string;
  order: number;
}

interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE';
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimit: number | null;
  questions: Question[];
}

interface QuizPageProps {
  params: Promise<{ slug: string; quizId: string }>;
}

export default function QuizPage({ params }: QuizPageProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [courseSlug, setCourseSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: Record<string, string[]>;
  } | null>(null);

  // Load quiz data
  useEffect(() => {
    async function loadQuiz() {
      const { slug, quizId } = await params;
      setCourseSlug(slug);

      try {
        const res = await fetch(`/api/quiz/${quizId}`);
        if (!res.ok) {
          throw new Error('Failed to load quiz');
        }
        const data = await res.json();
        setQuiz(data);
      } catch (err) {
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [params]);

  // Timer
  useEffect(() => {
    if (!started || !quiz?.timeLimit || timeLeft === null || result) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, result]);

  const startQuiz = () => {
    setStarted(true);
    if (quiz?.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  };

  const selectAnswer = (questionId: string, answerId: string, isMultiSelect: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMultiSelect) {
        // Toggle for multi-select
        if (current.includes(answerId)) {
          return { ...prev, [questionId]: current.filter((a) => a !== answerId) };
        } else {
          return { ...prev, [questionId]: [...current, answerId] };
        }
      } else {
        // Replace for single select
        return { ...prev, [questionId]: [answerId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-maxxed-blue" />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !quiz) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="max-w-3xl mx-auto px-5 py-12">
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                <p className="text-gray-600 mb-6">{error || 'Quiz not found'}</p>
                <Link
                  href={`/courses/${courseSlug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Course
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Results screen
  if (result) {
    const question = quiz.questions[currentQuestion];
    const userAnswer = answers[question?.id] || [];
    const correctAnswer = result.correctAnswers[question?.id] || [];

    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="max-w-3xl mx-auto px-5 py-12">
            {/* Results Header */}
            <Card className="mb-6">
              <CardContent className="p-8 text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  result.passed ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {result.passed ? (
                    <Trophy className="w-10 h-10 text-green-600" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-orange-600" />
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                </h1>
                <p className="text-xl text-gray-600 mb-4">
                  You scored <span className="font-bold">{result.score}%</span>
                </p>
                <p className={`font-medium ${result.passed ? 'text-green-600' : 'text-orange-600'}`}>
                  {result.passed
                    ? `You passed! (${quiz.passingScore}% required)`
                    : `${quiz.passingScore}% required to pass`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Review Questions */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Answers</h2>
            <div className="space-y-4">
              {quiz.questions.map((q, idx) => {
                const userAns = answers[q.id] || [];
                const correctAns = result.correctAnswers[q.id] || [];
                const isCorrect = JSON.stringify(userAns.sort()) === JSON.stringify(correctAns.sort());

                return (
                  <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <span className="text-sm text-gray-500">Question {idx + 1}</span>
                          <p className="font-medium text-gray-900">{q.text}</p>
                        </div>
                      </div>
                      <div className="ml-8 space-y-2">
                        {q.answers.map((a) => {
                          const wasSelected = userAns.includes(a.id);
                          const isCorrectAnswer = correctAns.includes(a.id);

                          let bgClass = 'bg-gray-50';
                          if (isCorrectAnswer) bgClass = 'bg-green-50';
                          else if (wasSelected && !isCorrectAnswer) bgClass = 'bg-red-50';

                          return (
                            <div
                              key={a.id}
                              className={`p-3 rounded ${bgClass}`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrectAnswer && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                {wasSelected && !isCorrectAnswer && (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className={isCorrectAnswer ? 'text-green-700 font-medium' : wasSelected ? 'text-red-700' : ''}>
                                  {a.text}
                                </span>
                                {wasSelected && <span className="text-xs text-gray-500">(your answer)</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8">
              <Link
                href={`/courses/${courseSlug}`}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Course
              </Link>
              {!result.passed && (
                <button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setCurrentQuestion(0);
                    setStarted(false);
                    setTimeLeft(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-maxxed-blue text-white rounded font-medium hover:bg-maxxed-blue-dark"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Start screen
  if (!started) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="max-w-3xl mx-auto px-5 py-12">
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </Link>

            <Card>
              <CardContent className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-gray-600 mb-6">{quiz.description}</p>
                )}

                <div className="flex items-center justify-center gap-8 mb-8 text-sm text-gray-600">
                  <div>
                    <span className="font-bold text-2xl text-gray-900 block">{quiz.questions.length}</span>
                    Questions
                  </div>
                  <div>
                    <span className="font-bold text-2xl text-gray-900 block">{quiz.passingScore}%</span>
                    To Pass
                  </div>
                  {quiz.timeLimit && (
                    <div>
                      <span className="font-bold text-2xl text-gray-900 block">{quiz.timeLimit}</span>
                      Minutes
                    </div>
                  )}
                </div>

                <button
                  onClick={startQuiz}
                  className="px-8 py-3 bg-maxxed-blue text-white rounded-lg font-bold text-lg hover:bg-maxxed-blue-dark transition-colors"
                >
                  Start Quiz
                </button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Quiz in progress
  const question = quiz.questions[currentQuestion];
  const isMultiSelect = question.type === 'MULTIPLE_SELECT';
  const selectedAnswers = answers[question.id] || [];
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-5 py-8">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
              {timeLeft !== null && (
                <div className={`flex items-center gap-1 font-medium ${timeLeft < 60 ? 'text-red-600' : ''}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-maxxed-blue transition-all"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-6">
                <span className="text-sm text-gray-500 block mb-2">
                  {isMultiSelect ? 'Select all that apply' : 'Select one answer'}
                </span>
                <h2 className="text-xl font-bold text-gray-900">{question.text}</h2>
              </div>

              <div className="space-y-3">
                {question.answers.map((answer) => {
                  const isSelected = selectedAnswers.includes(answer.id);
                  return (
                    <button
                      key={answer.id}
                      onClick={() => selectAnswer(question.id, answer.id, isMultiSelect)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-maxxed-blue bg-maxxed-blue/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-${isMultiSelect ? 'md' : 'full'} border-2 flex items-center justify-center ${
                          isSelected ? 'border-maxxed-blue bg-maxxed-blue' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={isSelected ? 'font-medium' : ''}>{answer.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-sm text-gray-500">
              {answeredCount} of {quiz.questions.length} answered
            </span>

            {currentQuestion < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-maxxed-blue text-white rounded font-medium hover:bg-maxxed-blue-dark"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount < quiz.questions.length}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex justify-center gap-2 mt-8 flex-wrap">
            {quiz.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  idx === currentQuestion
                    ? 'bg-maxxed-blue text-white'
                    : answers[q.id]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
