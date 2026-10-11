# 🎓 Christ University Exam Timetable & Seating Planner

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

> A highly optimized, full-stack scheduling and seating allocation system designed to automate academic exam planning. It features an advanced constraint-solving engine to prevent exam overlaps and enforce strict spatial distancing in examination halls.

![Main Dashboard View](path/to/hero-image.png)

## ✨ Core Features

*   **🧠 Algorithmic Constraint Solver:** Automatically schedules university courses into defined exam sessions, guaranteeing absolutely zero time overlaps for any student enrolled in multiple courses.
*   **🪑 Smart 2D Seating Grid:** Dynamically generates visual seating arrangements conforming to a 3-4-3 classroom layout. Enforces a strict 1-seat gap rule and mathematically guarantees no two adjacent students are writing the same exam.
*   **🎨 Dual Theming:** Beautiful UI seamlessly toggling between "Sakura Light" and "Sleek Dark" modes using Tailwind CSS v4.

![2D Seating Grid Visualization](path/to/grid.png)

*   **📊 Interactive Analytics Dashboard:** Real-time visual widgets built with Recharts, displaying campus seat utilization, session distributions, and solver latency metrics.
*   **🚨 Failure Engine Terminal:** A real-time diagnostic terminal integrated into the UI. If constraints cannot be met (e.g., Chromatic Overload or Capacity Shortage), the engine outputs exact, readable explanations rather than failing silently.
*   **🔍 Global Unified Search:** Lightning-fast, fuzzy search engine to instantly locate students, courses, or rooms across the entire database.

![Dynamic Themes](path/to/terminal.png)

---

## 🚀 Local Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [Python](https://www.python.org/) (3.10+ recommended)
*   An SQL Database (Local or Cloud-based like Aiven)
