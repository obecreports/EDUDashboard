import { redirect } from 'next/navigation';

/** Staff reports hub (staff-only via middleware /staff prefix) */
export default function StaffReportsPage() {
  redirect('/strategy');
}
