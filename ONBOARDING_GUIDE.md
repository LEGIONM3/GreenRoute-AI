# Developer & Municipal Operator Onboarding Guide

## 1. Prerequisites
- **Docker & Docker Compose**: v24.0+
- **Python**: 3.12+
- **Node.js**: 20+ (Node 24 LTS recommended)
- **kubectl & Helm**: v3.12+ (For cluster deployments)

---

## 2. Local Environment Setup

### Backend Initialization:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
pip install pytest pytest-cov locust argon2-cffi redis

# Run database seeds and start development server
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Initialization:
```bash
cd frontend
npm install
npm run dev # Starts Next.js development server at http://localhost:3000
```

---

## 3. Seed Credentials & Access Roles

| Role | Default Email | Default Password | Scope |
|---|---|---|---|
| **Super Admin** | `admin@wastecare.gov` | `Admin@123456` | Full system control, tenant provisioning, audit logs |
| **Municipal Citizen** | `citizen@wastecare.gov` | `Citizen@123456` | Complaint submission, facility locator, RAG queries |

---

## 4. Running the Automated Test Suite

```bash
# Backend test suite
python -m pytest -o pythonpath=backend backend/tests

# Frontend production build & lint
cd frontend
npm run build
```
