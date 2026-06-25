# 🏫 Waqar Public Higher Secondary School - Management System

A premium, modern School Management System built with **Node.js**, **Express**, and **MySQL**. This system features a sleek glassmorphism-inspired UI and dedicated portals for Admins, Teachers, Students, and Parents.

## ✨ Key Features

### 👑 Admin Portal
- **Dashboard:** Real-time statistics (Students, Teachers, Revenue).
- **User Management:** Full CRUD for Students and Teachers.
- **Finance:** Fee collection, pending dues tracking, and staff payroll management.
- **Academic:** Timetable creation, Exam management, and Notice board.
- **E-Library:** Centralized resource sharing with grade-specific targeting.

### �‍🏫 Teacher Portal
- **Attendance:** Smart interactive register to mark Present, Absent, Late, or Leave.
- **Exams:** Entry of marks with automatic grade calculation.
- **Timetable:** Personal weekly schedule view.
- **Student List:** Access to assigned class details.

### 🎓 Student & Parent Portal
- **Academic Progress:** View attendance logs and exam results with grades.
- **Finance:** Detailed fee history and payment status updates.
- **Resources:** Download digital books and study materials from the library.
- **Communication:** Real-time school notices and announcements.

---

## �️ Technology Stack
- **Backend:** Node.js, Express.js
- **Frontend:** EJS, Vanilla CSS (Premium Glassmorphism UI)
- **Database:** MySQL (MariaDB)
- **Security:** Password hashing with Bcrypt, Session-based authentication.

---

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/school_management.git
   cd school_management
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Configuration:**
   - Open XAMPP and start **Apache** & **MySQL**.
   - Create a database named `waqar_school_db` in phpMyAdmin.
   - Import the `database.sql` file provided in the root directory.

4. **Environment Variables:**
   - Create a `.env` file in the root directory:
     ```env
     PORT=3000
     DB_HOST=localhost
     DB_USER=root
     DB_PASS=
     DB_NAME=waqar_school_db
     SESSION_SECRET=your_secret_key
     ```

5. **Run the Application:**
   ```bash
   npm run dev
   ```
   Access the system at `http://localhost:3000`

---

## 🔑 Default Accounts (For Testing)
| Role | Username | Password | Setup Route (Run first) |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `/setup-admin` |
| **Teacher** | `teacher` | `teacher123` | `/setup-teacher` |
| **Student** | `student` | `student123` | `/setup-student` |

---

## � Author
Developed with ❤️ by **Sajjad Ali** (Waqar Public Higher Secondary School, Khairpur).
