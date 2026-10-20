import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

function Controls() {
  const { open, setOpen } = useSidebar();
  return <button onClick={() => setOpen(!open)}>{open ? 'Expanded' : 'Collapsed'}</button>;
}

afterEach(() => {
  document.cookie = 'sidebar_state=; max-age=0; path=/';
});

it('restores the saved preference and persists toggles', () => {
  document.cookie = 'sidebar_state=false; path=/';
  render(
    <SidebarProvider>
      <Controls />
    </SidebarProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Collapsed' }));
  expect(screen.getByRole('button', { name: 'Expanded' })).toBeInTheDocument();
  expect(document.cookie).toContain('sidebar_state=true');
});

it('follows controlled prop changes', () => {
  const { rerender } = render(
    <SidebarProvider open={false}>
      <Controls />
    </SidebarProvider>
  );
  expect(screen.getByRole('button', { name: 'Collapsed' })).toBeInTheDocument();
  rerender(
    <SidebarProvider open>
      <Controls />
    </SidebarProvider>
  );
  expect(screen.getByRole('button', { name: 'Expanded' })).toBeInTheDocument();
});
