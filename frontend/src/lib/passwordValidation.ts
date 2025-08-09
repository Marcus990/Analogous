export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasNumber: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const requirements = {
    minLength: password.length >= 6,
    hasNumber: /\d/.test(password),
  };

  if (!requirements.minLength) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!requirements.hasNumber) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: requirements.minLength && requirements.hasNumber,
    errors,
    requirements,
  };
}

export function getPasswordValidationMessage(password: string): string | null {
  if (!password) return null;
  
  const validation = validatePassword(password);
  
  if (validation.isValid) {
    return "Password meets all requirements";
  }
  
  return validation.errors.join(", ");
} 