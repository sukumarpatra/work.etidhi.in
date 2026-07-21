export type Board = {
  id: number;
  name: string;
  description: string;
  color: string;
  created_by: number;
  category: string;
  created_at: string;
  item_count?: number;
  done_count?: number;
  creator_name?: string;
};

export type Group = {
  id: number;
  board_id: number;
  name: string;
  color: string;
  position: number;
};

export type Item = {
  id: number;
  board_id: number;
  group_id: number;
  name: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  title: string;
};

export type Bill = {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  category: string;
  photo_path: string;
  photo_mime: string;
  status: "Pending" | "Reimbursed" | "Rejected";
  approver_id: number | null;
  reject_reason: string;
  ref_no: string | null;
  created_at: string;
  decided_at: string | null;
  acknowledged_at: string | null;
  submitter_name: string;
  approver_name: string | null;
};

export type ActivityRow = {
  id: number;
  board_id: number | null;
  item_id: number | null;
  user_id: number;
  user_name: string;
  action: string;
  detail: string;
  created_at: string;
};
