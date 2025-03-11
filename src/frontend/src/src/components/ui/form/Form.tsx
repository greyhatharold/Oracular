import React, { createContext, useContext, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { FormProps, UseFormReturn } from '../types';
import { useForm } from '../hooks/useForm';

const FormContext = createContext<UseFormReturn | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

const StyledForm = styled('form')({
  width: '100%',
});

const Form: React.FC<FormProps> = ({
  onSubmit,
  defaultValues = {},
  validationSchema,
  children,
  className,
  style,
}) => {
  const form = useForm({
    defaultValues,
    validationSchema,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (form.isValid) {
        onSubmit(form.values);
      }
    },
    [form.isValid, form.values, onSubmit]
  );

  return (
    <FormContext.Provider value={form}>
      <StyledForm
        onSubmit={handleSubmit}
        className={className}
        style={style}
        noValidate
      >
        <Box display="flex" flexDirection="column" gap={2}>
          {children}
        </Box>
      </StyledForm>
    </FormContext.Provider>
  );
};

export default Form; 