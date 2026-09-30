# AI City Simulation

เมืองจำลองที่มีประชากร 50 คนเป็น AI agent ขับเคลื่อนด้วย LLM (Groq) แต่ละคนมีอาชีพ นิสัย เงินเก็บ และความสุขของตัวเอง คุณเล่นเป็นผู้บริหารเมือง ออกนโยบายแล้วดูว่าประชากรตอบสนองอย่างไร ย้ายโซนไหน และเมืองรุ่งหรือล่ม ทั้งหมดดูได้สดผ่านแดชบอร์ด

## โปรเจคนี้เอาไว้ทำอะไร

1. **เรียนรู้และโชว์ฝีมือ (portfolio)** ครอบคลุม LLM agent, ระบบ real-time (socket.io), async backend, ฐานข้อมูล, Docker, CI/CD และเทสต์ 122 ตัว จุดที่น่าสนใจคือ LLM gateway ที่สลับหลาย key และจัดการโควตา, ระบบ fallback เมื่อ LLM ใช้ไม่ได้ และ agent ระดับเมือง
2. **สนามทดลอง multi-agent AI** ดูว่า AI 50 ตัวที่ตอบสนองต่อเหตุการณ์เดียวกันให้พฤติกรรมรวมออกมาอย่างไร ทดลอง prompt, ต้นทุน/โควตา LLM และการเลือกระหว่าง "ให้ AI คิด" กับ "ใช้กฎธรรมดา"
3. **เกมหรือของเล่นเชิงการศึกษาแบบเบาๆ** ให้เห็นภาพ trade-off ของนโยบาย เช่น ลดภาษีแล้วงบหาย ขึ้นภาษีแล้วประชากรไม่พอใจ

**ข้อจำกัด:** เมืองเป็น singleton ตัวเดียวที่ทุกคนแชร์กัน และเศรษฐกิจเป็นสูตรง่ายๆ (รายได้ ค่าเช่า ภาษีคงที่) จึงเป็นของเล่นและตัวอย่างสถาปัตยกรรม ไม่ใช่เครื่องมือที่ให้ข้อสรุปทางเศรษฐศาสตร์ที่เชื่อถือได้ ระบบยังไม่มี authentication ใครเข้าถึงเครื่องได้ก็ควบคุมเมืองและใช้โควตา Groq ได้ จึงเหมาะกับการรันในเครื่องหรือเครือข่ายส่วนตัว

## สิ่งที่ทำได้

- **ประชากร 50 คน** มีอาชีพ นิสัย เงินเก็บ ความสุข และความจำของตัวเอง
- **3 โซน** A (คนรวย, จุ 15), B (ชนชั้นกลาง, จุ 20), C (แรงงาน, จุ 30) ประชากรย้ายโซนตามฐานะและความสุข เต็มแล้วต้องเข้าคิว
- **ออกนโยบาย** ขึ้น/ลดภาษี เพิ่ม/ลดบริการสาธารณะ โครงการที่อยู่อาศัย โครงการสร้างงาน
- **City Manager** เสนอนโยบายทุก 7 วัน (ผ่าน LLM) กดใช้ได้ทันทีจากแดชบอร์ด
- **Policy Advisor** ให้คำแนะนำเมื่อเข้าสู่วิกฤต (ความสุขเฉลี่ยต่ำ)
- **ระบบวิกฤต** แจ้งเตือน warning / critical / collapse ตามความสุขเฉลี่ย
- **Replay** เล่นย้อนจากวันที่บันทึกไว้ โดยไม่เรียก LLM (ใช้กฎสำรองแทน)
- **ใช้งานง่าย** UI เป็นภาษาไทย (สลับ EN ได้) มีคู่มือกดเปิดดูได้จากปุ่ม “คู่มือ” (เด้งขึ้นเองครั้งแรก) มีสรุปสถานะเมืองเป็นประโยค คำอธิบายตัวเลข และนโยบายแนะนำแบบกดเลือก
- **แดชบอร์ดเรียลไทม์** กราฟแนวโน้ม แผนที่เมืองที่ประชากรเคลื่อนที่ข้ามโซนแบบ smooth ฟีดเหตุการณ์ และตัวกรองรายชื่อประชากร

> หมายเหตุ: Replay คืนค่าเฉพาะงบเมืองและคุณภาพบริการ ยังไม่ได้คืนสถานะของประชากรแต่ละคน จึงยังไม่ใช่การเล่นซ้ำที่เหมือนเดิมทุกประการ

## สถาปัตยกรรม

```
Next.js (frontend) ──── nginx ──── FastAPI + socket.io (backend) ──── PostgreSQL
                                          │
                                   Groq LLM Gateway
                                  (สูงสุด 3 key, round-robin)
```

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, APScheduler, python-socketio
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **LLM:** Groq (llama-3.1-8b-instant สำหรับประชากร, llama-3.3-70b-versatile สำหรับ City Manager / Advisor) โควตา 90 RPM / 3000 RPD ต่อ key
- **1 tick = 1 วันในเกม** ทุก 10 วินาที (ปรับได้) ลำดับ: เศรษฐกิจ → ย้ายโซน → ความสุข → บันทึก snapshot → LLM ตอบสนอง

## โครงสร้างโปรเจค

```
backend/
  app/api/          REST endpoints (simulation, policies, citizens, agents, gateway)
  app/simulation/   ตัวเกมหลัก: loop, economy, zones, policy_engine, citizen_ai, agents, gateway
  app/models/       SQLAlchemy models
  alembic/          database migrations
  tests/            pytest (122 เทสต์)
frontend/app/
  components/       Dashboard, CityMap, StatCards, EventFeed, ...
  lib/              useSimulation (state + socket), api, types
```

## เริ่มพัฒนาบนเครื่อง

### ต้องมี

- Python 3.12+
- Node.js 20+
- Docker (สำหรับ PostgreSQL)

### 1. เปิดฐานข้อมูล

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# สร้างไฟล์ backend/.env แล้วใส่ Groq API key
# (backend อ่าน .env จากโฟลเดอร์ที่รัน uvicorn)
cat > .env <<'EOF'
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=
GROQ_API_KEY_3=
EOF

alembic upgrade head
uvicorn app.main:socket_app --reload
```

- ไม่ใส่ Groq key ก็รันได้ ประชากรจะใช้กฎสำรองแทน LLM
- ครั้งแรกที่รัน ถ้าฐานข้อมูลว่าง ระบบสร้างประชากร 50 คนให้อัตโนมัติ

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วกด **Start** (หรือ **Step** เพื่อเดินทีละวัน)

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | คำอธิบาย |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL |
| `GROQ_API_KEY_1/2/3` | Groq API key (ใส่ได้ถึง 3 ตัว สลับกันใช้) |
| `CORS_ORIGINS` | origin ที่อนุญาต คั่นด้วยจุลภาค (ค่าเริ่มต้น `http://localhost:3000`) |
| `ENV` | `development` หรือ `production` |
| `NEXT_PUBLIC_API_URL` | URL ของ backend ที่ฝังตอน build frontend (ว่าง = same origin ผ่าน nginx) |

ดูแม่แบบเต็มที่ `.env.production.example`

## Deploy บนเซิร์ฟเวอร์ที่บ้าน (Docker)

### Deploy ครั้งแรก (ด้วยมือ)

```bash
git clone <repo> ai-city && cd ai-city
cp .env.production.example ~/ai-city.env
# แก้ ~/ai-city.env ใส่ POSTGRES_PASSWORD และ Groq key จริง
docker compose --env-file ~/ai-city.env up -d --build
```

nginx เสิร์ฟ frontend ที่พอร์ต 80 และ proxy `/api` กับ `/socket.io` ไปที่ backend ตรวจสุขภาพได้ที่ `http://localhost/api/health`

> ถ้ามี deployment เดิมอยู่แล้ว ให้ใส่ `COMPOSE_PROJECT_NAME=<ชื่อโปรเจคเดิม>` ใน `~/ai-city.env` (ดูชื่อจาก `docker compose ls`) ไม่เช่นนั้น Docker จะสร้างฐานข้อมูลใหม่และข้อมูลเมืองเดิมจะไม่ถูกใช้

### Auto deploy ด้วย self-hosted runner

เมื่อ push เข้า `main` และ CI ผ่าน, workflow CD (`.github/workflows/cd.yml`) จะสั่งให้คอมที่บ้าน build และรันใหม่เอง โดยไม่ต้องเปิดพอร์ตเข้าบ้าน (runner ดึงงานออกไปหา GitHub)

ตั้งค่าครั้งเดียวบนคอมที่บ้าน (Linux):

1. ติดตั้ง Docker และให้ผู้ใช้รัน docker ได้โดยไม่ต้อง sudo: `sudo usermod -aG docker $USER` แล้วล็อกอินใหม่
2. ไปที่ GitHub repo → Settings → Actions → Runners → **New self-hosted runner** เลือก Linux แล้วรันคำสั่งที่หน้านั้นให้ทีละบรรทัด
3. ติดตั้งให้รันเป็นบริการ จะได้เปิดเครื่องแล้วทำงานเองหลังรีบูต:
   ```bash
   cd ~/actions-runner
   sudo ./svc.sh install && sudo ./svc.sh start
   ```
4. สร้างไฟล์ env ไว้ที่ `~/ai-city.env` (ตามด้านบน) ถ้าไว้ที่อื่น ให้ตั้ง repository variable ชื่อ `ENV_FILE` เป็นพาธนั้น (Settings → Secrets and variables → Actions → Variables)

Deploy ด้วยมือผ่าน GitHub ได้จากแท็บ Actions → CD → Run workflow

> ความปลอดภัย: self-hosted runner รันโค้ดจาก workflow บนเครื่องคุณ ใช้กับ repo ส่วนตัวเท่านั้น อย่าเปิดให้ pull request จาก fork ภายนอกรัน workflow บนเครื่องนี้

## รันเทสต์

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

122 เทสต์ ครอบคลุม economy, zones, gateway, citizen AI, policy engine, agents และ replay

ฝั่ง frontend:

```bash
cd frontend
npx tsc --noEmit && npm run lint
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`) รันเมื่อ push เข้า `develop`/`main` และ PR เข้า `main` ทำ pytest ฝั่ง backend และ type-check ฝั่ง frontend
- **CD** (`.github/workflows/cd.yml`) รันบน self-hosted runner หลัง CI ผ่านบน `main` (ดูวิธีตั้งค่าด้านบน) ไม่ต้องใช้ GitHub Secrets
