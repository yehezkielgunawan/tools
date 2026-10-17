import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { act, renderHook } from '@testing-library/react';
import { useConversionJob } from '../src/tools/document-images-shared/useConversionJob';

describe('conversion job lifecycle', () => {
  afterEach(() => rs.restoreAllMocks());

  it('releases published URLs when invalidated and on unmount', async () => {
    rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:output');
    const revoke = rs
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useConversionJob());
    await act(async () => {
      await result.current.run(async () => [
        { filename: 'one.png', blob: new Blob(['one']) },
      ]);
    });
    expect(result.current.outputs).toHaveLength(1);
    act(() => result.current.invalidate());
    expect(result.current.outputs).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith('blob:output');
    await act(async () => {
      await result.current.run(async () => [
        { filename: 'two.png', blob: new Blob(['two']) },
      ]);
    });
    unmount();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('ignores late results from a cancelled generation', async () => {
    const create = rs
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:late');
    const { result } = renderHook(() => useConversionJob());
    let finish: (outputs: { filename: string; blob: Blob }[]) => void = () =>
      undefined;
    let pending: Promise<void>;
    act(() => {
      pending = result.current.run(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    });
    expect(result.current.busy).toBe(true);
    act(() => result.current.invalidate());
    await act(async () => {
      finish([{ filename: 'late.png', blob: new Blob(['late']) }]);
      await pending;
    });
    expect(result.current.outputs).toHaveLength(0);
    expect(result.current.busy).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
