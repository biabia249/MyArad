export type Values = { fullName: string; username: string; email: string; password: string; confirmPassword: string; identifier: string };
export type Errors = Partial<Record<keyof Values, string>>;
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function validate(values: Values, signup: boolean): Errors {
  const errors: Errors = {};
  if (signup) {
    if (!values.fullName.trim()) errors.fullName = 'Enter your full name.';
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(values.username.trim())) errors.username = 'Use 3–30 letters, numbers, or underscores.';
    if (!validEmail(values.email)) errors.email = 'Enter a valid email address.';
    if (values.password.length < 8 || values.password.length > 128) errors.password = 'Use 8–128 characters.';
    if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  } else {
    if (!values.identifier.trim()) errors.identifier = 'Enter your username or email.';
    if (!values.password) errors.password = 'Enter your password.';
  }
  return errors;
}
