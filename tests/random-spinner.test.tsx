import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RandomSpinner from '../src/tools/random-spinner/RandomSpinner';
import { SPINNER_STORAGE_KEY } from '../src/tools/random-spinner/spinnerStorage';

function renderTool() {
  return render(
    <MemoryRouter>
      <RandomSpinner />
    </MemoryRouter>,
  );
}

function enter(value = 'Ada\nGrace\nAda') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Entries' }), {
    target: { value },
  });
}

beforeEach(() => {
  localStorage.clear();
  rs.useFakeTimers();
  rs.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
    (array as Uint32Array)[0] = 2;
    return array;
  });
});

afterEach(() => {
  rs.useRealTimers();
  rs.restoreAllMocks();
  localStorage.clear();
});

describe('Random Spinner Wheel', () => {
  it('validates input and locks edits and repeat spins until the winner is revealed', () => {
    renderTool();
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled();
    enter();
    const spin = screen.getByRole('button', { name: 'Spin' });
    fireEvent.click(spin);
    fireEvent.click(spin);
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Entries' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    act(() => rs.advanceTimersByTime(3999));
    expect(
      screen.getByRole('status', { name: 'Spin result' }),
    ).toHaveTextContent('Spinning');
    act(() => rs.advanceTimersByTime(1));
    expect(
      screen.getByRole('status', { name: 'Spin result' }),
    ).toHaveTextContent('Ada');
    expect(screen.getByRole('textbox', { name: 'Entries' })).toBeEnabled();
    expect(
      within(screen.getByRole('list', { name: 'Recent results' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove winning entry' }),
    );
    expect(screen.getByRole('textbox', { name: 'Entries' })).toHaveValue(
      'Ada\nGrace',
    );
    expect(
      screen.queryByRole('button', { name: 'Remove winning entry' }),
    ).not.toBeInTheDocument();
  });

  it('finishes an elapsed background spin exactly once when visibility returns', () => {
    renderTool();
    enter();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    rs.setSystemTime(Date.now() + 5000);
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(document, new Event('visibilitychange'));
    act(() => rs.advanceTimersByTime(5000));
    expect(
      screen.getByRole('status', { name: 'Spin result' }),
    ).toHaveTextContent('Ada');
    expect(
      within(screen.getByRole('list', { name: 'Recent results' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(1);
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('restores only entries after remount and clears every state on reset', () => {
    const view = renderTool();
    enter();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    act(() => rs.advanceTimersByTime(4000));
    view.unmount();
    renderTool();
    expect(screen.getByRole('textbox', { name: 'Entries' })).toHaveValue(
      'Ada\nGrace\nAda',
    );
    expect(
      screen.queryByRole('list', { name: 'Recent results' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('textbox', { name: 'Entries' })).toHaveValue('');
    expect(localStorage.getItem(SPINNER_STORAGE_KEY)).toBeNull();
  });

  it('reveals reduced-motion results immediately, caps history, and clears it independently', () => {
    rs.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    renderTool();
    enter();
    for (let i = 0; i < 21; i++)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(
      screen.getByRole('status', { name: 'Spin result' }),
    ).toHaveTextContent('Ada');
    expect(
      within(screen.getByRole('list', { name: 'Recent results' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(
      screen.queryByRole('list', { name: 'Recent results' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Entries' })).toHaveValue(
      'Ada\nGrace\nAda',
    );
    enter('Only one');
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Entries' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('retains entries and lets the user retry when browser randomness fails', () => {
    rs.mocked(crypto.getRandomValues).mockImplementationOnce(() => {
      throw new Error('unavailable');
    });
    renderTool();
    enter();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/could not start/i);
    expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    act(() => rs.advanceTimersByTime(4000));
    expect(
      screen.getByRole('status', { name: 'Spin result' }),
    ).toHaveTextContent('Ada');
  });

  it('cancels completion on unmount', () => {
    const view = renderTool();
    enter();
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    view.unmount();
    expect(rs.getTimerCount()).toBe(0);
    act(() => rs.advanceTimersByTime(5000));
  });
});
