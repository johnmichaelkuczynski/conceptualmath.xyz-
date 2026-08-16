import { Download, FileText } from "lucide-react";

// The 28 lecture topics, in course order. Plain titles only — no unit/week
// meta-markers.
const COURSE_TOPICS = [
  "Whole numbers and place value",
  "Addition and subtraction",
  "Multiplication and division",
  "Factors, multiples, and primes",
  "Negative numbers and the number line",
  "Order of operations",
  "Word problems and problem-solving strategies",
  "Understanding fractions",
  "Adding and subtracting fractions",
  "Multiplying and dividing fractions",
  "Decimals and place value",
  "Converting fractions, decimals, and percents",
  "Ratios, rates, and proportions",
  "Percent problems and applications",
  "Units, measurement, and conversion",
  "Introduction to variables and expressions",
  "Simplifying and evaluating expressions",
  "Solving one-step equations",
  "Solving multi-step equations",
  "Translating words into equations",
  "The coordinate plane",
  "Graphing linear equations",
  "Slope and intercepts",
  "Exponents and powers",
  "Introduction to polynomials",
  "Basic geometry: perimeter, area, volume",
  "Reading tables, charts, and graphs",
  "Capstone synthesis",
];

// Vertical topics list shown at the top-left of the landing page and
// dashboard, with course-download buttons (PDF / TXT).
export function CourseTopicsList() {
  return (
    <div data-testid="list-course-topics">
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
        Topics Covered in This Course
      </h2>
      <ul className="flex flex-col gap-[3px] mb-3">
        {COURSE_TOPICS.map((t) => (
          <li
            key={t}
            className="text-[11px] leading-snug text-muted-foreground"
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <a
          href="/api/course/download.pdf"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity w-fit"
          data-testid="button-download-course-pdf"
        >
          <Download className="w-3 h-3" />
          Download Course (PDF)
        </a>
        <a
          href="/api/course/download.txt"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-border hover:bg-secondary transition-colors w-fit"
          data-testid="button-download-course-txt"
        >
          <FileText className="w-3 h-3" />
          Download Course (TXT)
        </a>
      </div>
    </div>
  );
}
