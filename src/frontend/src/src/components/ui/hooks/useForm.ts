import { useState, useCallback, useMemo } from 'react';
import { UseFormReturn } from '../types';

interface UseFormOptions {
  defaultValues?: Record<string, any>;
  validationSchema?: any;
}

interface ValidationError {
  [key: string]: string;
}

const validateField = (
  value: any,
  rules?: Record<string, any>
): string | null => {
  if (!rules) return null;

  if (rules.required && !value) {
    return 'This field is required';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be at most ${rules.maxLength} characters`;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }

  if (rules.validate) {
    const result = rules.validate(value);
    if (typeof result === 'string') {
      return result;
    }
  }

  return null;
};

export const useForm = ({
  defaultValues = {},
  validationSchema,
}: UseFormOptions = {}): UseFormReturn => {
  const [values, setValues] = useState<Record<string, any>>(defaultValues);
  const [errors, setErrors] = useState<ValidationError>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = useCallback(() => {
    if (!validationSchema) return {};

    const newErrors: ValidationError = {};
    Object.keys(validationSchema).forEach((field) => {
      const value = values[field];
      const fieldRules = validationSchema[field];
      const error = validateField(value, fieldRules);
      if (error) {
        newErrors[field] = error;
      }
    });

    return newErrors;
  }, [values, validationSchema]);

  const handleChange = useCallback((name: string) => (value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    if (validationSchema?.[name]) {
      const error = validateField(value, validationSchema[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    }
  }, [validationSchema]);

  const handleBlur = useCallback((name: string) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (validationSchema?.[name]) {
      const value = values[name];
      const error = validateField(value, validationSchema[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    }
  }, [validationSchema, values]);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    if (validationSchema?.[name]) {
      const error = validateField(value, validationSchema[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    }
  }, [validationSchema]);

  const reset = useCallback(() => {
    setValues(defaultValues);
    setErrors({});
    setTouched({});
  }, [defaultValues]);

  const isValid = useMemo(() => {
    const formErrors = validateForm();
    return Object.keys(formErrors).length === 0;
  }, [validateForm]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();
    setErrors(formErrors);
    setTouched(
      Object.keys(values).reduce((acc, key) => ({
        ...acc,
        [key]: true,
      }), {})
    );
  }, [validateForm, values]);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    reset,
  };
}; 