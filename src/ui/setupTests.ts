import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when its own globals are enabled. This suite
// does not enable vitest globals, so without this every render stays in the
// document and a later getByLabelText can resolve to a previous test's element.
afterEach(cleanup);
