import React from 'react';
import { styled } from '@mui/material/styles';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  Input,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  SelectChangeEvent,
} from '@mui/material';
import { FormFieldProps } from '../types';
import { useFormContext } from './Form';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  width: '100%',
  marginBottom: SPACING.md,
}));

const StyledHelperText = styled(FormHelperText)(({ theme }) => ({
  marginLeft: 0,
  fontSize: TYPOGRAPHY.size.xs,
  color: theme.palette.error.main,
}));

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  rules,
  defaultValue,
  children,
  className,
  style,
}) => {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
  } = useFormContext();

  const value = values[name] ?? defaultValue ?? '';
  const error = touched[name] && errors[name];
  const isError = !!error;

  const handleTextFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    handleChange(name)(event.target.value);
  };

  const handleSelectChange = (event: SelectChangeEvent<unknown>) => {
    handleChange(name)(event.target.value);
  };

  const handleCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleChange(name)(event.target.checked);
  };

  const handleFieldBlur = () => {
    handleBlur(name)();
  };

  const renderField = () => {
    switch (type) {
      case 'select':
        return (
          <Select
            value={value}
            onChange={handleSelectChange}
            onBlur={handleFieldBlur}
            error={isError}
            fullWidth
          >
            {children}
          </Select>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={handleCheckboxChange}
                onBlur={handleFieldBlur}
                color="primary"
              />
            }
            label={label}
          />
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onChange={handleTextFieldChange}
            onBlur={handleFieldBlur}
          >
            {children}
          </RadioGroup>
        );

      case 'textarea':
        return (
          <TextField
            multiline
            rows={4}
            value={value}
            onChange={handleTextFieldChange}
            onBlur={handleFieldBlur}
            error={isError}
            label={label}
            fullWidth
          />
        );

      case 'password':
        return (
          <TextField
            type="password"
            value={value}
            onChange={handleTextFieldChange}
            onBlur={handleFieldBlur}
            error={isError}
            label={label}
            fullWidth
          />
        );

      default:
        return (
          <TextField
            type={type}
            value={value}
            onChange={handleTextFieldChange}
            onBlur={handleFieldBlur}
            error={isError}
            label={label}
            fullWidth
          />
        );
    }
  };

  return (
    <StyledFormControl
      error={isError}
      className={className}
      style={style}
    >
      {type !== 'checkbox' && label && type !== 'textarea' && (
        <InputLabel error={isError}>{label}</InputLabel>
      )}
      {renderField()}
      {isError && (
        <StyledHelperText>{error}</StyledHelperText>
      )}
    </StyledFormControl>
  );
};

export default FormField; 