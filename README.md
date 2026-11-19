# 🏨 HostelCare - Resident Issue Management System (MySQL Connected)

A web application designed for hostel residents and administrators to report, monitor, and resolve hostel maintenance issues (fan/AC, WiFi, mosquito netting, water problems, electrical, plumbing, carpentry, and cleanliness), **backed directly by a MySQL database**.

---

## 🗄️ MySQL Database Integration

The application includes a Python backend ([server.py](file:///d:/vscodee/hostel/server.py)) and data access layer ([db.py](file:///d:/vscodee/hostel/db.py)) connected to **MySQL Server 8.0**:

- **Database Name**: `hostelcare`
- **Schema File**: [schema.sql](file:///d:/vscodee/hostel/schema.sql)
- **Configuration File**: [db_config.json](file:///d:/vscodee/hostel/db_config.json)

### Connecting Your MySQL Database:
1. Open the application at **[http://localhost:8000](http://localhost:8000)**.
2. Click the **"MySQL: Configure"** button in the top navigation bar.
3. Enter your MySQL `root` password (or custom user/port) and click **"Test & Save Connection"**.
4. The system will automatically:
   - Connect to your MySQL server.
   - Create the `hostelcare` database.
   - Execute [schema.sql](file:///d:/vscodee/hostel/schema.sql) to build the `users`, `issues`, and `emails` tables.
   - Seed sample residents, tickets, and resolution email history across Amethyst, Amber, Sapphire, and Jasper hostels!

Alternatively, you can edit [db_config.json](file:///d:/vscodee/hostel/db_config.json) directly:
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "YOUR_MYSQL_PASSWORD",
  "database": "hostelcare"
}
```

---

## 🚀 Live Access
The deployed HostelCare website is live at:
👉 **[https://hostelcare-m1nn.onrender.com/](https://hostelcare-m1nn.onrender.com/)**

For local development only, run the server and open `http://localhost:8000`.


---

## 🔑 Demo Login Credentials

### 1. Student Demo Login
- **Username**: `21BCE1042@at`
- **Password**: `password123`
- **Hostel**: Amethyst | **Room**: 302 | **Resident**: Aarav Sharma
- *(Click the **"Student Demo"** quick button on the top nav to auto-login)*

### 2. Administrator Demo Login
- **Username / Email**: `admin@hostel.edu`
- **Password**: `admin123`
- *(Click the **"Admin Demo"** quick button on the top nav to auto-login)*

---

## ✨ Features Implemented

### 1. 🔐 Authentication & Account Creation
- **Sign In / Create Account Tabs**: Seamless switching between login and registration.
- **Registration Form Fields**:
  - Full Name
  - Registration Number (e.g. `22BCE1530`)
  - Email Address (where resolution confirmation emails are delivered)
  - Campus Location / Block
  - Room Number (e.g. `304-B`)
  - Hostel Selection:
    - **Amethyst** (Username suffix: `@at`)
    - **Amber** (Username suffix: `@ab`)
    - **Sapphire** (Username suffix: `@sp`)
    - **Jasper** (Username suffix: `@js`)
  - Password
- **Dynamic Username Auto-Generation**: As the student types their registration number and selects their hostel, their official username (e.g. `21BCE1042@at`) is generated and previewed live on screen.

---

### 2. 🎓 Student Resident Dashboard
- **Personalized Welcome Screen**:
  - Displays student's name, room number, hostel name, registration number, and assigned username.
- **Summary Counters**: Total Raised, Active Unresolved, In Progress, and Resolved tickets.
- **Current Unresolved Issues List**:
  - **No. of Days Unresolved**: Dynamically calculated in real-time from ticket submission timestamp.
    - 🟢 *< 2 days*: Fresh ticket
    - 🟡 *2 – 4 days*: Moderate wait time
    - 🔴 *≥ 5 days*: Critical alert badge with warning indicator
  - **Resolution Progress Pipeline**: Visual stage indicator (*Submitted ➔ In Progress ➔ Resolved*).
- **Raise New Issue Modal**:
  - Preset categories: **Fan / AC**, **WiFi / Internet**, **Mosquito Net**, **Water Problem**, **Carpentry / Furniture**, and **Cleanliness / Waste**.
  - Title, priority selector (Normal, High, Urgent), and detailed description.
  - Automatically pre-fills student room and hostel details.
- **History of Issues Archive**:
  - Displays resolved maintenance requests with resolution duration and warden remarks.
  - Includes a **"View Confirmation Email"** button to review the notification sent upon resolution.

---

### 3. 🛡️ Hostel Administrator Dashboard
- **Hostel Switcher Tabs**: Filter maintenance tickets for:
  - **All Hostels**
  - **Amethyst**
  - **Amber**
  - **Sapphire**
  - **Jasper**
- **Interactive Analytics Graphs (Chart.js)**:
  1. **Hostel Distribution Chart**: Stacked visual comparison of active vs resolved issues across all 4 hostels.
  2. **Problem Category Breakdown**: Doughnut chart showing distribution of Fan, WiFi, Mosquito Net, Water, and other issues.
- **Issue Details Table / Cards**:
  - Student identity, registration number, hostel, room number, and contact email.
  - Issue description and priority tag.
  - Live **Days Unresolved** counter.
- **Progress Tracking & Issue Removal**:
  - Advance status from **Pending** to **In Progress**.
  - **Resolve & Remove Action**:
    - Prompts warden/manager for resolution remarks (e.g., technician action taken).
    - Removes issue from active queue and archives it into historical records.
    - **Automated Email Dispatch**: Simulates and logs an email sent directly to the resident's registered email with resolution notes.
- **Automated Email Outbox Log**:
  - Accessible via the envelope icon in the top navigation bar.
  - Shows full dispatched email records (recipient, subject line, timestamp, and message body).

---

## 🛠️ Tech Stack
- **HTML5 & Semantic Markup**
- **Tailwind CSS (CDN)** for responsive, modern UI styling
- **JavaScript (ES6+)** with modular state handling and `localStorage` persistence
- **Chart.js (CDN)** for live graphical analytics
- **Font Awesome 6** for icons
