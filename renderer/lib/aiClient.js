import { generateCourse, chatCourse } from './db';

export async function generateCourseDraft({ moduleName, request }) {
  const { data, error } = await generateCourse({ title: moduleName || 'Course', topics: request || '' });
  if (error) throw new Error(error.message);
  const text = data?.result || '';
  const titleMatch = text.match(/^TITLE:\s*(.+)$/im);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]*)$/i);
  return {
    title: (titleMatch?.[1] || 'Generated course').trim(),
    content: (contentMatch?.[1] || text).trim(),
  };
}

export async function chatWithCourse({ mode, question, course }) {
  const { data, error } = await chatCourse({
    courseContent: course?.content || '',
    question: mode === 'summary' ? 'Summarize this course' : (question || ''),
  });
  if (error) throw new Error(error.message);
  return data?.result || '';
}
