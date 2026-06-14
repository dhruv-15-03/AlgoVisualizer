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
});
