import { telemetryStore } from "../components/telemetry/telemetryStore";
import { pendriveStore } from "../ui/terminal/pendriveStore";
import { relayStore } from "../section2/relayStore";
import { section3Store } from "../section3/section3Store";
import { section4Store } from "../section4/section4Store";
import { taskStore } from "../ui/tasks/taskStore";
import { endingState } from "../ending/endingState";
import { endingEvents } from "../ending/endingEvents";
import { lessonStore } from "../learning/ch1/useLessonStore";

export const GAMEPLAY_STORAGE_KEYS = [
  "neuro_scrap_tasks_v1",
  "neuro_scrap_section2_relay",
  "neuroscrap_pendrive_store_v1",
  "neuroscrap_telemetry_pendrive_v1",
  "neuro_scrap_section3_v3",
  "neuro_scrap_section3_intro_seen",
  "neuro_scrap_section4_v1",
  "neuro_scrap_section4_intro_seen",
  "ch1_lesson_state_v1",
  "neuroscrap_save",
  "scene1Seen",
  "scene2Seen",
  "scene1_always_skip",
  "neuroscrap_scene1_complete",
  "neuroscrap_scene2_complete",
];

/**
 * Completely resets all gameplay and storyline progress back to default.
 * Preserves hardware & accessibility settings (volume, sensitivity, captions, text size).
 */
export function resetAllGameProgress(): void {
  if (typeof window !== "undefined") {
    try {
      GAMEPLAY_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch {
      // Storage access may be blocked or restricted in sandbox
    }
  }

  // Reset all singleton in-memory state stores to their initial pristine defaults
  try { telemetryStore.formatPendrive(); } catch {}
  try { pendriveStore.reset(); } catch {}
  try { relayStore.reset(); } catch {}
  try { section3Store.reset(); } catch {}
  try { section4Store.reset(); } catch {}
  try { taskStore.reset(); } catch {}
  try { endingState.reset(); } catch {}
  try { endingEvents.reset(); } catch {}
  try { lessonStore.resetLesson(); } catch {}
}
