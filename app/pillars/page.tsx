import { redirect } from 'next/navigation';

/** Legacy route — combined at /project-overview */
export default function PillarsRedirect() {
  redirect('/project-overview');
}
