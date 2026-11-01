import assert from "node:assert";
import { taskStore } from "./taskStore.ts";
import type { TaskItem } from "./taskStore.ts";

console.log("=== Running taskStore Unit Tests ===");

// 1. Reset state
taskStore.reset();
let snap = taskStore.getSnapshot();
assert.strictEqual(snap.tasks.length, 0, "Initial task list must be empty");
assert.strictEqual(snap.activeTaskId, null, "No initial active task");
assert.strictEqual(snap.panelOpen, false, "Panel starts closed");
console.log("✔ Test 1: Reset and initial state clean.");

// 2. Register Tasks (including dependency chain)
const task1: TaskItem = {
  id: "salvage_power",
  title: "Plug in 3 power cells",
  location: "SALVAGE RACK",
  state: "available",
  progress: 0,
  total: 3,
};

const task2: TaskItem = {
  id: "console_boot",
  title: "Power up Decision Core",
  location: "DECISION CONSOLE",
  state: "locked",
  progress: 0,
  total: 1,
  unlockedBy: "salvage_power",
};

taskStore.registerTask(task1);
taskStore.registerTask(task2);

snap = taskStore.getSnapshot();
assert.strictEqual(snap.tasks.length, 2, "2 tasks registered");
assert.strictEqual(snap.tasks[0].state, "available", "Task 1 is available");
assert.strictEqual(snap.tasks[1].state, "locked", "Task 2 is locked");
console.log("✔ Test 2: Task registration and initial lock states verified.");

// 3. Locked task cannot be opened
const openLocked = taskStore.openTask("console_boot");
assert.strictEqual(openLocked, false, "openTask on locked task must return false");
assert.strictEqual(taskStore.getSnapshot().panelOpen, false, "Panel remains closed");
console.log("✔ Test 3: Locked task cannot be opened.");

// 4. Available task opens and closes
const openAvail = taskStore.openTask("salvage_power");
assert.strictEqual(openAvail, true, "openTask on available task returns true");
assert.strictEqual(taskStore.getSnapshot().panelOpen, true, "Panel is open");
assert.strictEqual(taskStore.getSnapshot().activeTaskId, "salvage_power", "Active task matches");

taskStore.closeTask();
assert.strictEqual(taskStore.getSnapshot().panelOpen, false, "Panel is closed after closeTask");
assert.strictEqual(taskStore.getSnapshot().activeTaskId, null, "Active task is cleared");
console.log("✔ Test 4: Open and close available task verified.");

// 5. Complete steps incrementally and check unlock chain
taskStore.completeStep("salvage_power"); // 1/3
assert.strictEqual(taskStore.getSnapshot().tasks[0].progress, 1, "Progress is 1");
assert.strictEqual(taskStore.getSnapshot().tasks[0].state, "available", "State remains available");
assert.strictEqual(taskStore.getSnapshot().tasks[1].state, "locked", "Task 2 remains locked");

taskStore.completeStep("salvage_power"); // 2/3
assert.strictEqual(taskStore.getSnapshot().tasks[0].progress, 2, "Progress is 2");

taskStore.completeStep("salvage_power"); // 3/3 -> DONE!
snap = taskStore.getSnapshot();
assert.strictEqual(snap.tasks[0].progress, 3, "Progress is 3/3");
assert.strictEqual(snap.tasks[0].state, "done", "Task 1 state transitioned to 'done'");
assert.strictEqual(snap.tasks[1].state, "available", "Task 2 unlocked automatically by dependency chain!");
console.log("✔ Test 5: Incremental step completion and dependency unlock chain verified.");

// 6. Direct completeTask
taskStore.completeTask("console_boot");
assert.strictEqual(taskStore.getSnapshot().tasks[1].state, "done", "Task 2 marked as done");
assert.strictEqual(taskStore.getSnapshot().tasks[1].progress, 1, "Task 2 progress set to total");
console.log("✔ Test 6: Direct completeTask verified.");

// 7. Re-registration does not overwrite progress
taskStore.registerTask({
  id: "salvage_power",
  title: "Updated Title",
  location: "SALVAGE RACK",
  state: "available",
  progress: 0,
  total: 3,
});
snap = taskStore.getSnapshot();
assert.strictEqual(snap.tasks[0].title, "Updated Title", "Title updated");
assert.strictEqual(snap.tasks[0].state, "done", "State preserved as 'done'");
assert.strictEqual(snap.tasks[0].progress, 3, "Progress preserved as 3");
console.log("✔ Test 7: Re-registration preserves state and progress.");

console.log("==================================================");
console.log("🎉 ALL taskStore UNIT TESTS PASSED (7/7)!");
console.log("==================================================");
