/** Citizen's Charter content — editable by admin, stored as one JSON setting. */
export interface CharterService {
  service: string;
  requirement: string;
  client: string;
  officer: string;
  steps: string[];
  fees: string;
  processingTime: string;
  form: string;
}

export interface CharterContent {
  vision: string;
  mission: string;
  email: string;
  address: string;
  services: CharterService[];
}
