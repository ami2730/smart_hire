import {
  PrismaClient,
  Role,
  JobStatus,
  ResumeProcessingStatus,
  ApplicationStatus,
  ScreeningRecommendation,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with comprehensive real data...');

  // 1. Create canonical skills
  const skillsData = [
    { name: 'Python', category: 'Programming Language' },
    { name: 'TypeScript', category: 'Programming Language' },
    { name: 'JavaScript', category: 'Programming Language' },
    { name: 'Node.js', category: 'Backend Runtime' },
    { name: 'Express.js', category: 'Backend Framework' },
    { name: 'FastAPI', category: 'Backend Framework' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Redis', category: 'Database' },
    { name: 'Docker', category: 'DevOps & Cloud' },
    { name: 'Kubernetes', category: 'DevOps & Cloud' },
    { name: 'AWS', category: 'DevOps & Cloud' },
    { name: 'CI/CD', category: 'DevOps & Cloud' },
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'TailwindCSS', category: 'Frontend' },
    { name: 'Machine Learning', category: 'Data & AI' },
    { name: 'NLP', category: 'Data & AI' },
    { name: 'scikit-learn', category: 'Data & AI' },
    { name: 'PyTorch', category: 'Data & AI' },
    { name: 'GraphQL', category: 'API & Architecture' },
    { name: 'Figma', category: 'Design & UI/UX' },
  ];

  console.log('Upserting skills...');
  const skillMap: Record<string, any> = {};
  for (const skill of skillsData) {
    const s = await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
    skillMap[skill.name] = s;
  }

  // 2. Create Users (Admin, Recruiter & internal alias)
  console.log('Upserting users...');
  const defaultPasswordHash = await hashPassword('Password123!');

  await prisma.user.upsert({
    where: { email: 'admin@smarthire.local' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      name: 'System Admin',
      email: 'admin@smarthire.local',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const recruiterUser = await prisma.user.upsert({
    where: { email: 'recruiter@smarthire.local' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      name: 'Jane Recruiter',
      email: 'recruiter@smarthire.local',
      passwordHash: defaultPasswordHash,
      role: Role.RECRUITER,
      isActive: true,
    },
  });

  // Alias user for legacy dev convenience
  await prisma.user.upsert({
    where: { email: 'recruiter@smarthire.internal' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      name: 'Jane Recruiter',
      email: 'recruiter@smarthire.internal',
      passwordHash: defaultPasswordHash,
      role: Role.RECRUITER,
      isActive: true,
    },
  });

  // Official registered applicant user
  const applicantUser = await prisma.user.upsert({
    where: { email: 'applicant@smarthire.local' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      name: 'Alex Johnson',
      email: 'applicant@smarthire.local',
      passwordHash: defaultPasswordHash,
      role: Role.APPLICANT,
      isActive: true,
    },
  });

  // 3. Create 5 Diverse Jobs
  console.log('Creating jobs...');

  const job1 = await prisma.job.upsert({
    where: { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' },
    update: { status: JobStatus.PUBLISHED },
    create: {
      id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      recruiterId: recruiterUser.id,
      title: 'Senior Full Stack & AI Engineer',
      description:
        'Build and maintain scalable backend services using Node.js, TypeScript, and PostgreSQL with Machine Learning integrations. Architect robust APIs and collaborate with frontend teams on Next.js interfaces.',
      status: JobStatus.PUBLISHED,
      minimumExperienceYears: 4,
      requirements: {
        create: {
          requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Python', 'Docker'],
          educationRequirements: "Bachelor's degree in Computer Science or equivalent field",
          minimumExperienceYears: 4,
        },
      },
    },
  });

  const job2 = await prisma.job.upsert({
    where: { id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e' },
    update: { status: JobStatus.PUBLISHED },
    create: {
      id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
      recruiterId: recruiterUser.id,
      title: 'Senior Backend Engineer (Node/Postgres)',
      description:
        'Lead high-throughput backend architecture, database query optimization, Redis caching layers, and microservices reliability for the core recruitment platform.',
      status: JobStatus.PUBLISHED,
      minimumExperienceYears: 5,
      requirements: {
        create: {
          requiredSkills: ['Node.js', 'PostgreSQL', 'TypeScript', 'Redis', 'Docker'],
          educationRequirements: "Bachelor's degree in Computer Science or Software Engineering",
          minimumExperienceYears: 5,
        },
      },
    },
  });

  const job3 = await prisma.job.upsert({
    where: { id: 'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f' },
    update: { status: JobStatus.PUBLISHED },
    create: {
      id: 'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
      recruiterId: recruiterUser.id,
      title: 'ML Platform & NLP Engineer',
      description:
        'Develop NLP feature extractors, resume parsing models, and vectorization scoring pipelines using Python, FastAPI, PyTorch, and scikit-learn.',
      status: JobStatus.PUBLISHED,
      minimumExperienceYears: 3,
      requirements: {
        create: {
          requiredSkills: ['Python', 'FastAPI', 'Machine Learning', 'NLP', 'scikit-learn'],
          educationRequirements: "Master's or Bachelor's in Computer Science, AI, or Mathematics",
          minimumExperienceYears: 3,
        },
      },
    },
  });

  const job4 = await prisma.job.upsert({
    where: { id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a' },
    update: {},
    create: {
      id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
      recruiterId: recruiterUser.id,
      title: 'DevOps & Cloud Infrastructure Engineer',
      description:
        'Design automated CI/CD deployment pipelines, manage container orchestration with Kubernetes, and maintain secure multi-region AWS cloud infrastructure.',
      status: JobStatus.DRAFT,
      minimumExperienceYears: 4,
      requirements: {
        create: {
          requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'PostgreSQL'],
          educationRequirements: "Bachelor's degree in Computer Science, IT, or related field",
          minimumExperienceYears: 4,
        },
      },
    },
  });

  const job5 = await prisma.job.upsert({
    where: { id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b' },
    update: {},
    create: {
      id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
      recruiterId: recruiterUser.id,
      title: 'Product Designer (UI/UX)',
      description:
        'Lead user research, create high-fidelity design systems and user journey flows in Figma, and partner with frontend engineers building Next.js apps.',
      status: JobStatus.CLOSED,
      minimumExperienceYears: 3,
      requirements: {
        create: {
          requiredSkills: ['Figma', 'React', 'TailwindCSS'],
          educationRequirements: "Degree in Design, Human-Computer Interaction, or relevant experience",
          minimumExperienceYears: 3,
        },
      },
    },
  });

  // 4. Create Candidates with skills, education, and experience
  console.log('Creating candidates...');

  const candidatesData = [
    {
      id: '02ee5d12-009e-4794-b74d-0121364298bb',
      name: 'Alex Johnson',
      email: 'alex.candidate@example.com',
      phone: '+1-555-0199',
      location: 'San Francisco, CA',
      summary: 'Full Stack Software Engineer with 5+ years of experience in TypeScript, Node.js, and Python backend services with ML integration.',
      skills: ['Python', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
      education: [
        { institution: 'State University', degree: 'Bachelor of Science', field: 'Computer Science', startDate: new Date('2016-09-01'), endDate: new Date('2020-05-30') },
      ],
      experience: [
        { company: 'TechFlow Systems', jobTitle: 'Senior Software Engineer', description: 'Architected distributed Node.js microservices and integrated FastAPI machine learning pipelines.', startDate: new Date('2022-01-15'), years: 3.5 },
        { company: 'DataCloud Inc', jobTitle: 'Software Engineer', description: 'Built REST APIs in Express and maintained PostgreSQL databases.', startDate: new Date('2020-06-01'), endDate: new Date('2021-12-31'), years: 1.5 },
      ],
      resumeText: 'Alex Johnson. Full Stack Engineer. Skills: Python, TypeScript, Node.js, PostgreSQL, Docker. 5 years experience.',
    },
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Sara Tadesse',
      email: 'sara.tadesse@example.com',
      phone: '+251-911-234567',
      location: 'Addis Ababa, Ethiopia',
      summary: 'Experienced Backend & Systems Engineer specialized in Node.js, PostgreSQL, high-throughput microservices and Redis distributed caching.',
      skills: ['Node.js', 'PostgreSQL', 'TypeScript', 'Redis', 'Docker'],
      education: [
        { institution: 'Addis Ababa University', degree: 'B.Sc. Software Engineering', field: 'Software Engineering', startDate: new Date('2015-09-01'), endDate: new Date('2019-07-15') },
      ],
      experience: [
        { company: 'FinTech Africa Solutions', jobTitle: 'Lead Backend Engineer', description: 'Engineered payment processing pipelines handling 10M daily transactions with Node.js and PostgreSQL.', startDate: new Date('2021-08-01'), years: 4.0 },
        { company: 'EthioTelecom Digital', jobTitle: 'Backend Developer', description: 'Developed high-concurrency microservices and database clustering.', startDate: new Date('2019-08-01'), endDate: new Date('2021-07-31'), years: 2.0 },
      ],
      resumeText: 'Sara Tadesse. Lead Backend Engineer. Expertise in Node.js, PostgreSQL, TypeScript, Redis, Docker.',
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      name: 'Dawit Haile',
      email: 'dawit.haile@example.com',
      phone: '+251-922-345678',
      location: 'Addis Ababa, Ethiopia',
      summary: 'Cloud Infrastructure & DevOps Engineer with extensive expertise in AWS, Docker, Kubernetes clusters, and automated CI/CD deployment pipelines.',
      skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'PostgreSQL', 'Python'],
      education: [
        { institution: 'HilCoE School of Computer Science', degree: 'B.Sc. Computer Science', field: 'Computer Science', startDate: new Date('2016-09-01'), endDate: new Date('2020-06-30') },
      ],
      experience: [
        { company: 'Global Cloud Systems', jobTitle: 'Senior DevOps Specialist', description: 'Managed multi-region AWS cloud infrastructure, Kubernetes clusters, and GitOps CI/CD.', startDate: new Date('2022-03-01'), years: 3.5 },
        { company: 'TechServe Solutions', jobTitle: 'Cloud Engineer', description: 'Automated infrastructure with Terraform and Docker container pipelines.', startDate: new Date('2020-07-01'), endDate: new Date('2022-02-28'), years: 1.7 },
      ],
      resumeText: 'Dawit Haile. DevOps & Cloud Engineer. AWS, Docker, Kubernetes, CI/CD, Terraform, PostgreSQL.',
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      name: 'Bethlehem Assefa',
      email: 'bethlehem.assefa@example.com',
      phone: '+251-933-456789',
      location: 'Addis Ababa, Ethiopia',
      summary: 'Machine Learning Research Engineer specialized in NLP text processing, embedding models, feature extraction pipelines, and FastAPI microservices.',
      skills: ['Python', 'FastAPI', 'Machine Learning', 'NLP', 'scikit-learn', 'PyTorch'],
      education: [
        { institution: 'Addis Ababa Institute of Technology', degree: 'M.Sc. Artificial Intelligence', field: 'AI & Data Science', startDate: new Date('2019-09-01'), endDate: new Date('2021-07-30') },
        { institution: 'Hawassa University', degree: 'B.Sc. Computer Science', field: 'Computer Science', startDate: new Date('2015-09-01'), endDate: new Date('2019-06-30') },
      ],
      experience: [
        { company: 'NLP Research Labs', jobTitle: 'Senior ML Engineer', description: 'Built TF-IDF vectorization and semantic similarity models for document parsing and matching.', startDate: new Date('2021-09-01'), years: 4.0 },
      ],
      resumeText: 'Bethlehem Assefa. Senior ML Engineer. Python, FastAPI, Machine Learning, NLP, scikit-learn, PyTorch.',
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444',
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      phone: '+1-555-0248',
      location: 'New York, NY',
      summary: 'Product-focused Full Stack Developer proficient in React, Next.js, Node.js, and modern REST/GraphQL APIs with test-driven development practices.',
      skills: ['React', 'Next.js', 'Node.js', 'TypeScript', 'TailwindCSS', 'PostgreSQL'],
      education: [
        { institution: 'Columbia University', degree: 'B.S. Computer Engineering', field: 'Computer Engineering', startDate: new Date('2017-09-01'), endDate: new Date('2021-05-20') },
      ],
      experience: [
        { company: 'FinScale Inc', jobTitle: 'Full Stack Engineer', description: 'Built customer-facing dashboards in Next.js and backend microservices with Node.js and Postgres.', startDate: new Date('2021-07-01'), years: 4.2 },
      ],
      resumeText: 'Michael Chen. Full Stack Engineer. React, Next.js, Node.js, TypeScript, PostgreSQL, TailwindCSS.',
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555',
      name: 'Hana Mekonnen',
      email: 'hana.mekonnen@example.com',
      phone: '+251-955-678901',
      location: 'Addis Ababa, Ethiopia',
      summary: 'Senior Product Designer & UX Architect with 4+ years crafting accessible design systems, interactive prototypes in Figma, and collaborating with frontend teams.',
      skills: ['Figma', 'React', 'TailwindCSS'],
      education: [
        { institution: 'Addis Ababa University', degree: 'B.A. Industrial Design', field: 'Design', startDate: new Date('2017-09-01'), endDate: new Date('2021-06-30') },
      ],
      experience: [
        { company: 'CreativeTech Studios', jobTitle: 'Senior UX/UI Designer', description: 'Designed end-to-end design systems and enterprise SaaS web interfaces.', startDate: new Date('2021-08-01'), years: 4.0 },
      ],
      resumeText: 'Hana Mekonnen. Senior UX/UI Designer. Figma, Design Systems, React, TailwindCSS.',
    },
  ];

  const createdCandidates: Record<string, any> = {};
  for (const cData of candidatesData) {
    const isAlex = cData.email === 'alex.candidate@example.com';
    const candidate = await prisma.candidate.upsert({
      where: { email: cData.email },
      update: {
        name: cData.name,
        phone: cData.phone,
        location: cData.location,
        summary: cData.summary,
        userId: isAlex ? applicantUser.id : undefined,
      },
      create: {
        id: cData.id,
        name: cData.name,
        email: cData.email,
        phone: cData.phone,
        location: cData.location,
        summary: cData.summary,
        userId: isAlex ? applicantUser.id : null,
      },
    });
    createdCandidates[cData.email] = candidate;

    // Link skills
    for (const skillName of cData.skills) {
      const skillObj = skillMap[skillName];
      if (!skillObj) continue;
      await prisma.candidateSkill.upsert({
        where: {
          candidateId_skillId: {
            candidateId: candidate.id,
            skillId: skillObj.id,
          },
        },
        update: {},
        create: {
          candidateId: candidate.id,
          skillId: skillObj.id,
          yearsOfExperience: 3,
          proficiencyLevel: 'EXPERT',
        },
      });
    }

    // Upsert resume
    const existingResume = await prisma.resume.findFirst({
      where: { candidateId: candidate.id },
    });
    if (!existingResume) {
      await prisma.resume.create({
        data: {
          candidateId: candidate.id,
          originalFileName: `${cData.name.replace(/\s+/g, '_')}_Resume.pdf`,
          storedFileName: `resume_${candidate.id}.pdf`,
          filePath: `uploads/resumes/resume_${candidate.id}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 1048576,
          extractedText: cData.resumeText,
          processingStatus: ResumeProcessingStatus.PROCESSED,
          isDefault: true,
          processedAt: new Date(),
        },
      });
    }
  }

  // 5. Create Applications & Real Screening Results
  console.log('Creating applications and screening results...');

  const applicationsData = [
    {
      candidateEmail: 'alex.candidate@example.com',
      jobId: job1.id,
      status: ApplicationStatus.SCREENED,
      screening: {
        overallScore: 91.5,
        skillMatchScore: 95.0,
        experienceMatchScore: 90.0,
        educationMatchScore: 88.0,
        semanticSimilarityScore: 93.0,
        matchingSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Python', 'Docker'],
        missingSkills: [],
        recommendation: ScreeningRecommendation.STRONG_MATCH,
        explanation: 'Exceptional match. Candidate possesses 100% of required skills with 5+ years of relevant full-stack and ML integration experience.',
      },
    },
    {
      candidateEmail: 'sara.tadesse@example.com',
      jobId: job1.id,
      status: ApplicationStatus.SHORTLISTED,
      screening: {
        overallScore: 86.0,
        skillMatchScore: 88.0,
        experienceMatchScore: 92.0,
        educationMatchScore: 85.0,
        semanticSimilarityScore: 84.0,
        matchingSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        missingSkills: ['Python'],
        recommendation: ScreeningRecommendation.STRONG_MATCH,
        explanation: 'Very strong backend and systems architecture background. Minor gap in Python, compensated by deep Node.js and PostgreSQL mastery.',
      },
    },
    {
      candidateEmail: 'michael.chen@example.com',
      jobId: job1.id,
      status: ApplicationStatus.SCREENED,
      screening: {
        overallScore: 82.5,
        skillMatchScore: 80.0,
        experienceMatchScore: 85.0,
        educationMatchScore: 88.0,
        semanticSimilarityScore: 81.0,
        matchingSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
        missingSkills: ['Python', 'Docker'],
        recommendation: ScreeningRecommendation.GOOD_MATCH,
        explanation: 'Competent full-stack candidate with strong TypeScript and Node.js fundamentals. Would require brief onboarding in Python and Docker.',
      },
    },
    {
      candidateEmail: 'sara.tadesse@example.com',
      jobId: job2.id,
      status: ApplicationStatus.SHORTLISTED,
      screening: {
        overallScore: 96.0,
        skillMatchScore: 98.0,
        experienceMatchScore: 95.0,
        educationMatchScore: 90.0,
        semanticSimilarityScore: 97.0,
        matchingSkills: ['Node.js', 'PostgreSQL', 'TypeScript', 'Redis', 'Docker'],
        missingSkills: [],
        recommendation: ScreeningRecommendation.STRONG_MATCH,
        explanation: 'Outstanding candidate match for Senior Backend Engineer. Meets 100% of core skills with high-scale payment processing background.',
      },
    },
    {
      candidateEmail: 'bethlehem.assefa@example.com',
      jobId: job3.id,
      status: ApplicationStatus.SHORTLISTED,
      screening: {
        overallScore: 94.0,
        skillMatchScore: 98.0,
        experienceMatchScore: 90.0,
        educationMatchScore: 95.0,
        semanticSimilarityScore: 93.0,
        matchingSkills: ['Python', 'FastAPI', 'Machine Learning', 'NLP', 'scikit-learn'],
        missingSkills: [],
        recommendation: ScreeningRecommendation.STRONG_MATCH,
        explanation: 'Premier candidate for ML Platform & NLP role. Academic and industry specialization in text embedding and NLP pipelines.',
      },
    },
    {
      candidateEmail: 'dawit.haile@example.com',
      jobId: job4.id,
      status: ApplicationStatus.APPLIED,
    },
    {
      candidateEmail: 'hana.mekonnen@example.com',
      jobId: job5.id,
      status: ApplicationStatus.REVIEWED,
      screening: {
        overallScore: 88.0,
        skillMatchScore: 90.0,
        experienceMatchScore: 88.0,
        educationMatchScore: 85.0,
        semanticSimilarityScore: 89.0,
        matchingSkills: ['Figma', 'React', 'TailwindCSS'],
        missingSkills: [],
        recommendation: ScreeningRecommendation.STRONG_MATCH,
        explanation: 'Top-tier product design background with proven experience creating accessible Figma design systems.',
      },
    },
    {
      candidateEmail: 'dawit.haile@example.com',
      jobId: job1.id,
      status: ApplicationStatus.SCREENED,
      screening: {
        overallScore: 68.0,
        skillMatchScore: 60.0,
        experienceMatchScore: 80.0,
        educationMatchScore: 85.0,
        semanticSimilarityScore: 65.0,
        matchingSkills: ['Docker', 'PostgreSQL', 'Python'],
        missingSkills: ['TypeScript', 'Node.js'],
        recommendation: ScreeningRecommendation.MODERATE_MATCH,
        explanation: 'Strong infrastructure skillset, but lacks key application development expertise in TypeScript and Node.js for this role.',
      },
    },
  ];

  for (const appData of applicationsData) {
    const candidate = createdCandidates[appData.candidateEmail];
    if (!candidate) continue;

    const resume = await prisma.resume.findFirst({
      where: { candidateId: candidate.id },
    });

    const app = await prisma.application.upsert({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: appData.jobId,
        },
      },
      update: {
        status: appData.status,
      },
      create: {
        candidateId: candidate.id,
        jobId: appData.jobId,
        resumeId: resume ? resume.id : null,
        status: appData.status,
      },
    });

    if (appData.screening) {
      const existingScreening = await prisma.screeningResult.findFirst({
        where: { applicationId: app.id },
      });
      if (!existingScreening) {
        await prisma.screeningResult.create({
          data: {
            applicationId: app.id,
            overallScore: appData.screening.overallScore,
            skillMatchScore: appData.screening.skillMatchScore,
            experienceMatchScore: appData.screening.experienceMatchScore,
            educationMatchScore: appData.screening.educationMatchScore,
            semanticSimilarityScore: appData.screening.semanticSimilarityScore,
            matchingSkills: appData.screening.matchingSkills,
            missingSkills: appData.screening.missingSkills,
            recommendation: appData.screening.recommendation,
            explanation: appData.screening.explanation,
            modelVersion: 'tfidf-v1',
          },
        });
      }
    }
  }

  console.log('✅ Real database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
