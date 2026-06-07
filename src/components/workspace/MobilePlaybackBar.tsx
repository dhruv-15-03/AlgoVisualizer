/**
 * MobilePlaybackBar — sticky bottom bar shown on tablets/phones (< xl).
 *
 * On desktop the playback controls live in the TopNav. On smaller screens
 * we surface them in a sticky bottom toolbar so they're always reachable
 * regardless of which workspace tab the user is on.
 */

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore } from '@/stores/session-store';
import { runNow } from '@/controllers/training-controller';

const SPEED_PRESETS = [0.5, 1, 2, 4];

export function MobilePlaybackBar() {
  const playing = useSessionStore((s) => s.playing);
  const togglePlay = useSessionStore((s) => s.togglePlay);
  const stepForward = useSessionStore((s) => s.stepForward);
  const stepBack = useSessionStore((s) => s.stepBack);
  const resetPlayback = useSessionStore((s) => s.resetPlayback);
  const speed = useSessionStore((s) => s.speed);
  const setSpeed = useSessionStore((s) => s.setSpeed);
  const events = useSessionStore((s) => s.events);
  const currentStep = useSessionStore((s) => s.currentStep);
  const runStatus = useSessionStore((s) => s.runStatus);

  return (
    <div className="safe-bottom flex shrink-0 items-center gap-1 border-t border-ink-700 bg-ink-800/95 px-2 pt-2 backdrop-blur sm:gap-2 sm:px-3">
      <Button
        size="icon"
        variant="ghost"
        title="Step back"
        aria-label="Step back"
        className="touch-target"
        onClick={stepBack}
        disabled={currentStep <= 0}
      >
        <Icon name="skip_previous" size={22} />
      </Button>
      <Button
        size="icon"
        variant="primary"
        title={playing ? 'Pause' : 'Play'}
        aria-label={playing ? 'Pause' : 'Play'}
        className="touch-target"
        onClick={togglePlay}
        disabled={events.length === 0}
      >
        <Icon name={playing ? 'pause' : 'play_arrow'} size={22} fill />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Step forward"
        aria-label="Step forward"
        className="touch-target"
        onClick={stepForward}
        disabled={currentStep >= events.length - 1}
      >
        <Icon name="skip_next" size={22} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Reset playback"
        aria-label="Reset playback"
        className="touch-target"
        onClick={resetPlayback}
        disabled={events.length === 0}
      >
        <Icon name="replay" size={20} />
      </Button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-400 sm:inline">
          Speed
        </span>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
          className="h-9 rounded-md border border-ink-600 bg-ink-800 px-1.5 text-xs text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
        >
          {SPEED_PRESETS.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => runNow()}
          disabled={runStatus === 'running'}
          className="touch-target whitespace-nowrap px-3"
          aria-label="Re-run"
        >
          {runStatus === 'running' ? (
            <Icon name="hourglass_top" size={16} />
          ) : (
            <>
              <Icon name="restart_alt" size={16} />
              <span>Run</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
