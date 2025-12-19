export interface Employee {
  id: string;
  name: string;
  wallet_address: string;
}

export interface PayrollItem {
  id: string;
  amount_usdc: number;
  status: 'pending' | 'paid' | 'failed';
  tx_hash: string | null;
  created_at: string;
  employees: Employee | Employee[] | null;
}
