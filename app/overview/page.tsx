import { redirect } from 'next/navigation';

/** Legacy route — strategy overview lives at /strategy */
export default function OverviewRedirect() {
  redirect('/strategy');
}
