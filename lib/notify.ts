import { sendMdAlert, sendUserAlert } from "./email";

export function notifyBillSubmitted(bill: {
  title: string;
  amount: number;
  category: string;
  submitter_name: string;
  created_at: string;
}) {
  const html = `
    <h2>New Bill Submitted</h2>
    <div class="card pending">
      <div class="label">Bill Title</div>
      <div class="value">${esc(bill.title)}</div>
      <div style="margin-top: 12px;">
        <div class="label">Amount</div>
        <div class="amount">₹${bill.amount.toLocaleString("en-IN")}</div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Submitted By</div><div class="value">${esc(bill.submitter_name)}</div></div>
        <div><div class="label">Category</div><div class="value">${esc(bill.category || "—")}</div></div>
      </div>
    </div>
    <p style="color:#666;">This bill is awaiting approval. Log in to Etidhi Work OS to review.</p>
  `;
  sendMdAlert(`💰 New Bill: "${bill.title}" — ₹${bill.amount} by ${bill.submitter_name}`, html);
}

export function notifyBillApproved(bill: {
  title: string;
  amount: number;
  submitter_name: string;
  approver_name: string;
  ref_no: string;
}) {
  const html = `
    <h2>Bill Approved & Reimbursed</h2>
    <div class="card success">
      <div class="label">Bill Title</div>
      <div class="value">${esc(bill.title)}</div>
      <div style="margin-top: 12px;">
        <div class="label">Amount Reimbursed</div>
        <div class="amount">₹${bill.amount.toLocaleString("en-IN")}</div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Submitted By</div><div class="value">${esc(bill.submitter_name)}</div></div>
        <div><div class="label">Approved By</div><div class="value">${esc(bill.approver_name)}</div></div>
      </div>
      <div style="margin-top: 12px;">
        <div class="label">Reference No</div>
        <div class="value">${esc(bill.ref_no)}</div>
      </div>
    </div>
  `;
  sendMdAlert(`✅ Bill Approved: "${bill.title}" — ₹${bill.amount}`, html);
}

export function notifyBillRejected(bill: {
  title: string;
  amount: number;
  submitter_name: string;
  approver_name: string;
  reason: string;
}) {
  const html = `
    <h2>Bill Rejected</h2>
    <div class="card warning">
      <div class="label">Bill Title</div>
      <div class="value">${esc(bill.title)}</div>
      <div style="margin-top: 12px;">
        <div class="label">Amount</div>
        <div class="amount">₹${bill.amount.toLocaleString("en-IN")}</div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Submitted By</div><div class="value">${esc(bill.submitter_name)}</div></div>
        <div><div class="label">Rejected By</div><div class="value">${esc(bill.approver_name)}</div></div>
      </div>
      ${bill.reason ? `<div style="margin-top: 12px;"><div class="label">Reason</div><div class="value">${esc(bill.reason)}</div></div>` : ""}
    </div>
  `;
  sendMdAlert(`❌ Bill Rejected: "${bill.title}" — ₹${bill.amount}`, html);
}

export function notifyItemStuck(item: {
  name: string;
  board_name: string;
  assignee_name: string | null;
  changed_by: string;
}) {
  const html = `
    <h2>Item Marked as Stuck</h2>
    <div class="card warning">
      <div class="label">Item</div>
      <div class="value">${esc(item.name)}</div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Board</div><div class="value">${esc(item.board_name)}</div></div>
        <div><div class="label">Assigned To</div><div class="value">${esc(item.assignee_name || "Unassigned")}</div></div>
      </div>
      <div style="margin-top: 12px;">
        <div class="label">Changed By</div>
        <div class="value">${esc(item.changed_by)}</div>
      </div>
    </div>
    <p style="color:#666;">This item may need attention. Log in to Etidhi Work OS to review.</p>
  `;
  sendMdAlert(`🚨 Stuck: "${item.name}" on ${item.board_name}`, html);
}

export function notifyItemCritical(item: {
  name: string;
  board_name: string;
  assignee_name: string | null;
  changed_by: string;
}) {
  const html = `
    <h2>Item Set to Critical Priority</h2>
    <div class="card warning">
      <div class="label">Item</div>
      <div class="value">${esc(item.name)}</div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Board</div><div class="value">${esc(item.board_name)}</div></div>
        <div><div class="label">Assigned To</div><div class="value">${esc(item.assignee_name || "Unassigned")}</div></div>
      </div>
      <div style="margin-top: 12px;">
        <div class="label">Changed By</div>
        <div class="value">${esc(item.changed_by)}</div>
      </div>
    </div>
    <p style="color:#666;">This item has been escalated to Critical priority.</p>
  `;
  sendMdAlert(`🔴 Critical: "${item.name}" on ${item.board_name}`, html);
}

export function notifyNewBoard(board: { name: string; category: string; created_by: string }) {
  const html = `
    <h2>New Board Created</h2>
    <div class="card">
      <div style="display: flex; gap: 24px;">
        <div><div class="label">Board Name</div><div class="value">${esc(board.name)}</div></div>
        <div><div class="label">Category</div><div class="value">${esc(board.category)}</div></div>
      </div>
      <div style="margin-top: 12px;">
        <div class="label">Created By</div>
        <div class="value">${esc(board.created_by)}</div>
      </div>
    </div>
  `;
  sendMdAlert(`📋 New Board: "${board.name}" created by ${board.created_by}`, html);
}

export function notifyPasswordResetRequest(user: { name: string; email: string }) {
  const html = `
    <h2>Password Reset Requested</h2>
    <div class="card pending">
      <div style="display: flex; gap: 24px;">
        <div><div class="label">User</div><div class="value">${esc(user.name)}</div></div>
        <div><div class="label">Email</div><div class="value">${esc(user.email)}</div></div>
      </div>
    </div>
    <p style="color:#666;">This request needs admin approval. Log in to the Team page to review.</p>
  `;
  sendMdAlert(`🔑 Password Reset Request from ${user.name}`, html);
}

export function notifyItemAssigned(item: {
  name: string;
  board_name: string;
  assignee_email: string;
  assignee_name: string;
  assigned_by: string;
  status: string;
  priority: string;
  due_date: string | null;
}) {
  const html = `
    <h2>You've been assigned a task</h2>
    <div class="card">
      <div class="label">Item</div>
      <div class="value">${esc(item.name)}</div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Board</div><div class="value">${esc(item.board_name)}</div></div>
        <div><div class="label">Assigned By</div><div class="value">${esc(item.assigned_by)}</div></div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Status</div><div class="value">${esc(item.status)}</div></div>
        <div><div class="label">Priority</div><div class="value">${esc(item.priority)}</div></div>
        <div><div class="label">Due Date</div><div class="value">${esc(item.due_date || "No due date")}</div></div>
      </div>
    </div>
    <p style="color:#666;">Log in to Etidhi Work OS to view this task.</p>
  `;
  sendUserAlert(
    item.assignee_email,
    `📌 Task Assigned: "${item.name}" on ${item.board_name}`,
    html
  );
}

export function notifyBillApproverAssigned(bill: {
  title: string;
  amount: number;
  category: string;
  submitter_name: string;
  approver_email: string;
  approver_name: string;
  assigned_by: string;
}) {
  const html = `
    <h2>Bill assigned to you for approval</h2>
    <div class="card pending">
      <div class="label">Bill Title</div>
      <div class="value">${esc(bill.title)}</div>
      <div style="margin-top: 12px;">
        <div class="label">Amount</div>
        <div class="amount">₹${bill.amount.toLocaleString("en-IN")}</div>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 24px;">
        <div><div class="label">Submitted By</div><div class="value">${esc(bill.submitter_name)}</div></div>
        <div><div class="label">Category</div><div class="value">${esc(bill.category || "—")}</div></div>
      </div>
      <div style="margin-top: 12px;">
        <div class="label">Assigned By</div>
        <div class="value">${esc(bill.assigned_by)}</div>
      </div>
    </div>
    <p style="color:#666;">Please log in to Etidhi Work OS to approve or reject this bill.</p>
  `;
  sendUserAlert(
    bill.approver_email,
    `💰 Bill Awaiting Your Approval: "${bill.title}" — ₹${bill.amount}`,
    html
  );
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
