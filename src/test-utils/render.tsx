import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

// Expand this wrapper as providers (i18n, query, theme) come online in Tasks 10/11/13.
function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
export { customRender as render };
