import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from '@/components/ui/Select';

describe('Select · disabled options', () => {
  it('renders disabled options (flat) as natively disabled with a tooltip', () => {
    render(
      <Select
        aria-label="pick"
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta', disabled: true, title: 'why not' },
        ]}
      />,
    );
    const alpha = screen.getByRole('option', { name: 'Alpha' }) as HTMLOptionElement;
    const beta = screen.getByRole('option', { name: 'Beta' }) as HTMLOptionElement;
    expect(alpha.disabled).toBe(false);
    expect(beta.disabled).toBe(true);
    expect(beta.title).toBe('why not');
  });

  it('renders disabled options inside groups', () => {
    render(
      <Select
        aria-label="pick"
        value="a"
        onChange={() => {}}
        groups={[
          { label: 'G1', options: [{ value: 'a', label: 'Alpha' }] },
          { label: 'G2', options: [{ value: 'b', label: 'Beta', disabled: true }] },
        ]}
      />,
    );
    const beta = screen.getByRole('option', { name: 'Beta' }) as HTMLOptionElement;
    expect(beta.disabled).toBe(true);
  });

  // Guards Bug 1: a long algorithm name like "Logistic Regression (Gradient
  // Descent)" must clip inside the control instead of spilling into the
  // neighbouring Data selector. jsdom can't measure layout, so we assert the
  // CSS clipping mechanism (truncate + max-w-full) is present on the control.
  it('clips an overflowing label to its box (no spill)', () => {
    render(
      <Select
        aria-label="Algorithm"
        value="logreg"
        onChange={() => {}}
        options={[{ value: 'logreg', label: 'Logistic Regression (Gradient Descent)' }]}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Algorithm' });
    expect(select.className).toContain('truncate');
    expect(select.className).toContain('max-w-full');
  });
});
