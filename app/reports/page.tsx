import { redirect } from 'next/navigation';

/** Public /reports removed — staff use /staff/reports */
export default function ReportsRedirect() {
  redirect('/strategy');
}
