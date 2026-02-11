import { notFound } from "next/navigation";
import { getCourseById } from "@/data/courses";
import { getLecturesByCourse, getLectureById } from "@/data/lectures";
import { getLectureContent } from "@/content/get-lecture-content";
import { LectureClient } from "@/components/lecture/lecture-client";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ courseId: string; lectureId: string }>;
}) {
  const { courseId, lectureId } = await params;
  const course = getCourseById(courseId);
  const lecture = getLectureById(courseId, lectureId);

  if (!course || !lecture) notFound();

  const content = getLectureContent(courseId, lectureId);
  const allLectures = getLecturesByCourse(courseId);

  return (
    <LectureClient
      courseId={courseId}
      lectureId={lectureId}
      courseShortTitle={course.shortTitle}
      lecture={lecture}
      content={content}
      allLectures={allLectures}
    />
  );
}
