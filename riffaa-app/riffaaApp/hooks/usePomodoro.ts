import { usePomodoroStore } from '../store/pomodoroStore';

export function usePomodoro() {
  const activeSession = usePomodoroStore((state) => state.activeSession);
  const phase = usePomodoroStore((state) => state.phase);
  const endsAt = usePomodoroStore((state) => state.endsAt);
  const cycleCount = usePomodoroStore((state) => state.cycleCount);
  const source = usePomodoroStore((state) => state.source);
  const settings = usePomodoroStore((state) => state.settings);
  const start = usePomodoroStore((state) => state.start);
  const pause = usePomodoroStore((state) => state.pause);
  const resume = usePomodoroStore((state) => state.resume);
  const skip = usePomodoroStore((state) => state.skip);
  const stop = usePomodoroStore((state) => state.stop);
  const completePhase = usePomodoroStore((state) => state.completePhase);
  const updateSettings = usePomodoroStore((state) => state.updateSettings);

  return {
    activeSession,
    phase,
    endsAt,
    cycleCount,
    source,
    settings,
    start,
    pause,
    resume,
    skip,
    stop,
    completePhase,
    updateSettings,
  };
}
