import pandas as pd
import joblib

from sklearn.model_selection import train_test_split

from sklearn.preprocessing import StandardScaler

from sklearn.pipeline import Pipeline

from sklearn.linear_model import LogisticRegression

from sklearn.tree import DecisionTreeClassifier

from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)


# Load dataset

df = pd.read_csv(
    "ml/car_service_dataset.csv"
)


features = [
    "car_age",
    "km_driven",
    "months_since_service"
]


X = df[features]

y = df["service_required"]


# Train/test split

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


models = {

    "Logistic Regression":
        Pipeline([
            ("scaler", StandardScaler()),
            (
                "model",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=1000
                )
            )
        ]),

    "Decision Tree":
        DecisionTreeClassifier(
            max_depth=5,
            class_weight="balanced",
            random_state=42
        ),

    "Random Forest":
        RandomForestClassifier(
            n_estimators=150,
            max_depth=8,
            class_weight="balanced",
            random_state=42
        )
}


best_model = None
best_score = 0
best_name = ""
evaluated_models = {}


for name, model in models.items():

    model.fit(
        X_train,
        y_train
    )
    evaluated_models[name] = model

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    auc = roc_auc_score(
        y_test,
        model.predict_proba(X_test)[:, 1]
    )

    print("\n-------------------------")

    print(name)

    print(
        "Accuracy:",
        round(accuracy, 4)
    )

    print(
        "Precision:",
        round(precision, 4)
    )

    print(
        "Recall:",
        round(recall, 4)
    )

    print(
        "F1 Score:",
        round(f1, 4)
    )

    print(
        "ROC AUC:",
        round(auc, 4)
    )

    if f1 > best_score:

        best_score = f1
        best_model = model
        best_name = name

# The tree models achieve a perfect test F1 by exploiting the synthetic
# dataset's hard cutoff, but their leaf probabilities are commonly 0 or 1.
# Logistic regression gives the API a useful, continuous risk estimate.
best_model = evaluated_models["Logistic Regression"]
best_name = "Logistic Regression"
best_score = f1_score(y_test, best_model.predict(X_test), zero_division=0)


print("\n==========================")

print(
    "BEST MODEL:",
    best_name
)

print(
    "BEST F1:",
    round(best_score, 4)
)


joblib.dump(
    best_model,
    "ml/model.pkl"
)


print(
    "\nModel saved successfully!"
)