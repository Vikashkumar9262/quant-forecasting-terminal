import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import io
import warnings
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

warnings.filterwarnings('ignore')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# 1. AUTOREGRESSION
# ============================================================================
class CustomARModel:
    def __init__(self, order=5):
        self.order = order
        self.coefficients = None
        self.intercept = None

    def fit(self, data):
        X, y = [], []
        for i in range(self.order, len(data)):
            X.append(data[i-self.order:i])
            y.append(data[i])
        X, y = np.array(X), np.array(y)
        X_with_intercept = np.column_stack([np.ones(len(X)), X])
        coeffs = np.linalg.lstsq(X_with_intercept, y, rcond=None)[0]
        self.intercept = coeffs[0]
        self.coefficients = coeffs[1:]

    def predict_steps(self, data, steps=1):
        predictions = []
        history = list(data[-self.order:])
        for _ in range(steps):
            X = np.array(history[-self.order:]).reshape(1, -1)
            y_pred = self.intercept + np.dot(X, self.coefficients)[0]
            predictions.append(y_pred)
            history.append(y_pred)
        return np.array(predictions)

# ============================================================================
# 2.  LINEAR REGRESSION 
# ============================================================================
class LinearRegressionScratch:
    """Linear Regression using Normal Equation: θ = (X'X)⁻¹X'y"""
    def __init__(self):
        self.weights = None
        self.bias = None

    def fit(self, X, y):
        # Add bias term (column of 1s)
        X_with_bias = np.column_stack([np.ones(len(X)), X])
        # Solve using least squares
        params = np.linalg.lstsq(X_with_bias, y, rcond=None)[0]
        self.bias = params[0]
        self.weights = params[1:]

    def predict(self, X):
        return np.dot(X, self.weights) + self.bias

# ============================================================================
# 3.  DATA CLEANER
# ============================================================================
def clean_financial_data(df):
    if 'DATE' in df.columns:
        df = df.iloc[::-1].reset_index(drop=True)
    
    target_col = None
    for col in ['CLOSE', 'LTP', 'Last Price', 'Premium']:
        if col in df.columns:
            target_col = col
            break
    if not target_col:
        target_col = df.select_dtypes(include=[np.number]).columns[-1]

    df[target_col] = df[target_col].astype(str).str.replace(',', '').astype(float)
    return df[target_col].values, target_col

# ============================================================================
# 4. PREDICTION ENDPOINT
# ============================================================================
@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Quant-Forecasting-Terminal-V2",
        "version": "1.0.0",
        "endpoints": ["/predict"]
    }
@app.post("/predict")
async def predict(file: UploadFile = File(...), model_type: str = Form(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    # ------------------------------------------
     CORRELATION HEATMAP LOGIC
    # ------------------------------------------
    potential_cols = ['OPEN', 'HIGH', 'LOW', 'CLOSE', 'LTP', 'VWAP', 'VOLUME', 'Premium']
    corr_cols = [c for c in potential_cols if c in df.columns]
    
    # Clean commas so we can do math
    for c in corr_cols:
        df[c] = df[c].astype(str).str.replace(',', '').astype(float)
        
    correlation_data = None
    if len(corr_cols) > 1:
        # Calculate Pearson Correlation
        corr_matrix = df[corr_cols].corr().round(2).fillna(0)
        correlation_data = {
            "columns": corr_cols,
            "values": corr_matrix.values.tolist()
        }

    # Clean main target data for the models
    raw_data, detected_col = clean_financial_data(df)
    train_size = int(len(raw_data) * 0.8)
    train_data, test_data = raw_data[:train_size], raw_data[train_size:]

    # ------------------------------------------
    # OUTLIER DETECTION (IQR METHOD)
    # ------------------------------------------
    q1 = np.percentile(raw_data, 25)
    q3 = np.percentile(raw_data, 75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers = np.where((raw_data < lower_bound) | (raw_data > upper_bound))[0]
    
    outlier_data = {
        "count": int(len(outliers)),
        "lower_bound": round(float(lower_bound), 2),
        "upper_bound": round(float(upper_bound), 2)
    }

    predictions = []

    # ------------------------------------------
    # MODEL SELECTION & INFERENCE
    # ------------------------------------------
    if model_type == "autoregression":
        model = CustomARModel(order=5)
        model.fit(train_data)
        predictions = model.predict_steps(train_data, steps=len(test_data))

    elif model_type == "linear":
        # Create sequences for Linear Regression
        SEQ_LEN = 5
        X_lin, y_lin = [], []
        for i in range(SEQ_LEN, len(train_data)):
            X_lin.append(train_data[i-SEQ_LEN:i])
            y_lin.append(train_data[i])
        X_lin, y_lin = np.array(X_lin), np.array(y_lin)

        # Train custom model
        lr_model = LinearRegressionScratch()
        lr_model.fit(X_lin, y_lin)

        # Iterative prediction for the test period
        history = list(train_data[-SEQ_LEN:])
        for _ in range(len(test_data)):
            X_pred = np.array(history[-SEQ_LEN:]).reshape(1, -1)
            y_pred = lr_model.predict(X_pred)[0]
            predictions.append(y_pred)
            history.append(y_pred)
        predictions = np.array(predictions)

    elif model_type == "lstm":
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(raw_data.reshape(-1, 1))
        
        SEQ_LEN = 10
        X, y = [], []
        for i in range(SEQ_LEN, len(scaled_data)):
            X.append(scaled_data[i-SEQ_LEN:i])
            y.append(scaled_data[i])
        X, y = np.array(X), np.array(y)
        
        split = int(len(X) * 0.8)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        lstm = Sequential([
            LSTM(64, return_sequences=True, input_shape=(X_train.shape[1], 1)),
            Dropout(0.2),
            LSTM(32),
            Dense(1)
        ])
        lstm.compile(optimizer='adam', loss='mse')
        lstm.fit(X_train, y_train, epochs=10, batch_size=16, verbose=0)
        
        scaled_preds = lstm.predict(X_test)
        predictions = scaler.inverse_transform(scaled_preds).flatten()
        
        test_data = raw_data[len(raw_data) - len(predictions):]
        train_size = len(raw_data) - len(predictions)

    # Calculate RMSE
    rmse = np.sqrt(mean_squared_error(test_data, predictions))

    # Send everything to React
    return {
        "actual": raw_data.tolist(),
        "predicted": [None] * train_size + predictions.tolist(),
        "rmse": round(float(rmse), 4),
        "detected_column": detected_col,
        "model_used": model_type,
        "outliers": outlier_data,
        "correlation": correlation_data  # Included for your heatmap!
    }
