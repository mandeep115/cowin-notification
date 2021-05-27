export type vaccine = "COVISHIELD" | "COVAXIN";
export type feeType = "Free" | "Paid";

export interface user {
  userName: string;
  phone: string;
  preferences: {
    min_age_limit: number;
    fee_type: feeType;
    vaccine: vaccine;
  };
}

export interface data_findVaccine {
  user: user;
  pincode: number;
  district: number;
}

export interface session {
  session_id: string;
  date: string;
  available_capacity: number;
  min_age_limit: number;
  vaccine: vaccine;
  slots: string[];
}

export interface Center {
  center_id: number;
  name: string;
  address: string;
  state_name: string;
  district_name: string;
  block_name: string;
  pincode: number;
  lat: number;
  long: number;
  from: string;
  to: string;
  fee_type: feeType;
  sessions: session[];
}
