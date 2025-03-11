import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentCopyOutlined';
import ExplorerIcon from '@mui/icons-material/OpenInNewOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import { AddressDisplayProps } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../constants';

const Container = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: theme.palette.mode === 'light' 
    ? COLORS.gray[100] 
    : COLORS.gray[800],
  borderRadius: 8,
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  transition: `all ${ANIMATION.duration.short}ms ${ANIMATION.easing.easeInOut}`,
}));

const Address = styled(Typography)(({ theme }) => ({
  fontFamily: TYPOGRAPHY.fontFamily.mono,
  fontSize: TYPOGRAPHY.size.sm,
  color: theme.palette.mode === 'light' 
    ? COLORS.gray[900] 
    : COLORS.gray[100],
  marginRight: SPACING.xs,
}));

const ActionButton = styled(IconButton)({
  padding: SPACING.xxs,
  '& svg': {
    fontSize: 16,
  },
});

const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  ensName,
  showCopy = true,
  showExplorer = true,
  truncate = true,
  className,
  style,
}) => {
  const [copied, setCopied] = useState(false);
  const displayAddress = truncate ? truncateAddress(address) : address;
  const displayText = ensName || displayAddress;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleExplorer = () => {
    const explorerUrl = `https://etherscan.io/address/${address}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Container className={className} style={style}>
      <Tooltip 
        title={ensName ? address : ''} 
        placement="top"
        arrow
      >
        <Address variant="body2">
          {displayText}
        </Address>
      </Tooltip>

      {showCopy && (
        <Tooltip 
          title={copied ? 'Copied!' : 'Copy address'} 
          placement="top"
          arrow
        >
          <ActionButton
            onClick={handleCopy}
            size="small"
            color={copied ? 'success' : 'default'}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </ActionButton>
        </Tooltip>
      )}

      {showExplorer && (
        <Tooltip 
          title="View on Etherscan" 
          placement="top"
          arrow
        >
          <ActionButton
            onClick={handleExplorer}
            size="small"
          >
            <ExplorerIcon />
          </ActionButton>
        </Tooltip>
      )}
    </Container>
  );
};

export default AddressDisplay; 