'use client';

import React from 'react';
import { NeuronLab } from '../../learning/ch1/NeuronLab.tsx';
import { useLessonStore, lessonStore } from '../../learning/ch1/useLessonStore.ts';

export default function Ch1LabStandalonePage() {
  const store = useLessonStore();

  const handleHint = () => {
    store.hintsUsed === 0
      ? lessonStore.setActiveHint('Radiation is dangerous. Should its weight push toward OPEN or toward SHUT?')
      : store.hintsUsed === 1
      ? lessonStore.setActiveHint('Air quality matters most. Try giving it the biggest weight.')
      : lessonStore.setActiveHint('Reveal a working setting: w=(1.5, 1.0, -1.5), b=-1.2. Other settings can work too.');
    lessonStore.incrementHints();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#05080e', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '12px 24px', background: '#0b101a', borderBottom: '1px solid #1a2736', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#44e6ff', fontWeight: 'bold' }}>NEURO-SCRAP // LAB PREVIEW</span>
          <span style={{ marginLeft: '12px', fontSize: '13px', color: '#8b9bb0' }}>Route: /ch1-lab (Standalone Test)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="ch1-btn-ghost"
            onClick={() => lessonStore.resetLesson()}
          >
            Reset
          </button>
          <button
            type="button"
            className="ch1-btn-ghost"
            onClick={() => lessonStore.setPhase('phaseD')}
          >
            Unlock All (Phase D)
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <NeuronLab
          weights={store.weights}
          onWeightChange={(key, val) => lessonStore.setWeight(key, val)}
          onSetAllWeights={(w) => lessonStore.setAllWeights(w)}
          selectedCaseId={store.selectedCaseId}
          onSelectCase={(id) => lessonStore.setSelectedCaseId(id)}
          phase={store.phase}
          reduceMotion={store.reduceMotion}
          activeHint={store.activeHint}
          onHintRequested={handleHint}
        />
      </main>
    </div>
  );
}
