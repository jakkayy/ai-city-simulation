export interface Citizen {
  id: string
  name: string
  zone: "A" | "B" | "C"
  happiness: number
  savings: number
  job_type: string
  last_action: string
  pending_reaction: boolean
}

export interface SimEvent {
  citizen_id: string
  event_type: string
  narrative: string
  happiness_delta: number
  // structured details sent by newer backends, used to translate the narrative
  data?: Record<string, string | number>
}

export interface TickData {
  day: number
  avg_happiness: number
  city_fund: number
  service_quality: number
  tax_rate: number
  crisis_level: "warning" | "critical" | "collapse" | null
  zone_populations: { A: number; B: number; C: number }
  citizens: Citizen[]
  events: SimEvent[]
}

export interface SimStatus {
  is_running: boolean
  replay_mode: boolean
  simulation_day: number
  city_fund: number
  service_quality: number
  tax_rate: number
  tick_interval_seconds: number
}

export interface DailySnapshot {
  simulation_day: number
  avg_happiness: number
  city_fund: number
  service_quality: number
}

export interface GatewayKeyStatus {
  alias: string
  requests_today: number
  tokens_today: number
  fallback_calls: number
  budget_remaining: number
  available: boolean
}

export interface GatewayStatus {
  queue_depth: number
  total_calls: number
  total_fallbacks: number
  keys: GatewayKeyStatus[]
}

export type PolicyType =
  | "tax_increase"
  | "tax_decrease"
  | "service_boost"
  | "service_cut"
  | "housing"
  | "job_program"

export interface PolicyResponse {
  id: string
  name: string
  policy_type: PolicyType
  enacted_day: number
  parameters: Record<string, unknown>
  predicted_effects: Record<string, unknown>
  actual_effects: Record<string, unknown> | null
  narrative: string
}

export interface EventItem extends SimEvent {
  uid: number
  day: number
}

export interface HistoryPoint {
  day: number
  happiness: number
  fund: number
  service: number
}

export interface CityManagerProposal {
  policy_type: string
  parameters: Record<string, unknown>
  reasoning?: string
  reason?: string
}

export interface AdvisorMessage {
  crisis_level: string
  advice: string
}
