import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard (which will redirect to login if not authenticated)
  redirect('/dashboard');
}
