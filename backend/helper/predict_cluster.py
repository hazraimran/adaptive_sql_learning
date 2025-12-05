import numpy as np
import pickle

# Load saved model
bundle = pickle.load(open("helper/db/cluster_model_k5.pkl", "rb"))

scaler = bundle["scaler"]
model = bundle["model"]
features = bundle["features"]

def predict_cluster(user_metrics: dict):
    """
    user_metrics = {
        "typing_speed": float,
        "avg_flight_time": float,
        "avg_dwell_time": float,
        "backspace_rate": float,
        "delete_rate": float,
        "retry_count": int
    }
    """
    x = np.array([user_metrics[f] for f in features]).reshape(1, -1)
    x_scaled = scaler.transform(x)
    cluster_id = model.predict(x_scaled)[0]
    return int(cluster_id)
