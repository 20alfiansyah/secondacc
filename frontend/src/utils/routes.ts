/** Path halaman tujuan setelah login, berdasarkan role user. */
export function homePathForRole(role: string): string {
  if (role === 'ADMIN' || role === 'INVENTORY') return '/dashboard'
  return '/pos'
}
