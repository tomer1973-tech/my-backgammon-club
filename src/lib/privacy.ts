export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 1)}***@${domain}`
}
