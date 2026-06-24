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
}

export interface DailySnapshot {
  simulation_day: number
  avg_happiness: number
  city_fund: number
  service_quality: number
}
