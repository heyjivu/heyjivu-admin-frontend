import { strFromU8, unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadXlsx } from './xlsx-export';

describe('downloadXlsx', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a valid workbook package with headers and user rows', async () => {
    let workbookBlob: Blob | undefined;
    const click = vi.fn();
    vi.stubGlobal('document', {
      createElement: () => ({ href: '', download: '', click })
    });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      workbookBlob = blob as Blob;
      return 'blob:test-workbook';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    downloadXlsx('users.xlsx', 'Users', ['User name', 'Email'], [
      ['Umer Farooq', 'umer@example.test']
    ]);

    expect(click).toHaveBeenCalledOnce();
    expect(workbookBlob).toBeDefined();
    const archive = unzipSync(new Uint8Array(await workbookBlob!.arrayBuffer()));
    expect(Object.keys(archive)).toContain('xl/worksheets/sheet1.xml');
    expect(Object.keys(archive)).toContain('xl/workbook.xml');
    const worksheet = strFromU8(archive['xl/worksheets/sheet1.xml']);
    expect(worksheet).toContain('User name');
    expect(worksheet).toContain('umer@example.test');
    expect(worksheet).toContain('<autoFilter ref="A1:B2"/>');
  });
});
