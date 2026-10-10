import { afterEach, describe, expect, it, rs } from '@rstest/core';

const mocks = rs.hoisted(() => ({
  workers: [] as { destroy: ReturnType<typeof rs.fn>; port: unknown }[],
  tasks: [] as {
    destroy: ReturnType<typeof rs.fn>;
    promise: Promise<unknown>;
  }[],
  getDocument: rs.fn(),
}));

rs.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  PDFWorker: class {
    static create(options: { port: unknown }) {
      return new this(options);
    }
    destroy = rs.fn();
    port: unknown;
    constructor({ port }: { port: unknown }) {
      this.port = port;
      mocks.workers.push(this);
    }
  },
  getDocument: mocks.getDocument,
}));

import { loadPdfDocument } from '../src/tools/pdf-shared/pdfjsClient';

afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
  mocks.workers.length = 0;
  mocks.tasks.length = 0;
  mocks.getDocument.mockReset();
});

describe('isolated PDF preview loading', () => {
  it('copies input bytes and assigns an independently owned worker per document', async () => {
    const ports: { terminate: ReturnType<typeof rs.fn> }[] = [];
    rs.stubGlobal(
      'Worker',
      class {
        terminate = rs.fn();
        constructor() {
          ports.push(this);
        }
      },
    );
    mocks.getDocument.mockImplementation(() => {
      const task = {
        destroy: rs.fn().mockResolvedValue(undefined),
        promise: Promise.resolve({}),
      };
      mocks.tasks.push(task);
      return task;
    });
    const original = new Uint8Array([1, 2, 3]);
    const first = loadPdfDocument(original);
    const second = loadPdfDocument(original);
    const options = mocks.getDocument.mock.calls[0][0];
    expect(options.data).toEqual(original);
    expect(options.data.buffer).not.toBe(original.buffer);
    expect(options.worker).toBe(mocks.workers[0]);
    expect(mocks.getDocument.mock.calls[1][0].worker).toBe(mocks.workers[1]);
    await Promise.all([first.destroy(), first.destroy()]);
    expect(mocks.tasks[0].destroy).toHaveBeenCalledTimes(1);
    expect(ports[0].terminate).toHaveBeenCalledTimes(1);
    expect(ports[1].terminate).not.toHaveBeenCalled();
    await second.destroy();
  });

  it('terminates the underlying worker even if PDF.js teardown fails', async () => {
    const terminate = rs.fn();
    rs.stubGlobal(
      'Worker',
      class {
        terminate = terminate;
      },
    );
    mocks.getDocument.mockReturnValue({
      destroy: rs.fn().mockRejectedValue(new Error('teardown')),
      promise: Promise.resolve({}),
    });
    const task = loadPdfDocument(new Uint8Array([1]));
    await expect(task.destroy()).rejects.toThrow('teardown');
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(mocks.workers[0].destroy).toHaveBeenCalledTimes(1);
  });
});
