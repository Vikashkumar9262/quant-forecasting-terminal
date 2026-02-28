import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toPng } from 'html-to-image';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import FileUploader from './components/FileUploader';
import ModelSelector from './components/ModelSelector';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('lstm');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  const handlePredict = async () => {
    if (!file) return;
    
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_type', selectedModel);

    try {
      const response = await axios.post('http://localhost:8000/predict', formData);
      
      const chartData = response.data.actual.map((val, i) => ({
        index: i,
        Actual: val,
        Predicted: response.data.predicted[i],
        Trend: response.data.trend ? response.data.trend[i] : null // NEW: Trend line mapped here
      }));

      setResults({ ...response.data, chartData });
    } catch (error) {
      console.error("Connection Error:", error);
      alert("Error: Ensure your Python FastAPI backend is running on port 8000!");
    } finally {
      setLoading(false);
    }
  };

  const downloadChart = () => {
    if (chartRef.current === null) return;
    
    toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `forecast-${selectedModel}-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Download failed', err);
      });
  };

  const formatModelName = (modelStr) => {
    if (modelStr === 'lstm') return 'LSTM NETWORK';
    if (modelStr === 'autoregression') return 'AUTOREGRESSION';
    if (modelStr === 'linear') return 'LINEAR REGRESSION';
    return modelStr.toUpperCase();
  };

  return (
    <div className="container">
      <h1>Forecasting Dashboard</h1>
      
      <FileUploader onFileSelect={(f) => setFile(f)} />
      
      {file && (
        <p className="file-status">
          ✅ File <b>{file.name}</b> Ready
        </p>
      )}

      <ModelSelector 
        selectedModel={selectedModel} 
        onSelect={setSelectedModel} 
      />

      <button 
        className="predict-btn" 
        disabled={!file || loading} 
        onClick={handlePredict}
      >
        {loading ? "Processing..." : `Run ${formatModelName(selectedModel)}`}
      </button>

      {results && (
        <div className="results-container" ref={chartRef}>
          <div className="results-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2>Analysis Results</h2>
            <button onClick={downloadChart} className="download-btn">📸 Save Image</button>
          </div>
          
          <div className="meta-info">
            <p className="detected-col">
              Target Analyzed: <b>{results.detected_column}</b>
            </p>
            <span className="model-tag">{formatModelName(results.model_used)} MODE</span>
          </div>

          <div className="rmse-section">
            <div className="rmse-badge">
              <small>RMSE SCORE</small>
              <div>{results.rmse}</div>
            </div>
            
            {/* Dynamic Outlier Badge */}
            {results.outliers && (
              <div className={`outlier-badge ${results.outliers.count > 0 ? 'has-outliers' : 'safe'}`}>
                <small>MARKET VOLATILITY</small>
                <div className="outlier-count">
                  {results.outliers.count} Outliers
                </div>
                <span className="outlier-bounds">
                  Normal Range: ₹{results.outliers.lower_bound} - ₹{results.outliers.upper_bound}
                </span>
              </div>
            )}
            
            <div className="accuracy-insight">
              <p>
                {results.rmse < 10 
                  ? "✅ High Accuracy: Model is tracking trends closely." 
                  : "⚠️ Volatility Detected: Expect wider prediction variance."}
              </p>
            </div>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <LineChart data={results.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="index" hide />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Actual" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={false} 
                />
                {/* NEW: Smooth Trend Line */}
                <Line 
                  type="monotone" 
                  dataKey="Trend" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Predicted" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-table-container">
            <h3>Recent 5-Day Comparison</h3>
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Index</th>
                  <th>Actual (₹)</th>
                  <th>Predicted (₹)</th>
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {results.chartData.slice(-5).map((row, i) => {
                  const diff = row.Predicted ? (row.Predicted - row.Actual).toFixed(2) : "N/A";
                  const isOver = diff > 0;
                  return (
                    <tr key={i}>
                      <td>{row.index}</td>
                      <td>{row.Actual.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td>{row.Predicted ? row.Predicted.toLocaleString(undefined, {minimumFractionDigits: 2}) : '---'}</td>
                      <td style={{ color: isOver ? '#ef4444' : '#10b981' }}>
                        {diff !== "N/A" ? (isOver ? `+${diff}` : diff) : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Correlation Heatmap */}
          {results.correlation && (
            <div className="heatmap-container">
              <h3>Market Features Correlation Heatmap</h3>
              <p className="heatmap-desc">Shows how strongly different market features move together (1.0 = Perfect positive correlation, -1.0 = Perfect negative correlation).</p>
              
              <div 
                className="heatmap-grid" 
                style={{ gridTemplateColumns: `auto repeat(${results.correlation.columns.length}, 1fr)` }}
              >
                {/* Top Header Row */}
                <div className="heatmap-cell header-empty"></div>
                {results.correlation.columns.map((col) => (
                  <div key={col} className="heatmap-cell header-col">{col}</div>
                ))}

                {/* Data Rows */}
                {results.correlation.columns.map((rowCol, i) => (
                  <React.Fragment key={rowCol}>
                    <div className="heatmap-cell header-row">{rowCol}</div>
                    {results.correlation.values[i].map((val, j) => {
                      // Color logic: Dynamic green for positive, red for negative
                      const alpha = Math.abs(val);
                      const isPositive = val >= 0;
                      // Darker background for stronger correlation
                      const bgColor = isPositive 
                        ? `rgba(16, 185, 129, ${alpha})` 
                        : `rgba(239, 68, 68, ${alpha})`;
                      
                      // White text for dark backgrounds so it's readable
                      const textColor = alpha > 0.5 ? 'white' : '#1e293b';

                      return (
                        <div 
                          key={`${i}-${j}`} 
                          className="heatmap-cell value-cell" 
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          {val.toFixed(2)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}

export default App;