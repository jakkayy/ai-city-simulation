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

# Tuned so that at the default 15 % tax a typical citizen earns a small surplus in
# their zone; raise taxes or lose a job and they start to slide.
DAILY_RENT: dict[Zone, float] = {
    Zone.A: 120,
    Zone.B: 70,
    Zone.C: 45,
}

DAILY_LIVING_EXPENSES: dict[Zone, float] = {
    Zone.A: 75,
    Zone.B: 40,
    Zone.C: 30,
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

# city running cost per day = base + per-point cost of the current service quality,
# so a city that keeps services at 100 must actually pay for them
CITY_BASE_OVERHEAD = 350.0
CITY_SERVICE_COST_PER_POINT = 12.0

# service quality changes per day
FUND_RESERVE = 2_000.0            # quality only recovers while the fund is above this
SERVICE_QUALITY_RECOVERY = 1.0    # fund > FUND_RESERVE
SERVICE_QUALITY_SLOW_DECAY = 0.3  # 0 < fund <= FUND_RESERVE (services wear out)
SERVICE_QUALITY_DECAY = 2.0       # fund <= 0

# one-off policy costs / savings
SERVICE_POLICY_COST_PER_POINT = 100.0   # service_boost: fund cost per quality point
SERVICE_CUT_SAVING_PER_POINT = 50.0     # service_cut: fund saved per quality point
HOUSING_SUBSIDY_SHARE = 0.6             # share of housing budget paid out to Zone C residents

# wealthy citizens spend: daily spending = (savings - threshold) * rate
WEALTH_SPENDING_THRESHOLD = 10_000.0
WEALTH_SPENDING_RATE = 0.005

# savings below SAVINGS_FLOOR * this factor → bankruptcy (debt is written off)
BANKRUPTCY_FACTOR = 1.5

# daily chance an employed citizen loses their job
JOB_LOSS_CHANCE = 0.004

# daily chance of a random city-wide event (recession, boom, disaster, grant)
CITY_EVENT_CHANCE = 0.04

# happiness drifts toward a target each day by this fraction of the gap
HAPPINESS_DRIFT_RATE = 0.15
HAPPINESS_BASE = 55.0

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
