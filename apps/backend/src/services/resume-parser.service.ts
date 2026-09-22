import { prisma } from '../config/database';
import { mlClient } from '../integrations/ml/ml.client';
import { logger } from '../config/logger';

// ── Known Skills Dictionary & Canonical Normalization ────────────────────────
const CANONICAL_SKILLS: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  'react.js': 'React',
  reactjs: 'React',
  react: 'React',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  node: 'Node.js',
  'angular.js': 'Angular',
  angularjs: 'Angular',
  angular: 'Angular',
  'vue.js': 'Vue.js',
  vuejs: 'Vue.js',
  vue: 'Vue.js',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  next: 'Next.js',
  html: 'HTML',
  html5: 'HTML',
  css: 'CSS',
  css3: 'CSS',
  sass: 'Sass',
  scss: 'Sass',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  express: 'Express.js',
  expressjs: 'Express.js',
  sql: 'SQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  redis: 'Redis',
  prisma: 'Prisma ORM',
  typeorm: 'TypeORM',
  sequelize: 'Sequelize',
  graphql: 'GraphQL',
  'restful apis': 'RESTful APIs',
  rest: 'RESTful APIs',
  'rest api': 'RESTful APIs',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud Platform',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  linux: 'Linux',
  bash: 'Bash',
  java: 'Java',
  spring: 'Spring Boot',
  springboot: 'Spring Boot',
  'c#': 'C#',
  csharp: 'C#',
  dotnet: '.NET',
  '.net': '.NET',
  cpp: 'C++',
  'c++': 'C++',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  laravel: 'Laravel',
  ruby: 'Ruby',
  rails: 'Ruby on Rails',
  'agile/scrum': 'Agile / Scrum',
  agile: 'Agile / Scrum',
  scrum: 'Agile / Scrum',
  jira: 'Jira',
  figma: 'Figma',
  jest: 'Jest',
  cypress: 'Cypress',
  playwright: 'Playwright',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  scikit: 'scikit-learn',
  nlp: 'Natural Language Processing (NLP)',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  pandas: 'Pandas',
  numpy: 'NumPy',
};

// ── Degree Keyword Matchers ──────────────────────────────────────────────────
const DEGREE_PATTERNS = [
  /\b(bachelor(?:\s+of\s+[a-zA-Z\s]+)?|bachelors?|b\.?sc?\.?|bsc\.?|b\.?s\.?|b\.?a\.?|b\.?eng\.?|b\.?tech\.?|bca|b\.?c\.?a\.?|undergraduate|degree\s+in)\b/i,
  /\b(master(?:\s+of\s+[a-zA-Z\s]+)?|masters?|m\.?sc?\.?|msc\.?|m\.?s\.?|m\.?a\.?|m\.?eng\.?|m\.?tech\.?|mba|m\.?b\.?a\.?|postgraduate)\b/i,
  /\b(ph\.?d\.?|doctorate|doctoral|doctor\s+of\s+[a-zA-Z\s]+)\b/i,
  /\b(associate(?:\s+degree)?|diploma|higher\s+diploma|certificate|certification)\b/i,
];

export interface ExtractedResumeData {
  skills: string[];
  jobTitle?: string;
  experience: Array<{
    jobTitle: string;
    company: string;
    years?: number;
    description?: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  education: Array<{
    degree: string;
    field?: string;
    institution: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  location?: string;
  phone?: string;
  summary?: string;
}
export class ResumeParserService {
  /**
   * Parse resume raw text and optional ML service payload into structured candidate entities.
   */
  parseText(rawText: string): ExtractedResumeData {
    if (!rawText || !rawText.trim()) {
      return { skills: [], experience: [], education: [] };
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // 1. Identify sections
    const sections: Record<string, string[]> = {
      header: [],
      summary: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      other: [],
    };

    let currentSection = 'header';

    for (const line of lines) {
      const lower = line.toLowerCase().replace(/[:\-_#*]/g, '').trim();

      if (
        /^(work\s+experience|professional\s+experience|experience|employment(?:\s+history)?|work\s+history)$/i.test(
          lower
        )
      ) {
        currentSection = 'experience';
        continue;
      }
      if (
        /^(education|educational\s+background|academic\s+background|qualifications|academic\s+history|degrees?|education\s*&.*|education\s+and.*|academic\s+qualifications)/i.test(
          lower
        )
      ) {
        currentSection = 'education';
        continue;
      }
      if (
        /^(skills|technical\s+skills|core\s+competencies|technologies|tools(?:\s+and\s+technologies)?)$/i.test(
          lower
        )
      ) {
        currentSection = 'skills';
        continue;
      }
      if (/^(summary|professional\s+summary|profile|about(?:\s+me)?|objective)$/i.test(lower)) {
        currentSection = 'summary';
        continue;
      }
      if (/^(projects|personal\s+projects|portfolio)$/i.test(lower)) {
        currentSection = 'projects';
        continue;
      }

      (sections[currentSection] ?? (sections[currentSection] = [])).push(line);
    }
// 2. Extract Skills
    const extractedSkillsSet = new Set<string>();
 // Scan lines in the SKILLS section
    for (const line of (sections.skills ?? [])) {
      // Split on commas, bullets, pipes, or semicolons
      const tokens = line.split(/[,|;•\t]/).map((t) => t.trim());
      for (const token of tokens) {
        if (!token) continue;
        const normalizedKey = token.toLowerCase();
        if (CANONICAL_SKILLS[normalizedKey]) {
          extractedSkillsSet.add(CANONICAL_SKILLS[normalizedKey]);
        } else if (token.length >= 2 && token.length <= 35 && !/\s{3,}/.test(token)) {
          // Check if token matches a canonical skill substring
          let matched = false;
          for (const [key, canonical] of Object.entries(CANONICAL_SKILLS)) {
            const regex = new RegExp(`\\b${key.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(token)) {
              extractedSkillsSet.add(canonical);
              matched = true;
            }
          }
          if (!matched && /^[a-zA-Z0-9#+.\s\-/]+$/.test(token)) {
            // Include user-defined skill cleanly capitalized
            extractedSkillsSet.add(token);
          }
        }
      }
    }
    // Also scan the entire resume text for all canonical skills to catch mentions elsewhere
    const fullTextLower = ` ${rawText.toLowerCase().replace(/[,/()]/g, ' ')} `;
    for (const [key, canonical] of Object.entries(CANONICAL_SKILLS)) {
      const regex = new RegExp(`[\\s]${key.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}[\\s]`, 'i');
      if (regex.test(fullTextLower)) {
        extractedSkillsSet.add(canonical);
      }
    }
     // 3. Extract Experience
    const experience: ExtractedResumeData['experience'] = [];
    const expLines = sections.experience ?? [];

    if (expLines.length > 0) {
      let currentJob: {
        jobTitle: string;
        company: string;
        dates?: string;
        description: string[];
      } | null = null;
 for (let i = 0; i < expLines.length; i++) {
        const line = expLines[i] ?? '';

        // Check if line looks like a job title or company
        const isDateLine =
          /\b(20\d\d|19\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)\b/i.test(
            line ?? ''
          );
        const isLocationLine =
          /\b(ethiopia|addis\s+ababa|remote|adama|usa|kenya|germany|uk|canada)\b/i.test(line ?? '');
        const isEmailLine = /@/.test(line ?? '');

        // Detect job title
        const isJobTitleCandidate =
          /\b(engineer|developer|designer|manager|architect|lead|intern|consultant|analyst|specialist|administrator)\b/i.test(
            line
          );
if (isJobTitleCandidate && (!currentJob || currentJob.description.length > 0)) {
          if (currentJob && currentJob.jobTitle) {
            experience.push({
              jobTitle: currentJob.jobTitle,
              company: currentJob.company || 'Organization',
              description: currentJob.description.join(' ').trim() || undefined,
              years: this.estimateYears(currentJob.dates),
            });
          }
onst nextLine = expLines[i + 1] ?? '';
          const companyGuess =
            nextLine && !isDateLine && !/@/.test(nextLine) && nextLine.length < 50
              ? nextLine
              : 'Independent / Freelance';

          currentJob = {
            jobTitle: line ?? '',
            company: companyGuess,
            description: [],
          };
          if (companyGuess === nextLine) {
            i++; // consume company line
          }
          continue;
        }

        if (currentJob) {
          if (isDateLine && !currentJob.dates) {
            currentJob.dates = line;
          } else if (!isDateLine && !isLocationLine && !isEmailLine) {
            currentJob.description.push(line);
          }
        }
      }
        if (currentJob && currentJob.jobTitle) {
        experience.push({
          jobTitle: currentJob.jobTitle,
          company: currentJob.company || 'Organization',
          description: currentJob.description.join(' ').trim() || undefined,
          years: this.estimateYears(currentJob.dates),
        });
      }
    }
    / 4. Extract Education
    const education: ExtractedResumeData['education'] = [];
    const eduLines =
      sections.education && sections.education.length > 0
        ? sections.education
        : lines;

    const INSTITUTION_PATTERN =
      /\b(university|college|institute|academy|polytechnic|school\s+of)\b/i;
    const FIELD_PATTERN =
      /\b(computer\s+science|software\s+engineering|information\s+technology|computer\s+engineering|electrical\s+engineering|data\s+science|information\s+systems|engineering|science|technology|mathematics|business)\b/i;

    let currentEdu: { degree: string; field?: string; institution: string } | null = null;

    for (let i = 0; i < eduLines.length; i++) {
      const line = eduLines[i] ?? '';
      let lineDegree = '';
      for (const pattern of DEGREE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          lineDegree = line;
          break;
        }
      }

      const hasInstitution = INSTITUTION_PATTERN.test(line);
      const fieldMatch = line.match(FIELD_PATTERN);

      if (lineDegree) {
        if (currentEdu) {
          education.push(currentEdu);
        }

        let instGuess = hasInstitution ? line : '';
        const extractedField = fieldMatch ? fieldMatch[0] : undefined;

        if (!instGuess && i + 1 < eduLines.length) {
          const nextLine = eduLines[i + 1] ?? '';
          if (INSTITUTION_PATTERN.test(nextLine)) {
            instGuess = nextLine;
          }
        }

        currentEdu = {
          degree: lineDegree,
          field: extractedField,
          institution: instGuess || 'Accredited University / College',
        };
      } else if (currentEdu) {
        if (hasInstitution && currentEdu.institution.includes('Accredited')) {
          currentEdu.institution = line;
        }
        if (!currentEdu.field && fieldMatch) {
          currentEdu.field = fieldMatch[0];
        }
      } else if (sections.education && sections.education.length > 0 && hasInstitution) {
        currentEdu = {
          degree: 'University Degree / Qualification',
          field: fieldMatch ? fieldMatch[0] : undefined,
          institution: line,
        };
      }
    }

    if (currentEdu) {
      education.push(currentEdu);
    }
// 5. Extract Location & Phone
    let location: string | undefined;
    let phone: string | undefined;

    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    if (phoneMatch && phoneMatch[0].length >= 9) {
      phone = phoneMatch[0].trim();
    }

    const locationMatch = rawText.match(
      /\b([A-Z][a-zA-Z\s]+,\s*(?:Ethiopia|United States|USA|UK|Germany|Kenya|Canada|Remote|Addis Ababa))\b/i
    );
    if (locationMatch) {
      location = locationMatch[0].trim();
    } else {
      for (const line of lines.slice(0, 15)) {
        if (/\b(Addis Ababa|Ethiopia|Adama|Hawassa|Nairobi|New York|San Francisco|Remote)\b/i.test(line)) {
          location = line.replace(/Email.*|Phone.*/i, '').trim();
          break;
        }
      }
    }
     // 6. Summary / Headline
    let jobTitle: string | undefined;
    for (const line of lines.slice(0, 8)) {
      if (/\b(engineer|developer|designer|architect|lead|analyst)\b/i.test(line) && line.length < 50) {
        jobTitle = line;
        break;
      }
    }

    let summary: string | undefined;
    if ((sections.summary ?? []).length > 0) {
      summary = (sections.summary ?? []).join(' ').trim();
    } else if (experience[0]?.description) {
      summary = experience[0].description.slice(0, 400);
    }

    return {
      skills: Array.from(extractedSkillsSet),
      jobTitle,
      experience,
      education,
      location,
      phone,
      summary,
    };
  }

  private estimateYears(dateStr?: string): number {
    if (!dateStr) return 1.0;
    const years = dateStr.match(/\b(19\d\d|20\d\d)\b/g);
    if (years && years.length >= 2) {
      const diff = parseInt(years[1] ?? '0', 10) - parseInt(years[0] ?? '0', 10);
      return diff > 0 ? diff : 0.5;
    }
    if (/\b(month|june|augst|august|july)\b/i.test(dateStr)) {
      return 0.5;
    }
    return 1.0;
  }


export const resumeParserService = new ResumeParserService();
