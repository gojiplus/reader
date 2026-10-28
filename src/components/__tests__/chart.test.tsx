import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart';

vi.mock('recharts', async importOriginal => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
}));

const config = { pages: { label: 'Pages read', color: '#123456' } };
const payload = [
  {
    graphicalItemId: 'pages',
    name: 'pages',
    dataKey: 'pages',
    value: 0,
    color: '#123456',
    payload: {},
  },
];

it('renders light and dark chart colors without interpreting styles as HTML', () => {
  const markup = renderToStaticMarkup(
    <ChartContainer
      id='reading'
      config={{
        pages: { theme: { light: '#123456', dark: '#abcdef' } },
        unsafe: { color: 'red;</style><script>alert(1)</script>' },
      }}
    >
      <div />
    </ChartContainer>
  );
  const document = new DOMParser().parseFromString(markup, 'text/html');
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('style')?.textContent).toContain('--color-pages: #123456');
  expect(document.querySelector('style')?.textContent).toContain('--color-pages: #abcdef');
  expect(document.querySelector('style')?.textContent).toContain(
    '.dark [data-chart=chart-reading]'
  );
});

it('renders a configured tooltip label and a formatted zero value', () => {
  render(
    <ChartContainer config={config}>
      <ChartTooltipContent active payload={payload} label='Monday' />
    </ChartContainer>
  );
  expect(screen.getByText('Monday')).toBeInTheDocument();
  expect(screen.getByText('Pages read')).toBeInTheDocument();
  expect(screen.getByText('0')).toHaveClass('tabular-nums');
});

it('passes the complete tooltip payload to custom formatters', () => {
  const formatter = vi.fn(() => 'Custom value');
  render(
    <ChartContainer config={config}>
      <ChartTooltipContent active payload={payload} formatter={formatter} />
    </ChartContainer>
  );
  expect(formatter).toHaveBeenCalledWith(0, 'pages', payload[0], 0, payload);
  expect(screen.getByText('Custom value')).toBeInTheDocument();
});

it('renders custom legend entries from the content payload', () => {
  render(
    <ChartContainer config={config}>
      <ChartLegendContent payload={[{ value: 'pages', dataKey: 'pages', color: '#123456' }]} />
    </ChartContainer>
  );
  expect(screen.getByText('Pages read')).toBeInTheDocument();
});
