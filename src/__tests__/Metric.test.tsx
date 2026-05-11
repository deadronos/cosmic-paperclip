import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Metric from '@/components/Metric';

describe('Metric', () => {
  it('displays a label and formatted value', () => {
    render(<Metric label="Clips" value="42" />);
    expect(screen.getByText('Clips')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });
});