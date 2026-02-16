export type RiskStatus = 'identified' | 'mitigating' | 'mitigated' | 'accepted';
export type RiskImpact = 'low' | 'medium' | 'high';

export interface Decision {
  id: string;
  question: string;
  options?: string[];
  choice: string;
  rationale: string;
  timestamp: string;
}

export interface Risk {
  id: string;
  risk: string;
  impact: RiskImpact;
  mitigation: string;
  status: RiskStatus;
  identifiedAt: string;
}

export function createDecision(id: string, question: string, choice: string, rationale: string, options?: string[]): Decision {
  return {
    id,
    question,
    options,
    choice,
    rationale,
    timestamp: new Date().toISOString()
  };
}

export function createRisk(id: string, risk: string, impact: RiskImpact, mitigation?: string): Risk {
  return {
    id,
    risk,
    impact,
    mitigation: mitigation || '',
    status: 'identified',
    identifiedAt: new Date().toISOString()
  };
}
