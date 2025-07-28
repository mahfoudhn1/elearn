"use client";
import React, { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { motion } from 'framer-motion';
import axiosClientInstance from '../../lib/axiosInstance';
import { fetchCourse } from './course';
import { GroupCourse, Answer } from '../../types/student';
import Quiz from './quiz';
import QuizAnswerForm from './quizanswer';

const CourseViewer: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [course, setCourse] = useState<GroupCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const fetchedCourse = await fetchCourse(); // Pass courseId to fetchCourse
        setCourse(fetchedCourse);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  const handleAnswerSubmit = async (answers: { [questionId: number]: Answer | string }) => {
    if (!course?.quiz) return;

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const submissionPromises = Object.entries(answers).map(async ([questionId, answer]) => {
        let selected_answer: number | string;

        if (typeof answer === 'string') {
          // Short Answer: Send the text directly
          selected_answer = answer;
        } else {
          // Multiple Choice or True/False: Send the Answer ID
          selected_answer = answer.id;
        }

        const response = await axiosClientInstance.post('/groups/studentanswer/', {
          question: parseInt(questionId),
          selected_answer,
        });

        return response.data;
      });

      const newStudentAnswers = await Promise.all(submissionPromises);

      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          student_answers: [
            ...(prev.student_answers || []),
            ...newStudentAnswers,
          ],
        };
      });
    } catch (err: any) {
      setSubmissionError(err.response?.data?.detail || 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-12 h-12 border-4 border-t-blue-500 border-gray-300 rounded-full"
        />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center text-red-500 bg-red-50 p-6 rounded-lg mx-auto max-w-2xl mt-10">
        {error || 'Course not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-2xl rounded-2xl p-8 mb-8 transform hover:shadow-3xl transition-shadow duration-300"
        >
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              {course.description}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Created: {new Date(course.created_at).toLocaleDateString()}
          </p>
        </motion.div>

        {course.group_video ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white shadow-2xl rounded-2xl p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Video</h2>
            <div className="relative aspect-w-16 aspect-h-9 rounded-xl overflow-hidden">
              <ReactPlayer
                url={course.group_video}
                controls
                width="100%"
                height="100%"
                config={{
                  file: {
                    attributes: {
                      poster: 'https://via.placeholder.com/1280x720?text=Course+Video',
                    },
                  },
                }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white shadow-2xl rounded-2xl p-8 mb-8 text-gray-600 text-center"
          >
            No video available for this course.
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white shadow-2xl rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Surveys</h2>
          {course.quiz ? (
            <>
              <Quiz quiz={course.quiz} />
              <QuizAnswerForm
                questions={course.quiz.questions}
                onSubmit={handleAnswerSubmit}
              />
              {submissionError && (
                <p className="text-red-500 mt-4">{submissionError}</p>
              )}
              {submitting && (
                <p className="text-gray-600 mt-4">Submitting answers...</p>
              )}
            </>
          ) : (
            <p className="text-gray-600">No quiz available for this course.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CourseViewer;