import { redirect } from 'next/navigation';

/** Legacy route — combined project overview */
export default function OverviewRedirect() {
  redirect('/project-overview');
}
