import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard; OBO mode will redirect to login if needed.
  redirect('/dashboard');
}
