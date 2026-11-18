import { redirect } from 'next/navigation';

/** Legacy route — combined at /project-overview */
export default function ThailandMapRedirect() {
  redirect('/project-overview');
}
