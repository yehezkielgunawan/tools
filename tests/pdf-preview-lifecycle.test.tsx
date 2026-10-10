import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { act, renderHook, waitFor } from '@testing-library/react';

const load = rs.hoisted(() => rs.fn());
rs.mock('../src/tools/pdf-shared/pdfjsClient', () => ({
  loadPdfDocument: load,
}));

import { usePdfPreview } from '../src/tools/pdf-shared/usePdfPreview';

afterEach(() => load.mockReset());

describe('PDF preview lifecycle', () => {
  it('destroys obsolete documents and ignores late loading results', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    const first = {
      promise: new Promise((resolve) => {
        resolveFirst = resolve;
      }),
      destroy: rs.fn().mockResolvedValue(undefined),
    };
    const secondDocument = {
      numPages: 3,
      getPage: rs.fn().mockResolvedValue({ pageNumber: 1 }),
    };
    const second = {
      promise: Promise.resolve(secondDocument),
      destroy: rs.fn().mockResolvedValue(undefined),
    };
    load.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const data = new Uint8Array([1]);
    const hook = renderHook(
      ({ id }) =>
        usePdfPreview({ id, filename: `${id}.pdf`, kind: 'source', data }),
      { initialProps: { id: 'first' } },
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    hook.rerender({ id: 'second' });
    await waitFor(() =>
      expect(hook.result.current.document).toBe(secondDocument),
    );
    await act(async () => {
      resolveFirst({ numPages: 99 });
    });
    expect(hook.result.current.document).toBe(secondDocument);
    expect(first.destroy).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(second.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the latest requested page when an earlier getPage finishes late', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    const getPage = rs.fn().mockImplementation((number) =>
      number === 2
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ pageNumber: number }),
    );
    load.mockReturnValue({
      promise: Promise.resolve({ numPages: 3, getPage }),
      destroy: rs.fn().mockResolvedValue(undefined),
    });
    const data = new Uint8Array([1]);
    const hook = renderHook(() =>
      usePdfPreview({ id: 'pdf', filename: 'pdf', kind: 'source', data }),
    );
    await waitFor(() => expect(hook.result.current.page?.pageNumber).toBe(1));
    act(() => hook.result.current.setPageNumber(2));
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2));
    act(() => hook.result.current.setPageNumber(3));
    await waitFor(() => expect(hook.result.current.page?.pageNumber).toBe(3));
    await act(async () => {
      resolveOld({ pageNumber: 2 });
    });
    expect(hook.result.current.page?.pageNumber).toBe(3);
  });

  it('retries failed loading and does not open a worker after a closed Blob read', async () => {
    const data = new Blob(['pdf']);
    load
      .mockReturnValueOnce({
        promise: Promise.reject(new Error('broken')),
        destroy: rs.fn().mockResolvedValue(undefined),
      })
      .mockReturnValueOnce({
        promise: Promise.resolve({
          numPages: 1,
          getPage: rs.fn().mockResolvedValue({ pageNumber: 1 }),
        }),
        destroy: rs.fn().mockResolvedValue(undefined),
      });
    const hook = renderHook(() =>
      usePdfPreview({ id: 'pdf', filename: 'pdf', kind: 'output', data }),
    );
    await waitFor(() => expect(hook.result.current.error).toMatch(/preview/i));
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.page?.pageNumber).toBe(1));
    hook.unmount();
    let resolveRead: (value: ArrayBuffer) => void = () => undefined;
    rs.spyOn(data, 'arrayBuffer').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    const closed = renderHook(() =>
      usePdfPreview({ id: 'closed', filename: 'pdf', kind: 'output', data }),
    );
    closed.unmount();
    await act(async () => {
      resolveRead(new ArrayBuffer(1));
    });
    expect(load).toHaveBeenCalledTimes(2);
    rs.restoreAllMocks();
  });
});
