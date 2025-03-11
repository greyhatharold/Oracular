import React, { useState, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import { DataTableProps } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light'
    ? COLORS.light.background.primary
    : COLORS.dark.background.primary,
  borderRadius: 8,
  boxShadow: 'none',
  border: `1px solid ${theme.palette.mode === 'light'
    ? COLORS.light.divider
    : COLORS.dark.divider}`,
}));

const StyledTable = styled(Table)({
  minWidth: 650,
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontFamily: TYPOGRAPHY.fontFamily.primary,
  fontSize: TYPOGRAPHY.size.sm,
  padding: SPACING.md,
  color: theme.palette.mode === 'light'
    ? COLORS.light.text.primary
    : COLORS.dark.text.primary,
  borderBottom: `1px solid ${theme.palette.mode === 'light'
    ? COLORS.light.divider
    : COLORS.dark.divider}`,
}));

const StyledHeaderCell = styled(StyledTableCell)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light'
    ? COLORS.gray[50]
    : COLORS.gray[900],
  fontWeight: TYPOGRAPHY.weight.medium,
}));

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  zIndex: 1,
});

const EmptyState = styled(Box)({
  padding: SPACING.xl,
  textAlign: 'center',
  color: COLORS.gray[500],
});

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  pagination = true,
  rowsPerPage: defaultRowsPerPage = 10,
  onSort,
  onRowClick,
  className,
  style,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (field: string) => {
    const direction = sortConfig?.field === field && sortConfig.direction === 'asc'
      ? 'desc'
      : 'asc';
    
    setSortConfig({ field, direction });
    if (onSort) {
      onSort(field, direction);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (row: Record<string, any>) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const displayData = useMemo(() => {
    if (!pagination) return data;
    
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, page, rowsPerPage, pagination]);

  return (
    <Box position="relative" className={className} style={style}>
      <StyledTableContainer>
        {loading && (
          <LoadingOverlay>
            <CircularProgress />
          </LoadingOverlay>
        )}
        
        <StyledTable>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledHeaderCell
                  key={column.id}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortConfig?.field === column.id}
                      direction={sortConfig?.field === column.id
                        ? sortConfig.direction
                        : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </StyledHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {displayData.length > 0 ? (
              displayData.map((row, index) => (
                <TableRow
                  key={index}
                  hover={!!onRowClick}
                  onClick={() => handleRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => (
                    <StyledTableCell key={column.id}>
                      {column.render
                        ? column.render(row[column.id], row)
                        : row[column.id]}
                    </StyledTableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <StyledTableCell colSpan={columns.length}>
                  <EmptyState>
                    <Typography variant="body1" color="textSecondary">
                      No data available
                    </Typography>
                  </EmptyState>
                </StyledTableCell>
              </TableRow>
            )}
          </TableBody>
        </StyledTable>

        {pagination && data.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </StyledTableContainer>
    </Box>
  );
};

export default DataTable; 