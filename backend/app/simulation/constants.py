from app.models.citizen import JobType, Zone

DAILY_INCOME: dict[JobType, float] = {
    JobType.business_owner: 500,
    JobType.professional: 300,
    JobType.teacher: 200,
    JobType.service_worker: 150,
    JobType.laborer: 100,
    JobType.farmer: 120,
    JobType.unemployed: 0,
}

DAILY_RENT: dict[Zone, float] = {
    Zone.A: 200,
    Zone.B: 120,
    Zone.C: 60,
}

DAILY_LIVING_EXPENSES: dict[Zone, float] = {
    Zone.A: 100,
    Zone.B: 60,
    Zone.C: 40,
}

ZONE_CAPACITY: dict[Zone, int] = {
    Zone.A: 15,
    Zone.B: 20,
    Zone.C: 30,
}

ZONE_HAPPINESS_MODIFIER: dict[Zone, float] = {
    Zone.A: 10.0,
    Zone.B: 0.0,
    Zone.C: -10.0,
}

TAX_CAP = 0.60
DEFAULT_TAX_RATE = 0.15
DEFAULT_SERVICE_QUALITY = 70.0

# city overhead deducted from fund every day
CITY_DAILY_OVERHEAD = 500.0

# service quality changes per day
SERVICE_QUALITY_RECOVERY = 1.0   # when city_fund > 0
SERVICE_QUALITY_DECAY = 2.0      # when city_fund <= 0

# savings < -(SAVINGS_FLOOR_MONTHS * daily_rent * 30) → force migrate
SAVINGS_FLOOR_MONTHS = 3

# 5% chance per day for unemployed to find laborer work
JOB_RECOVERY_CHANCE = 0.05

# happiness thresholds for city crisis levels
CRISIS_THRESHOLDS = {
    "warning": 35.0,
    "critical": 20.0,
    "collapse": 10.0,
}

# days before a citizen can migrate again after moving
ZONE_LOCK_DAYS = 30
