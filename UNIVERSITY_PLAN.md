# Enterprise University Management Portal - Implementation Plan

## 🏛️ System Architecture
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Type-safety for enterprise scale)
- **Database:** MySQL (via XAMPP/Remote Server)
- **ORM:** Prisma (Modern, type-safe database access)
- **Authentication:** Next-Auth (JWT, Role-based)
- **Styling:** Tailwind CSS + Shadcn UI (Modern Premium Look)
- **State Management:** React Query / Zustand

---

## 📅 Phase 1: Foundation & Database (Current)
- [ ] Initialize Next.js project with Tailwind & TypeScript.
- [ ] Setup Prisma ORM and define the University Schema.
- [ ] Create Database Seed script for initial Roles and Super Admin.
- [ ] Implement Advanced JWT Authentication with Role Middleware.

## 📅 Phase 2: Role-Based Dashboards
- [ ] **Super Admin:** Multi-tenancy, User Management, Global Settings.
- [ ] **Admin:** Departmental controls, Admissions, Finance.
- [ ] **Teacher:** Course management, Attendance, Grading.
- [ ] **Student:** Portal, Timetable, Learning Material.
- [ ] **Parent:** Child tracking, Payment history.

## 📅 Phase 3: Digital Library & E-Learning
- [ ] File Upload system (Digital Assets).
- [ ] Category-wise E-Book directory.
- [ ] Video/PDF viewer integration.

## 📅 Phase 4: Finance & Reporting
- [ ] Fee Invoice generation.
- [ ] Financial Analytics (Charts).
- [ ] PDF Report generation.

---

## 🗄️ Database Schema Design (Prisma)

```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  email         String?   @unique
  password      String
  role          Role      @default(STUDENT)
  fullName      String
  avatar        String?
  status        String    @default("active")
  createdAt     DateTime  @default(now())
  
  // Relations
  studentProfile Student?
  teacherProfile Teacher?
  parentProfile  Parent?
}

model Department {
  id        String    @id @default(uuid())
  name      String    @unique
  code      String    @unique
  head      String?
  courses   Course[]
  students  Student[]
}

model Course {
  id            String     @id @default(uuid())
  name          String
  code          String     @unique
  credits       Int
  department    Department @relation(fields: [departmentId], references: [id])
  departmentId  String
  classes       Class[]
}

model Class {
  id         String     @id @default(uuid())
  course     Course     @relation(fields: [courseId], references: [id])
  courseId   String
  teacher    Teacher    @relation(fields: [teacherId], references: [id])
  teacherId  String
  semester   Int
  section    String
  attendance Attendance[]
}

model Student {
  id           String     @id @default(uuid())
  user         User       @relation(fields: [userId], references: [id])
  userId       String     @unique
  department   Department @relation(fields: [departmentId], references: [id])
  departmentId String
  enrollmentNo String     @unique
  batch        String
  attendance   Attendance[]
  fees         Fee[]
}

model Teacher {
  id           String     @id @default(uuid())
  user         User       @relation(fields: [userId], references: [id])
  userId       String     @unique
  classes      Class[]
  designation  String
}

model Attendance {
  id        String   @id @default(uuid())
  date      DateTime
  status    String   // Present, Absent, Late
  student   Student  @relation(fields: [studentId], references: [id])
  studentId String
  class     Class    @relation(fields: [classId], references: [id])
  classId   String
}

model Fee {
  id        String   @id @default(uuid())
  amount    Float
  month     String
  year      Int
  status    String   // Paid, Unpaid
  student   Student  @relation(fields: [studentId], references: [id])
  studentId String
}
```

---

## 🛠️ Setup Instructions (Next Steps)
1. Run `npx create-next-app@latest university_portal --typescript --tailwind --eslint`.
2. Install Prisma: `npm install prisma @prisma/client`.
3. Configure `.env` with MySQL connection string.
4. Push schema to database: `npx prisma db push`.
