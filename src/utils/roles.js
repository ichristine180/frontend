export const ADMIN_ROLES = ['ADMIN', 'REVIEWER', 'APPROVER']

export const ROLE_LABELS = {
  APPLICANT: 'Applicant',
  REVIEWER:  'Reviewer',
  APPROVER:  'Approver',
  ADMIN:     'Administrator',
}

export function getRoleHomePath(role) {
  if (ADMIN_ROLES.includes(role)) return '/admin'
  return '/dashboard'
}

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role)
}
