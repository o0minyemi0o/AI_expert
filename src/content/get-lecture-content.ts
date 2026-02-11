import fs from "fs";
import path from "path";

export function getLectureContent(
  courseId: string,
  lectureId: string
): string | null {
  const filePath = path.join(
    process.cwd(),
    "src",
    "content",
    "lectures",
    courseId,
    `${lectureId}.md`
  );
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
