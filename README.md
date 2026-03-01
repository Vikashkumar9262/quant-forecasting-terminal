# 📈 Quantitative Forecasting Terminal



A full-stack financial analysis dashboard built to automate equity research, options analysis, and time-series forecasting. This tool ingests raw market data (NSE/BSE CSVs), cleans it dynamically, and evaluates future price movements using a tri-model comparative engine spanning traditional econometrics and deep learning.

## 🚀 Key Features

* **Tri-Model Comparative Engine:** * **LSTM Network:** Deep learning architecture capturing complex, non-linear market patterns using `TensorFlow/Keras`.
  * **Autoregression (AR):** Custom-built statistical model extracting linear dependencies from lagged time-series data.
  * **Linear Regression:** Baseline econometric model computed via the Normal Equation from scratch.
* **Automated Data Engineering:** Dynamically cleans messy broker data, handles reversed chronological sorts, strips formatting (commas in prices), and auto-detects target columns (`CLOSE`, `LTP`, `Premium`).
* **Volatility & Outlier Detection:** Implements Interquartile Range (IQR) analysis to flag extreme market volatility and sudden price action anomalies.
* **Trend Extraction:** Utilizes `statsmodels` seasonal decomposition to separate underlying market momentum from daily noise.
* **Multivariate Correlation Heatmap:** Computes real-time Pearson correlation matrices across financial features (Open, High, Low, Close, Volume) to aid in feature selection and strategy building.
* **Exportable Reporting:** One-click functionality to render and download high-resolution analysis PNGs for equity research reports.

## 🛠️ Technology Stack

**Frontend:**
* React.js (Vite)
* Recharts (Data Visualization)
* Axios (API Integration)
* CSS Grid & Flexbox (Responsive Financial UI)

**Backend:**
* Python & FastAPI
* Uvicorn (ASGI Server)

**Machine Learning & Quant Math:**
* TensorFlow / Keras (Deep Learning)
* Scikit-Learn (Scaling & Metrics)
* Statsmodels (Econometrics & Decomposition)
* Pandas & NumPy (Data manipulation & Custom Math)

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/Vikashkumar9262/quant-forecasting-terminal.git](https://github.com/Vikashkumar9262/quant-forecasting-terminal.git)
cd quant-forecasting-terminal
