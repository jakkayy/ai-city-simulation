# AI City Simulation

เมืองจำลองที่มีประชากร 50 คนเป็น AI agent ขับเคลื่อนด้วย LLM (Groq) แต่ละคนมีอาชีพ นิสัย เงินเก็บ และความสุขของตัวเอง คุณเล่นเป็นผู้บริหารเมือง ออกนโยบายแล้วดูว่าประชากรตอบสนองอย่างไร ย้ายโซนไหน และเมืองรุ่งหรือล่ม ทั้งหมดดูได้สดผ่านแดชบอร์ด

## โปรเจคนี้เอาไว้ทำอะไร

1. **เรียนรู้และโชว์ฝีมือ (portfolio)** ครอบคลุม LLM agent, ระบบ real-time (socket.io), async backend, ฐานข้อมูล, Docker, CI/CD และเทสต์ 168 ตัว จุดที่น่าสนใจคือ LLM gateway ที่สลับหลาย key และจัดการโควตา, ระบบ fallback เมื่อ LLM ใช้ไม่ได้ และ agent ระดับเมือง
2. **สนามทดลอง multi-agent AI** ดูว่า AI 50 ตัวที่ตอบสนองต่อเหตุการณ์เดียวกันให้พฤติกรรมรวมออกมาอย่างไร ทดลอง prompt, ต้นทุน/โควตา LLM และการเลือกระหว่าง "ให้ AI คิด" กับ "ใช้กฎธรรมดา"
3. **เกมหรือของเล่นเชิงการศึกษาแบบเบาๆ** ให้เห็นภาพ trade-off ของนโยบาย เช่น ลดภาษีแล้วงบหาย ขึ้นภาษีแล้วประชากรไม่พอใจ

**ข้อจำกัด:** เมืองเป็น singleton ตัวเดียวที่ทุกคนแชร์กัน และเศรษฐกิจเป็นแบบจำลองง่ายๆ ที่ผมปรับค่าด้วยการจำลองเอง (ไม่ได้อิงข้อมูลจริง) จึงเป็นของเล่นและตัวอย่างสถาปัตยกรรม ไม่ใช่เครื่องมือที่ให้ข้อสรุปทางเศรษฐศาสตร์ที่เชื่อถือได้ ระบบยังไม่มี authentication ใครเข้าถึงเครื่องได้ก็ควบคุมเมืองและใช้โควตา Groq ได้ จึงเหมาะกับการรันในเครื่องหรือเครือข่ายส่วนตัว

## สิ่งที่ทำได้

- **ประชากร 50 คน** มีอาชีพ นิสัย เงินเก็บ ความสุข และความจำของตัวเอง
- **3 โซน** A (คนรวย, จุ 15), B (ชนชั้นกลาง, จุ 20), C (แรงงาน, จุ 30) ประชากรย้ายโซนตามฐานะและความสุข เต็มแล้วต้องเข้าคิว
- **ออกนโยบาย** ขึ้น/ลดภาษี เพิ่ม/ลดบริการสาธารณะ โครงการที่อยู่อาศัย โครงการสร้างงาน
- **City Manager** เสนอนโยบายทุก 7 วัน (ผ่าน LLM) กดใช้ได้ทันทีจากแดชบอร์ด
- **Policy Advisor** ให้คำแนะนำเมื่อเข้าสู่วิกฤต (ความสุขเฉลี่ยต่ำ)
- **ระบบวิกฤต** แจ้งเตือน warning / critical / collapse ตามความสุขเฉลี่ย
- **Replay** เล่นย้อนจากวันที่บันทึกไว้ โดยไม่เรียก LLM และไม่แก้ข้อมูลจริง
- **เศรษฐกิจที่ไม่นิ่ง** ความสุขของแต่ละคนขึ้นกับภาษี บริการ เงินเก็บ โซนที่อยู่ และการมีงาน มีเหตุการณ์สุ่ม (ถดถอย/เฟื่องฟู/ภัยพิบัติ/เงินสนับสนุน) คนตกงานหรือล้มละลายได้ และบริการยิ่งดียิ่งมีค่าใช้จ่าย
- **ควบคุมเมือง** ปรับความเร็ว (10 วินาที–2 นาทีต่อวัน) และเริ่มเมืองใหม่ได้จากหน้าเว็บ
- **ใช้งานง่าย** UI เป็นภาษาไทย (สลับ EN ได้) มีคู่มือกดเปิดดูได้จากปุ่ม “คู่มือ” (เด้งขึ้นเองครั้งแรก) มีสรุปสถานะเมืองเป็นประโยค คำอธิบายตัวเลข และนโยบายแนะนำแบบกดเลือก
- **รูปโปรไฟล์ประชากร** สร้างจากโค้ด (SVG) หน้าตาไม่ซ้ำและคงที่ตาม ID สีหน้าเปลี่ยนตามความสุข (ยิ้ม/เฉย/หน้าบึ้ง) และมีเครื่องประกอบตามอาชีพ เช่น หมวกแรงงาน แว่นครู เนคไทเจ้าของธุรกิจ ไม่พึ่งบริการภายนอก
- **แผนที่ที่ซูมและเต็มจอได้** ซูม (ปุ่ม / Ctrl + ล้อเมาส์ / ดับเบิลคลิก / pinch) ลากเลื่อน โฟกัสกลางเมือง และเต็มจอ รอบเมืองมีแม่น้ำ สะพาน ท่าเรือ โรงเรียน โรงพยาบาล โรงงาน และฟาร์ม ป้ายตัวเลขแสดงจำนวนคนที่ทำงานที่นั่นตามอาชีพจริง
- **เมืองที่มีชีวิต** เวลาในเมืองเดินตามวัน (1 วัน = 1 tick) มีกลางวัน กลางคืน รุ่งเช้าและพลบค่ำ ไฟถนนและหน้าต่างเปิดตอนค่ำ เช้าประชากรเดินทางไปทำงานตามอาชีพจริง (ครู→โรงเรียน แรงงาน→โรงงาน เกษตรกร→ฟาร์ม พนักงานบริการ→ตลาด เจ้าของธุรกิจ/ผู้เชี่ยวชาญ→ใจกลางเมือง คนว่างงาน→สวนสาธารณะ) เย็นกลับบ้าน ขณะที่ไปทำงานจุดบ้านจะจางลง
- **แดชบอร์ดเรียลไทม์** กราฟแนวโน้ม แผนที่เมืองที่ประชากรเคลื่อนที่ข้ามโซนแบบ smooth ฟีดเหตุการณ์ และตัวกรองรายชื่อประชากร

> Replay ทำงานบนสำเนาในหน่วยความจำ ไม่แตะข้อมูลจริง ผลเหมือนเดิมทุกครั้ง (seed ตามวัน) ย้อนดูได้เฉพาะวันที่บันทึกหลังอัปเดตที่เก็บสถานะประชากรไว้ใน snapshot

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
- **1 tick = 1 วันในเกม** ทุก 1 นาทีเป็นค่าเริ่มต้น (ปรับได้ 10 วินาที–2 นาทีจากหน้าเว็บ) ลำดับ: เศรษฐกิจ → ตลาดงาน → ย้ายโซน → ความสุข → เหตุการณ์สุ่ม → บันทึก snapshot → LLM ตอบสนอง

## โครงสร้างโปรเจค

```
backend/
  app/api/          REST endpoints (simulation, policies, citizens, agents, gateway)
  app/simulation/   ตัวเกมหลัก: loop, economy, zones, policy_engine, citizen_ai, agents, gateway
  app/models/       SQLAlchemy models
  alembic/          database migrations
  tests/            pytest (168 เทสต์ รวมการจำลองเมืองระยะยาว 600 วัน)
frontend/app/
  components/       Dashboard, CityMap, StatCards, EventFeed, ...
  lib/              useSimulation (state + socket), api, types, i18n (+ vitest)
scripts/            backup.sh / restore.sh (สำรองและกู้ฐานข้อมูล)
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
- ตารางในฐานข้อมูลถูกสร้างอัตโนมัติตอน startup (`create_all`) ส่วน migration ของ Alembic ตอนนี้ว่างเปล่า คำสั่ง `alembic upgrade head` จึงยังไม่ได้ทำอะไร และถ้าอนาคตเพิ่มคอลัมน์ในตารางที่มีอยู่แล้ว `create_all` จะไม่แก้ตารางเดิมให้ ต้องเขียน migration เอง

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

### อัปเดตเวอร์ชันที่ deploy อยู่

```bash
scripts/deploy.sh      # git pull + build ใหม่ + รอ health check
```

สคริปต์เตือนถ้าใน `~/ai-city.env` ไม่มี `GROQ_API_KEY_*` (ประชากรจะใช้กฎสำรองแทน LLM)

> `docker compose` อ่านเฉพาะไฟล์ `.env` เองโดยอัตโนมัติ ไฟล์ความลับของโปรเจคนี้ (`~/ai-city.env`) ต้องส่งผ่าน `--env-file` เสมอ ถ้าลืม key จะว่างเปล่าแล้ว LLM จะไม่ถูกเรียกโดยไม่มี error ใดๆ ตรวจได้ด้วย `curl http://localhost/api/gateway/status` ต้องเห็น `keys` ไม่ว่าง และ `total_calls` เพิ่มขึ้นเมื่อเมืองเดิน

ไม่มี CD อัตโนมัติ repo นี้เป็น public การให้ GitHub สั่งรันโค้ดบนเครื่องที่บ้าน (self-hosted runner) จึงเสี่ยงโดยไม่จำเป็น อัปเดตด้วยมือผ่านสคริปต์ด้านบนเมื่อต้องการ

### สำรองและกู้ข้อมูล

ข้อมูลเมืองอยู่ใน Docker volume ของ PostgreSQL บนเครื่องเดียว ควรสำรองไว้:

```bash
scripts/backup.sh              # สร้าง backups/aicity-<เวลา>.sql.gz เก็บ 14 ไฟล์ล่าสุด (ตั้ง KEEP=30 เพื่อเก็บมากขึ้น)
scripts/restore.sh backups/aicity-XXXX.sql.gz   # กู้คืน (จะแทนที่ฐานข้อมูลปัจจุบัน)
```

ตั้ง cron ให้สำรองทุกวัน (`crontab -e`):

```
30 3 * * * /path/to/ai-city/scripts/backup.sh >> /path/to/ai-city/backups/backup.log 2>&1
```

ควรคัดลอกโฟลเดอร์ `backups/` ไปเก็บไว้อีกเครื่องหรือ cloud ด้วย เพราะถ้าดิสก์เสีย ไฟล์สำรองบนเครื่องเดียวกันจะหายไปด้วย

## รันเทสต์

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

168 เทสต์ ครอบคลุม economy, zones, gateway, citizen AI, policy engine, agents, replay และการจำลองเมืองระยะยาว (ตรวจว่าเศรษฐกิจไม่พังเป็นสภาพนิ่งตายตัว)

ฝั่ง frontend:

```bash
cd frontend
npx tsc --noEmit && npm run lint && npm test
```

## CI

`.github/workflows/ci.yml` รันเมื่อ push เข้า `develop`/`main` และ PR เข้า `main` ทำ pytest ฝั่ง backend และ type-check + lint + เทสต์ฝั่ง frontend
