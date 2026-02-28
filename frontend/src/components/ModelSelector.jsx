import React from 'react';

const MODELS = [
  { id: 'lstm', name: 'LSTM', desc: 'Deep Learning (Non-linear)' },
  { id: 'autoregression', name: 'Autoregression', desc: 'Statistical (Linear)' }
];

const ModelSelector = ({ selectedModel, onSelect }) => {
  return (
    <div className="model-grid">
      {MODELS.map((model) => (
        <div 
          key={model.id} 
          className={`model-card ${selectedModel === model.id ? 'active' : ''}`}
          onClick={() => onSelect(model.id)}
        >
          <h3>{model.name}</h3>
          <p>{model.desc}</p>
        </div>
      ))}
    </div>
  );
};

export default ModelSelector;